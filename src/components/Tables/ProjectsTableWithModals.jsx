import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiEye, FiTrash } from 'react-icons/fi';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';
import { MdClose } from 'react-icons/md';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, NavLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';

const ProjectsTableWithModals = () => {
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('token');

  // States
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isDarkMode = () => document.documentElement.classList.contains('dark');


  // Pagination from API
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  console.log("pages", pagination);

  // Helper function to detect dark mode


  // Status display mapping
  const getStatusDisplayName = (statusId) => {
    const statusNames = {
      1: 'Draft',
      2: 'Pending with L2',
      3: 'Pending with L2',
      4: 'Pending with L3',
      5: 'Pending with L3',
      6: 'Under Authorization',
      7: 'Pending',
      8: 'Under Final Approval',
      9: 'Pending Approval',
      10: 'Approved',
      11: 'Rejected',
      12: 'Returned for Correction (by L2)',
      13: 'Returned for Correction (by L3)',
      14: 'Correction Submitted — Pending with L2',
      15: 'Correction Submitted — Pending with L2',
      16: 'Forwarded to L3 (after correction)',
      17: 'Returned After Approval',
      20: 'Reapproved',
      21: 'Deleted',
    };
    return statusNames[statusId] || 'Unknown Status';
  };

  // Status badge color
  const getStatusBadgeClass = (statusId) => {
    const colorMap = {
      1: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      4: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      5: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      10: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      11: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      12: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      13: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      14: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      15: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      16: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      17: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      20: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      21: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colorMap[statusId] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Get assigned user display
  const getAssignedUserDisplay = (project) => {
    if (project.assigned_name) {
      const names = project.assigned_name
        .split(',')
        .map((name) => name.trim());
      if (names.length > 1) {
        return `${names[0]} (+${names.length - 1} more)`;
      }
      return names[0];
    }
    return 'Not assigned';
  };

  // Fetch projects with server-side pagination
  const fetchProjects = async (page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/projectss/project-assign-and-created?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: token },
        },
      );

      const { data, meta } = res.data;

      setProjects(data);
      setPagination({
        currentPage: meta.page,
        itemsPerPage: meta.limit,
        totalPages: meta.totalPages,   // was meta.page — wrong
        totalItems: meta.total,        // was meta.totalItems — wrong key
      });
    } catch (err) {
      console.error(err);
      toast.error('Error fetching projects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProjects(1, pagination.itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, zoneFilter]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProjects(newPage, pagination.itemsPerPage);
    }
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };



  // Handle filter changes
  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };



  // Delete handlers
  const openDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const submitDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/api/projectss/${deleteId}`, {
        headers: { Authorization: token },
      });
      toast.success('Project deleted successfully!');
      setIsDeleteOpen(false);
      fetchProjects(pagination.currentPage, pagination.itemsPerPage);
    } catch {
      toast.error('Delete failed');
    }
  };

  // Calculate start index for serial numbers
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;


  return (
    <div className="max-h-[calc(100vh-56px)] overflow-y-scroll rounded-sm  border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <ToastContainer />

      <>
        {/* Breadcrumb */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <li className="breadcrumb-item hover:text-black dark:hover:text-gray-200">
                <NavLink to="/dashboard">Home</NavLink>
              </li>
              <li className="text-gray-500 dark:text-gray-400">&gt;</li>
              <li
                className="breadcrumb-item text-gray-800 dark:text-gray-200 font-medium"
                aria-current="page"
              >
                Data Validation Requests
              </li>
            </ol>
          </nav>
        </div>

        {/* Filters
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by project name..."
            className="border rounded px-3 py-2 text-gray-800 dark:text-gray-200 dark:bg-boxdark dark:border-strokedark flex-1 min-w-[200px]"
            value={searchQuery}
            onChange={handleSearch}
          />

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="border rounded px-3 py-2 text-gray-800 dark:text-gray-200 dark:bg-boxdark dark:border-strokedark"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {getStatusDisplayName(s.id)}
              </option>
            ))}
          </select>
        </div> */}

        {/* Projects Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left">SR No</th>
                <th className="px-6 py-4 text-left">Project Layer Name</th>
                <th className="px-6 py-4 text-left">Department</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Created By</th>
                {/* <th className="px-6 py-4 text-left">Assigned To</th> */}
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-gray-500 dark:text-gray-400"
                    >

                      <div className="flex w-full justify-center items-center max-h-64">
                        <BeatLoader color={isDarkMode() ? '#2563eb' : '#2563eb'} />
                      </div>
                    </td>
                  </tr>

                ) :
                  (<tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No projects found
                    </td>
                  </tr>)
              ) : (
                projects.map((project, index) => (
                  <tr
                    key={project.id}
                    className="border-b border-stroke dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-5 px-6">{startIndex + index + 1}</td>
                    <td className="py-5 px-6">
                      <span
                        className="text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 font-medium"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        {project.project_layer_name || 'Unnamed Project'}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-gray-800 dark:text-gray-200">
                      {project.department_name || 'N/A'}
                    </td>
                    <td className="py-5 px-6">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(project.status_id)}`}
                      >
                        {getStatusDisplayName(project.status_id)}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                            {project.created_by_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {project.created_by_name ||
                              `User ${project.created_by}`}
                          </div>
                          {project.created_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(project.created_at).toLocaleDateString(
                                'en-IN',
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            {getAssignedUserDisplay(project)?.charAt(0) || 'N'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {getAssignedUserDisplay(project)}
                          </div>
                          {project.assigned_role_names && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {project.assigned_role_names.split(',')[0].trim()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td> */}
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          title="View details"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <FiEye size={18} />
                        </button>
                        {project.user_relationship === 'creator' &&
                          project.status_id === 1 && (
                            <button
                              onClick={() => openDelete(project.id)}
                              title="Delete project"
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <FiTrash size={18} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info & Controls */}
        <div className="flex flex-wrap justify-between items-center mt-6 gap-4 pb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {projects.length > 0 ? startIndex + 1 : 0} to{' '}
            {startIndex + projects.length} of {pagination.totalItems} entries
          </div>

          <div className="pagination flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${pagination.currentPage === 1 ? 'invisible' : 'visible'
                }`}
            >
              <TfiAngleLeft size={22} className="mr-1" />
              Previous
            </button>
            <span className="pagination-info text-gray-800 font-bold dark:text-gray-200">
              Page {pagination.currentPage} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${pagination.currentPage === pagination.totalPages
                ? 'invisible'
                : 'visible'
                }`}
            >
              Next
              <TfiAngleRight size={22} className="ml-1" />
            </button>
          </div>
        </div>
      </>

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-8 w-full max-w-md">
            <MdClose
              className="absolute top-4 right-4 cursor-pointer text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-400"
              onClick={() => setIsDeleteOpen(false)}
              size={24}
            />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTableWithModals;
