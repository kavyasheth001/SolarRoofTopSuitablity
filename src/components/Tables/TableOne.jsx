import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash } from 'react-icons/fi';
import { TfiAngleRight, TfiAngleLeft } from 'react-icons/tfi';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavLink } from 'react-router-dom';
import Switch from '../ToggleSwitch/ToggleSwitch';
import {
  MdArrowUpward,
  MdArrowDownward,
  MdViewColumn,
  MdOutlineCreateNewFolder,
} from 'react-icons/md';

const DepartmentTableWithModals = () => {
  // State variables
  const [departments, setDepartments] = useState([]);
  // Pagination: using server-side pagination values
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Create Fields
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDescription, setNewDepartmentDescription] = useState('');
  const [newDepartmentIsActive, setNewDepartmentIsActive] = useState('Active');

  // Edit Fields
  const [currentEditData, setCurrentEditData] = useState({
    id: null,
    name: '',
    description: '',
  });

  // Delete
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  // Column filters & sorting
  const [columnFilter, setColumnFilter] = useState({
    id: true,
    name: true,
    description: true,
    is_active: true,
    actions: true,
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const filterRef = useRef(null);

  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'asc',
  });

  // API & Token
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const apiUrl = `${BASE_URL}/api/departments`;
  const token = localStorage.getItem('token');

  // --- Move fetchDepartments outside of useEffect so we can call it when needed ---
  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        { headers: { Authorization: token } },
      );
      setDepartments(
        Array.isArray(response.data.data) ? response.data.data : [],
      );
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.meta.totalPages,
        totalItems: response.data.meta.totalItems,
      }));
    } catch (error) {
      toast.error(error.response?.data?.error);
      console.error('Error fetching departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch departments on mount and when currentPage or itemsPerPage change
  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.itemsPerPage]);

  // Pagination handler (server-side)
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort departments (the fetched departments are already paginated by the server)
  const sortedDepartments = [...departments].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Toggle Active/Inactive
  const handleToggleActive = async (id, currentIsActive) => {
    try {
      const response = await axios.put(
        `${apiUrl}/${id}/status`,
        { is_active: !currentIsActive },
        { headers: { Authorization: token } },
      );
      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === id
            ? { ...dept, is_active: response.data.is_active }
            : dept,
        ),
      );
    } catch (error) {
      console.error('Error toggling department status:', error);
      toast.error(error.response?.data?.error);
    }
  };

  // Create Department
  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewDepartmentName('');
    setNewDepartmentDescription('');
    setNewDepartmentIsActive('Active');
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const resetForm = () => {
    setNewDepartmentName('');
    setNewDepartmentDescription('');
    setNewDepartmentIsActive('Active');
    setIsCreateModalOpen(false);
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim() || !newDepartmentDescription.trim()) {
      toast.error('Name and description are required.');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: newDepartmentName,
        description: newDepartmentDescription,
        is_active: newDepartmentIsActive === 'Active',
      };
      await axios.post(apiUrl, payload, {
        headers: { Authorization: token },
      });
      toast.success('Department created successfully!');
      resetForm();
      // Re-fetch the departments list after creation
      fetchDepartments();
    } catch (error) {
      console.error(
        'Create Department Error:',
        error.response?.data || error.message,
      );
      if (error.response?.status === 403) {
        toast.error('You do not have permission to create a department.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error creating department.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Edit Department
  const openEditModal = (dept) => {
    setCurrentEditData({
      id: dept.id,
      name: dept.name,
      description: dept.description,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdateDepartment = async () => {
    const { id, name, description } = currentEditData;
    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required.');
      return;
    }
    try {
      const response = await axios.put(
        `${apiUrl}/${id}`,
        { name, description },
        { headers: { Authorization: token } },
      );
      if (response.status === 200) {
        toast.success('Department updated successfully!');
        closeEditModal();
        // Re-fetch the updated list
        fetchDepartments();
      } else {
        toast.error('Failed to update department.');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred while updating department.');
      }
    }
  };

  // Delete Department
  const openDeleteModal = (deptId) => {
    setDepartmentToDelete(deptId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDepartmentToDelete(null);
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    try {
      const response = await axios.delete(`${apiUrl}/${departmentToDelete}`, {
        headers: { Authorization: token },
      });
      if (response.status === 200) {
        toast.success('Department deleted successfully!');
        closeDeleteModal();
        // Re-fetch the updated list after deletion
        fetchDepartments();
      } else {
        toast.error('Failed to delete department.');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('An error occurred while deleting department.');
    }
  };

  // Column Filter toggle logic
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // If the click did not happen inside the column filter OR the filter button, then close.
      if (
        showColumnFilter &&
        !event.target.closest('.column-filter') &&
        !event.target.closest('.filter-btn')
      ) {
        setShowColumnFilter(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnFilter]);

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
      <ToastContainer />
      {isLoading ? (
        <div className="spinner-container flex justify-center items-center py-10">
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* Breadcrumb and Create/Filter Buttons */}
          <div className="flex justify-between items-center mb-4">
            <nav aria-label="breadcrumb">
              <ol className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <li className="hover:text-black dark:hover:text-gray-200">
                  <NavLink to="/dashboard">Home</NavLink>
                </li>
                <li className="text-gray-500 dark:text-gray-400">&gt;</li>
                <li
                  className="text-gray-800 dark:text-gray-200 font-medium"
                  aria-current="page"
                >
                  Departments
                </li>
              </ol>
            </nav>
            <div className="flex space-x-4">
              <button
                onClick={() => openCreateModal(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                <MdOutlineCreateNewFolder className="inline-block mr-2" />
                Create Department
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColumnFilter((prev) => !prev);
                }}
                className="filter-btn bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center"
              >
                <MdViewColumn className="inline-block mr-1" />
                Filter
              </button>
              {showColumnFilter && (
                <div
                  ref={filterRef}
                  className="column-filter absolute bg-gray-700 text-white p-4 rounded shadow-lg z-50"
                  style={{ right: '2rem', top: '7rem', width: '200px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="text-lg font-semibold text-blue-300 mb-2">
                    Filter Columns
                  </h4>
                  {Object.keys(columnFilter).map((column) => (
                    <div key={column} className="mb-2">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={columnFilter[column]}
                          onChange={() =>
                            setColumnFilter((prev) => ({
                              ...prev,
                              [column]: !prev[column],
                            }))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="accent-blue-400"
                        />
                        <span className="capitalize">
                          {column.replace('_', ' ')}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr className="text-left">
                  {columnFilter.id && (
                    <th
                      className="py-4 px-4 font-medium text-black dark:text-gray-100 cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      ID
                      {sortConfig.key === 'id' &&
                        (sortConfig.direction === 'asc' ? (
                          <MdArrowUpward className="inline-block ml-1" />
                        ) : (
                          <MdArrowDownward className="inline-block ml-1" />
                        ))}
                    </th>
                  )}
                  {columnFilter.name && (
                    <th
                      className="py-4 px-4 font-medium text-black dark:text-gray-100 cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      Name
                      {sortConfig.key === 'name' &&
                        (sortConfig.direction === 'asc' ? (
                          <MdArrowUpward className="inline-block ml-1" />
                        ) : (
                          <MdArrowDownward className="inline-block ml-1" />
                        ))}
                    </th>
                  )}
                  {columnFilter.description && (
                    <th
                      className="py-4 px-4 font-medium text-black dark:text-gray-100 cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      Tag
                      {sortConfig.key === 'description' &&
                        (sortConfig.direction === 'asc' ? (
                          <MdArrowUpward className="inline-block ml-1" />
                        ) : (
                          <MdArrowDownward className="inline-block ml-1" />
                        ))}
                    </th>
                  )}
                  {columnFilter.is_active && (
                    <th className="py-4 px-4 font-medium text-black dark:text-gray-100">
                      Status
                    </th>
                  )}
                  {columnFilter.actions && (
                    <th className="py-4 px-4 font-medium text-black dark:text-gray-100 text-center">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedDepartments.map((dept, index) => (
                  <tr
                    key={dept.id}
                    className="border-b border-stroke dark:border-gray-600"
                  >
                    {columnFilter.id && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {index +
                          1 +
                          (pagination.currentPage - 1) *
                            pagination.itemsPerPage}
                      </td>
                    )}
                    {columnFilter.name && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {dept.name}
                      </td>
                    )}
                    {columnFilter.description && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {dept.description}
                      </td>
                    )}
                    {columnFilter.is_active && (
                      <td className="py-5 px-4">
                        <Switch
                          id={`switch-${dept.id}`}
                          isChecked={dept.is_active}
                          onChange={() =>
                            handleToggleActive(dept.id, dept.is_active)
                          }
                        />
                      </td>
                    )}
                    {columnFilter.actions && (
                      <td className="py-5 px-4 flex justify-center">
                        <button
                          className="text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-blue-500 mr-2"
                          onClick={() => openEditModal(dept)}
                        >
                          <FiEdit size={18} />
                        </button>
                        {/* <button
                          className="text-gray-500 dark:text-gray-300 hover:text-red-500"
                          onClick={() => openDeleteModal(dept.id)}
                        >
                          <FiTrash size={18} />
                        </button> */}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination flex justify-end items-center mt-4 gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md 
                ${pagination.currentPage === 1 ? 'invisible' : 'visible'}`}
            >
              <TfiAngleLeft size={22} className="mr-1" />
              Previous
            </button>
            <span className="pagination-info text-gray-800 font-bold dark:text-gray-200">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md 
                ${pagination.currentPage === pagination.totalPages ? 'invisible' : 'visible'}`}
            >
              Next
              <TfiAngleRight size={22} className="ml-1" />
            </button>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Create Department
            </h2>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter department name"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
            />
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter tag"
              value={newDepartmentDescription}
              onChange={(e) => setNewDepartmentDescription(e.target.value)}
            />
            <select
              className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              value={newDepartmentIsActive}
              onChange={(e) => setNewDepartmentIsActive(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Edit Department
            </h2>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Department name"
              value={currentEditData.name}
              onChange={(e) =>
                setCurrentEditData({
                  ...currentEditData,
                  name: e.target.value,
                })
              }
            />
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Department description"
              value={currentEditData.description}
              onChange={(e) =>
                setCurrentEditData({
                  ...currentEditData,
                  description: e.target.value,
                })
              }
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDepartment}
                className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 dark:bg-opacity-70">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 text-red-600 rounded-full p-4 mb-4 dark:bg-red-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.594c.75 1.334-.213 3.007-1.743 3.007H3.482c-1.53 0-2.492-1.673-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-.25-4.75a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Delete Department
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete this department? This action
                cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={closeDeleteModal}
                className="px-6 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100 transition-colors duration-200"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteDepartment}
                className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
              >
                Yes, Delete!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentTableWithModals;
