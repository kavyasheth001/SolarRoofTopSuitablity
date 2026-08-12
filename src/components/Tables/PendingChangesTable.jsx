import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiEye } from 'react-icons/fi';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, NavLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import { useAuth } from '../../context/AuthContext';

const PendingChangesTable = () => {
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('token');
  const { auth: { user } } = useAuth();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Determine the current user's designation level to decide what to show
  const designationLevel = user ? JSON.parse(user).designation_level : null;

  // L2 sees status 14 and 15 (corrections submitted by L1, pending L2's re-approval)
  // L3 sees status 16 only (L2 already re-approved a correction, now pending L3's final decision)
  const getStatusFilter = () => {
    if (designationLevel === 3) return '16';
    return '14,15';
  };

  const getResubmittedLabel = (statusId) => {
    if (statusId === 14) {
      return {
        label: 'Correction Submitted — Pending with L2',
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      };
    }
    if (statusId === 15) {
      return {
        label: 'Correction Submitted — Pending with L2',
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      };
    }
    if (statusId === 16) {
      return {
        label: 'Forwarded to L3 (after correction)',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      };
    }
    return { label: 'Correction Submitted', color: 'bg-gray-100 text-gray-800' };
  };

  const fetchPendingChanges = async (page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const statusFilter = getStatusFilter();
      const res = await axios.get(
        `${BASE_URL}/api/projectss?page=${page}&limit=${limit}&status_id=${statusFilter}`,
        { headers: { Authorization: token } }
      );

      const { data, meta } = res.data;

      // Client-side safety filter: only show the relevant status(es) for this role
      const allowedStatuses = designationLevel === 3 ? [16] : [14, 15];
      const filtered = data.filter((p) => allowedStatuses.includes(p.status_id));

      setProjects(filtered);
      setPagination({
        currentPage: meta.page,
        itemsPerPage: meta.limit,
        totalPages: meta.totalPages,
        totalItems: meta.totalItems,
      });
    } catch (err) {
      console.error(err);
      toast.error('Error fetching corrections submitted.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingChanges(1, pagination.itemsPerPage);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPendingChanges(newPage, pagination.itemsPerPage);
    }
  };

  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;

  return (
    <div className="max-h-[calc(100vh-56px)] overflow-y-scroll rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <ToastContainer />

      {/* Breadcrumb */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <li className="breadcrumb-item hover:text-black dark:hover:text-gray-200">
              <NavLink to="/dashboard">Home</NavLink>
            </li>
            <li className="text-gray-500 dark:text-gray-400">&gt;</li>
            <li className="breadcrumb-item text-gray-800 dark:text-gray-200 font-medium" aria-current="page">
              Corrections Submitted
            </li>
          </ol>
        </nav>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {designationLevel === 3
            ? 'Projects re-approved by L2 after you returned them for corrections, now pending your final decision'
            : 'Projects resubmitted by L1 after you returned them for corrections, pending your re-approval'}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left">SR No</th>
              <th className="px-6 py-4 text-left">Project Layer Name</th>
              <th className="px-6 py-4 text-left">Department</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Last Comment</th>
              <th className="px-6 py-4 text-left">Updated At</th>
              <th className="px-6 py-4 text-left">Created By</th>
              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex w-full justify-center items-center max-h-64">
                      <BeatLoader color="#2563eb" />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No corrections submitted at this time
                  </td>
                </tr>
              )
            ) : (
              projects.map((project, index) => {
                const { label, color } = getResubmittedLabel(project.status_id);
                return (
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
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${color}`}>
                        {label}
                      </span>
                    </td>

                    <td className="py-5 px-6 text-gray-800 dark:text-gray-200 max-w-[200px]">
                      <span className="block truncate" title={project.review_comment || ''}>
                        {project.review_comment || '—'}
                      </span>
                    </td>

                    <td className="py-5 px-6 text-gray-800 dark:text-gray-200">
                      {project.updated_at
                        ? new Date(project.updated_at).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                            {(project.creator_name || project.created_by_name)?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {project.creator_name || project.created_by_name || `User ${project.created_by}`}
                          </div>
                          {project.created_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(project.created_at).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        title="View details"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FiEye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap justify-between items-center mt-6 gap-4 pb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {projects.length > 0 ? startIndex + 1 : 0} to{' '}
          {startIndex + projects.length} of {pagination.totalItems} entries
        </div>
        <div className="pagination flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${pagination.currentPage === 1 ? 'invisible' : 'visible'}`}
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
            className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${pagination.currentPage === pagination.totalPages ? 'invisible' : 'visible'}`}
          >
            Next
            <TfiAngleRight size={22} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingChangesTable;