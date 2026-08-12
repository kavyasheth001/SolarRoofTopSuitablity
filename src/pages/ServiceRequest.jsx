import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { BeatLoader } from 'react-spinners';
import { MdOutlineCreateNewFolder, MdClose } from 'react-icons/md';
import { FiEdit, FiTrash } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavLink } from 'react-router-dom';

// Helper to detect dark mode
const isDarkMode = () => document.documentElement.classList.contains('dark');

// Custom styles for react-select to match input fields
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: isDarkMode() ? '#374151' : 'white',
    borderColor: isDarkMode() ? '#4B5563' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : null,
    '&:hover': {
      borderColor: isDarkMode() ? '#6B7280' : '#9CA3AF',
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: isDarkMode() ? '#374151' : 'white',
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? isDarkMode() ? '#4B5563' : '#F3F4F6'
      : isDarkMode() ? '#374151' : 'white',
    color: isDarkMode() ? 'white' : 'black',
    '&:active': {
      backgroundColor: isDarkMode() ? '#6B7280' : '#E5E7EB',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: isDarkMode() ? 'white' : 'black',
  }),
  input: (provided) => ({
    ...provided,
    color: isDarkMode() ? 'white' : 'black',
  }),
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const ServiceRequests = () => {
  // State variables
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [newRequest, setNewRequest] = useState({
    project_name: '',
    from_department: '',
    to_department: '',
    description: '',
    status: 'pending',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useDemo, setUseDemo] = useState(false);

  // Get API URL and token from env or localStorage
  const apiUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
  const token = localStorage.getItem('token');

  // Fetch service requests when page changes
  useEffect(() => {
    fetchRequests();
  }, [pagination.currentPage]);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/departments`, { 
          headers: { Authorization: token } 
        });
        setDepartments(
          res.data.data.map((dept) => ({ value: dept.id, label: dept.name }))
        );
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
        setUseDemo(true);
        // Set demo departments
        setDepartments([
          { value: '1', label: 'Road Department' },
          { value: '2', label: 'Building Department' },
          { value: '3', label: 'Parks Department' },
          { value: '4', label: 'Finance Department' },
          { value: '5', label: 'Disaster Management' },
        ]);
      }
    };

    fetchDepartments();
  }, []);

  // Demo data for fallback
  const dummyRequests = [
    {
      id: 1,
      project_name: 'Road Widening',
      from_department: '1',
      from_department_name: 'Road Department',
      to_department: '2',
      to_department_name: 'Building Department',
      description: 'Widen Main Street by 2 lanes',
      status: 'pending',
      created_at: '2025-04-01T10:30:00Z',
    },
    {
      id: 2,
      project_name: 'Bridge Inspection',
      from_department: '5',
      from_department_name: 'Disaster Management',
      to_department: '1',
      to_department_name: 'Road Department',
      description: 'Inspect structural integrity of Central Bridge',
      status: 'approved',
      created_at: '2025-04-02T14:15:00Z',
    },
    {
      id: 3,
      project_name: 'New Park Layout',
      from_department: '3',
      from_department_name: 'Parks Department',
      to_department: '4',
      to_department_name: 'Finance Department',
      description: 'Design green spaces and benches for Riverside Park',
      status: 'rejected',
      created_at: '2025-04-03T09:45:00Z',
    },
  ];

  // GET all requests
  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (useDemo) {
        // Use demo data if API is not available
        setTimeout(() => {
          setRequests(dummyRequests);
          setPagination((prev) => ({
            ...prev,
            totalPages: 1,
          }));
          setIsLoading(false);
        }, 500); // Simulate API delay
        return;
      }
      
      const res = await axios.get(
        `${apiUrl}/api/service-requests?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        { headers: { Authorization: token } }
      );
      
      setRequests(res.data.data);
      setPagination((prev) => ({
        ...prev,
        totalPages: res.data.meta.totalPages || 1,
      }));
    } catch (err) {
      console.error('Error fetching requests:', err);
      // setError('Failed to load service requests');
      setUseDemo(true);
      setRequests(dummyRequests);
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE
  const handleCreateRequest = async () => {
    // Validate form
    if (!newRequest.project_name || !newRequest.from_department || !newRequest.to_department) {
      toast.error('Project name and departments are required.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (useDemo) {
        // Demo mode - simulate API call
        setTimeout(() => {
          const newId = Math.max(...requests.map(r => r.id)) + 1;
          const fromDept = departments.find(d => d.value === newRequest.from_department);
          const toDept = departments.find(d => d.value === newRequest.to_department);
          
          const createdRequest = {
            id: newId,
            ...newRequest,
            from_department_name: fromDept ? fromDept.label : newRequest.from_department,
            to_department_name: toDept ? toDept.label : newRequest.to_department,
            created_at: new Date().toISOString()
          };
          
          setRequests([...requests, createdRequest]);
          resetForm();
          toast.success('Service request created!');
          setIsLoading(false);
        }, 500);
        return;
      }
      
      // Real API call
      await axios.post(
        `${apiUrl}/api/service-requests`,
        newRequest,
        { headers: { Authorization: token } }
      );
      
      fetchRequests();
      resetForm();
      toast.success('Service request created!');
    } catch (err) {
      toast.error('Failed to create request.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATE
  const handleEditRequest = async () => {
    // Validate form
    if (!newRequest.project_name || !newRequest.from_department || !newRequest.to_department) {
      toast.error('Project name and departments are required.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (useDemo) {
        // Demo mode - simulate API call
        setTimeout(() => {
          const fromDept = departments.find(d => d.value === newRequest.from_department);
          const toDept = departments.find(d => d.value === newRequest.to_department);
          
          const updatedRequests = requests.map(req => 
            req.id === currentRequestId
              ? {
                  ...req,
                  ...newRequest,
                  from_department_name: fromDept ? fromDept.label : newRequest.from_department,
                  to_department_name: toDept ? toDept.label : newRequest.to_department,
                }
              : req
          );
          
          setRequests(updatedRequests);
          resetForm();
          toast.success('Service request updated!');
          setIsLoading(false);
        }, 500);
        return;
      }
      
      // Real API call
      await axios.put(
        `${apiUrl}/api/service-requests/${currentRequestId}`,
        newRequest,
        { headers: { Authorization: token } }
      );
      
      fetchRequests();
      resetForm();
      toast.success('Service request updated!');
    } catch (err) {
      toast.error('Failed to update request.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // DELETE
  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    setIsLoading(true);
    
    try {
      if (useDemo) {
        // Demo mode - simulate API call
        setTimeout(() => {
          setRequests(requests.filter(req => req.id !== id));
          toast.success('Service request deleted!');
          setIsLoading(false);
        }, 500);
        return;
      }
      
      // Real API call
      await axios.delete(
        `${apiUrl}/api/service-requests/${id}`,
        { headers: { Authorization: token } }
      );
      
      fetchRequests();
      toast.success('Service request deleted!');
    } catch (err) {
      toast.error('Failed to delete request.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (request) => {
    // Find department IDs from names if needed
    const fromDept = departments.find(d => d.label === request.from_department_name);
    const toDept = departments.find(d => d.label === request.to_department_name);
    
    setNewRequest({
      project_name: request.project_name,
      from_department: request.from_department || (fromDept ? fromDept.value : ''),
      to_department: request.to_department || (toDept ? toDept.value : ''),
      description: request.description,
      status: request.status,
    });
    
    setCurrentRequestId(request.id);
    setIsEditMode(true);
    setModalOpen(true);
  };

  // Reset modal & form
  const resetForm = () => {
    setNewRequest({
      project_name: '',
      from_department: '',
      to_department: '',
      description: '',
      status: 'pending',
    });
    setCurrentRequestId(null);
    setIsEditMode(false);
    setModalOpen(false);
  };

  // Pagination handler
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
      <ToastContainer position="top-right" theme={isDarkMode() ? 'dark' : 'light'} />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Service Requests</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
              <li className="breadcrumb-item hover:text-gray-700 dark:hover:text-gray-300">
                <NavLink to="/dashboard">Home</NavLink>
              </li>
              <li className="text-gray-500 dark:text-gray-400">&gt;</li>
              <li className="breadcrumb-item text-gray-900 dark:text-white font-medium" aria-current="page">
                Service Requests
              </li>
            </ol>
          </nav>
        </div>
        <button
          onClick={() => {
            setIsEditMode(false);
            setModalOpen(true);
          }}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors flex items-center shadow-sm"
          disabled={isLoading}
        >
          <MdOutlineCreateNewFolder className="mr-2" />
          New Request
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900 dark:text-red-200">
          <p>{error}</p>
          {useDemo && <p className="text-sm mt-1">Using demo data instead.</p>}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <BeatLoader color={isDarkMode() ? '#3B82F6' : '#2563EB'} />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    Project Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    From Department
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    To Department
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {requests.length > 0 ? (
                  requests.map((req, idx) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {((pagination.currentPage - 1) * pagination.itemsPerPage) + idx + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {req.project_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {req.from_department_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {req.to_department_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => openEditModal(req)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Edit request"
                          >
                            <FiEdit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete request"
                          >
                            <FiTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No service requests found. Create a new one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {requests.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                Showing page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                >
                  First
                </button>
                <button
                  onClick={() => goToPage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => goToPage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <div 
            className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-xl p-6 w-full max-w-lg relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              onClick={resetForm}
              aria-label="Close"
            >
              <MdClose size={24} />
            </button>
            
            <h2 className="text-xl font-bold mb-6">
              {isEditMode ? 'Edit Service Request' : 'New Service Request'}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name *
                </label>
                <input
                  id="project_name"
                  type="text"
                  placeholder="Enter project name"
                  value={newRequest.project_name}
                  onChange={(e) =>
                    setNewRequest((prev) => ({ ...prev, project_name: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  required
                />
              </div>

              <div>
                <label htmlFor="from_department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Department *
                </label>
                <Select
                  id="from_department"
                  options={departments}
                  value={departments.find((d) => d.value === newRequest.from_department)}
                  onChange={(selected) =>
                    setNewRequest((prev) => ({ ...prev, from_department: selected.value }))
                  }
                  placeholder="Select department"
                  styles={customSelectStyles}
                  isSearchable
                  required
                />
              </div>

              <div>
                <label htmlFor="to_department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Department *
                </label>
                <Select
                  id="to_department"
                  options={departments}
                  value={departments.find((d) => d.value === newRequest.to_department)}
                  onChange={(selected) =>
                    setNewRequest((prev) => ({ ...prev, to_department: selected.value }))
                  }
                  placeholder="Select department"
                  styles={customSelectStyles}
                  isSearchable
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  placeholder="Enter description"
                  value={newRequest.description}
                  onChange={(e) =>
                    setNewRequest((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow h-24 resize-none"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Select
                  id="status"
                  options={statusOptions}
                  value={statusOptions.find((s) => s.value === newRequest.status)}
                  onChange={(selected) =>
                    setNewRequest((prev) => ({ ...prev, status: selected.value }))
                  }
                  placeholder="Select status"
                  styles={customSelectStyles}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={isEditMode ? handleEditRequest : handleCreateRequest}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <BeatLoader size={8} color="white" className="mr-2" />
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{isEditMode ? 'Update Request' : 'Create Request'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequests;