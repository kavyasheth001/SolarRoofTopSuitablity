import React, { useState, useEffect, useRef } from 'react';
import {
  MdOutlineCreateNewFolder,
  MdClose,
  MdViewColumn,
  MdArrowUpward,
  MdArrowDownward,
} from 'react-icons/md';
import axios from 'axios';
import { BeatLoader } from 'react-spinners';
import { NavLink } from 'react-router-dom';
import Switch from '../ToggleSwitch/ToggleSwitch';
import { FiEdit } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';

const Role = () => {
  // 1) State for roles & loading
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 2) Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRoleId, setCurrentRoleId] = useState(null);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // 3) Column filters & sorting
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

  // 4) Pagination (Server-side)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // 5) API & token
  const apiUrl = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('token');

  // 6) Fetch roles
  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage]);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/roles?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        {
          headers: { Authorization: token },
        },
      );
      setRoles(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.meta.totalPages,
        totalItems: response.data.meta.totalItems,
      }));
      setErrorMessage('');
    } catch (error) {
      toast.error(error.response?.data?.error);
      console.error('Error fetching roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 7) Pagination Handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // 8) Toggle active/inactive
  const handleToggleActive = async (id, isActive) => {
    try {
      const response = await axios.put(
        `${apiUrl}/api/roles/${id}/status`,
        { is_active: !isActive },
        { headers: { Authorization: token } },
      );
      // Update local state
      setRoles((prev) =>
        prev.map((role) =>
          role.id === id
            ? { ...role, is_active: response.data.is_active }
            : role,
        ),
      );
    } catch (error) {
      toast.error(error.response?.data?.error);
      console.error('Error toggling role status:', error);
    }
  };

  // 9) Create role
  const openCreateModal = () => {
    setModalOpen(true);
    setIsEditMode(false);
    setCurrentRoleId(null);
    setNewRole({
      name: '',
      description: '',
      is_active: true,
    });
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.description.trim()) {
      alert('Name and Description are required.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${apiUrl}/api/roles`, newRole, {
        headers: { Authorization: token },
      });
      setRoles((prev) => [...prev, response.data]);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error);
      console.error('Error creating role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 10) Edit role
  const openEditModal = (role) => {
    setModalOpen(true);
    setIsEditMode(true);
    setCurrentRoleId(role.id);
    setNewRole({
      name: role.name,
      description: role.description,
      is_active: role.is_active,
    });
  };

  const handleEditRole = async () => {
    if (!newRole.name.trim() || !newRole.description.trim()) {
      alert('Name and Description are required.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.put(
        `${apiUrl}/api/roles/${currentRoleId}`,
        newRole,
        {
          headers: { Authorization: token },
        },
      );
      setRoles((prev) =>
        prev.map((role) => (role.id === currentRoleId ? response.data : role)),
      );
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error);
      console.error('Error updating role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 11) Reset form
  const resetForm = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setCurrentRoleId(null);
    setNewRole({ name: '', description: '', is_active: true });
    setErrorMessage('');
  };

  // 12) Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRoles = [...roles].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

   // Column Filter toggle logic
    useEffect(() => {
      const handleOutsideClick = (event) => {
        // If the click did not happen inside the column filter OR the filter button, then close.
        if (
          showColumnFilter &&
          !event.target.closest(".column-filter") &&
          !event.target.closest(".filter-btn")
        ) {
          setShowColumnFilter(false);
        }
      };
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [showColumnFilter]);

  // 14) Render
  return (
    <div
      className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default 
                 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
    >
      <ToastContainer />
      {isLoading && (
        <div className="text-center my-2">
          <BeatLoader color="#f1c40f" />
        </div>
      )}

      {errorMessage && (
        <p className="text-red-500 dark:text-red-400 text-center my-2">
          {errorMessage}
        </p>
      )}

       {/* Breadcrumb and Create Button */}
            
                <div className="flex justify-between items-center mb-4">
        <nav aria-label="breadcrumb">
          <ol className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <li className="hover:text-black dark:hover:text-gray-200">
              <NavLink to="/dashboard">Home</NavLink>
            </li>
            <li className="text-gray-500 dark:text-gray-400">&gt;</li>
            <li className="text-gray-800 dark:text-gray-200 font-medium" aria-current="page">
              Roles
            </li>
          </ol>
        </nav>
        <div className="flex space-x-4">
          <button
            onClick={openCreateModal}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Create Role
          </button>
          <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent the click from bubbling up
          setShowColumnFilter((prev) => !prev);
        }}
        className="filter-btn bg-blue-500 text-white py-2 px-4 rounded hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center"
      >
        <MdViewColumn className="inline-block mr-1" />
        Filter
      </button>
      
          {showColumnFilter && (
            <div
              className="column-filter absolute bg-gray-700 text-white p-4 rounded shadow-lg z-50"
              style={{
                right: '2rem',
                top: '7rem',
                width: '200px',
              }}
              // Stop clicks within the panel from bubbling up and triggering the outside click handler
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-blue-300 mb-2">
                Filter Columns
              </h4>
              {Object.keys(columnFilter).map((column) => (
                <div key={column} className="mb-2">
                  <label
                    onClick={(e) => e.stopPropagation()} // Prevent label clicks from closing the panel
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
                      onClick={(e) => e.stopPropagation()} // Prevent checkbox click from bubbling up
                      className="accent-blue-400"
                    />
                    <span className="capitalize">{column.replace('_', ' ')}</span>
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
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700 text-left">
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
                  Description
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
                <th className="py-4 px-4 font-medium text-black dark:text-gray-100">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRoles.map((role, index) => (
              <tr
                key={role.id}
                className="border-b border-stroke dark:border-gray-600"
              >
                {/* ID */}
                {columnFilter.id && (
                  <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                    {index +
                      1 +
                      (pagination.currentPage - 1) * pagination.itemsPerPage}
                  </td>
                )}
                {/* Name */}
                {columnFilter.name && (
                  <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                    {role.name}
                  </td>
                )}
                {/* Description */}
                {columnFilter.description && (
                  <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                    {role.description}
                  </td>
                )}
                {/* Status (Switch) */}
                {columnFilter.is_active && (
                  <td className="py-5 px-4">
                    {/* 
                      Replaced the old inline toggle with our Switch component.
                      We pass a unique id, the isChecked value, and our onChange callback.
                    */}
                    <Switch
                      id={`switch-${role.id}`}
                      isChecked={role.is_active}
                      onChange={() =>
                        handleToggleActive(role.id, role.is_active)
                      }
                    />
                  </td>
                )}
                {/* Actions */}
                {columnFilter.actions && (

                  // make this action parent flex and button should be in center 
                  <td className="py-5 px-4 flex justify-center ">
                    {/* <button
                      className="text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400"
                      onClick={() => openEditModal(role)}
                    >
                      <MdModeEdit size={18} />
                    </button> */}
                    <button
                      className="text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-blue-500"
                      onClick={() => openEditModal(role)}
                    >
                      <FiEdit size={18} />
                    </button>
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
         ${pagination.currentPage === 1 ? "invisible" : "visible"}`}
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
         ${pagination.currentPage === pagination.totalPages ? "invisible" : "visible"}`}
     >
       Next
       <TfiAngleRight size={22} className="ml-1" />
     </button>
   </div>
   

      {/* CREATE/EDIT MODAL */}
      {modalOpen && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        isEditMode ? handleEditRole() : handleCreateRole();
      }
    }}
    tabIndex={0}
  >
    <div
      className="absolute bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-6 w-full max-w-md"
      style={{
        top: '50%', // Positions the modal vertically in the center of the screen
        left: '50%', // Positions the modal horizontally in the center of the screen
        transform: 'translate(-50%, -50%)', // Shifts it by 50% of its height and width to truly center it
      }}
    >
      <div className="flex justify-end">
        <MdClose
          className="text-gray-600 dark:text-gray-200 cursor-pointer mb-2"
          size={24}
          onClick={() => setModalOpen(false)}
        />
      </div>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {isEditMode ? 'Edit Role' : 'Create Role'}
      </h2>
      <input
        type="text"
        placeholder="Name"
        value={newRole.name}
        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
        className="w-full border rounded px-3 py-2 mb-4 text-gray-800 dark:text-white dark:bg-gray-700 dark:border-gray-600"
      />
      <input
        type="text"
        placeholder="Description"
        value={newRole.description}
        onChange={(e) =>
          setNewRole({ ...newRole, description: e.target.value })
        }
        className="w-full border rounded px-3 py-2 mb-4 text-gray-800 dark:text-white dark:bg-gray-700 dark:border-gray-600"
      />
      <div className="flex justify-end space-x-3">
        <button
          className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 px-4 rounded"
          onClick={() => setModalOpen(false)}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700"
          onClick={isEditMode ? handleEditRole : handleCreateRole}
        >
          {isEditMode ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default Role;
