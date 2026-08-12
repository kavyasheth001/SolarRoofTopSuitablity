import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { BeatLoader } from 'react-spinners'; // Loader for waiting states
import Select from 'react-select';
import {
  MdModeEdit,
  MdDeleteOutline,
  MdOutlineCreateNewFolder,
  MdClose,
  MdArrowUpward,
  MdArrowDownward,
  MdViewColumn,
} from 'react-icons/md';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiEdit, FiTrash } from 'react-icons/fi';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';
import { NavLink } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_BASE_URL;


const Permission = () => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPermissionId, setCurrentPermissionId] = useState(null);
  const [newPermission, setNewPermission] = useState({ role: '', permission_type: [] });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, itemsPerPage: 10 });
  // Column filter state for which columns to display:
  const [columnFilter, setColumnFilter] = useState({
    id: true,
    role: true,
    permission_type: true,
    actions: true,
  });
  // State to toggle the filter panel visibility:
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [isLoading, setIsLoading] = useState(false);

  const filterRef = useRef(null);

  const [token, setToken] = useState(null);
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Fetch roles for the select dropdown
  useEffect(() => {
    setIsLoading(true);
    axios
      .get(`${apiUrl}/api/roles/all`, { headers: { Authorization: token } })
      .then(response => {
        setRoles(response.data.data.map(role => ({ value: role.id, label: role.name })));
      })
      .catch(error => console.error('Error fetching roles:', error))
      .finally(() => setIsLoading(false));
  }, [token]);

  // Fetch permissions when pagination.currentPage or token changes
  useEffect(() => {
    fetchPermissions();
  }, [pagination.currentPage, token]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/permissions?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        { headers: { Authorization: token } }
      );
      setPermissions(response.data.data);
      setPagination(prev => ({ ...prev, totalPages: response.data.meta.totalPages }));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermission.role || newPermission.permission_type.length === 0) {
      toast.error('Role and Permission Type are required.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${apiUrl}/api/permissions`,
        {
          role_id: newPermission.role,
          permission_types: newPermission.permission_type.map(p => p.value),
        },
        { headers: { Authorization: token } }
      );
      setPermissions([...permissions, response.data]);
      resetForm();
      toast.success('Permission created successfully!');
    } catch (error) {
      console.error('Error creating permission:', error);
      toast.error(error.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPermission = async () => {
    if (!newPermission.role || newPermission.permission_type.length === 0) {
      toast.error('Role and Permission Type are required.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.put(
        `${apiUrl}/api/permissions/${currentPermissionId}`,
        {
          role: newPermission.role,
          permission_types: newPermission.permission_type.map(p => p.value),
        },
        { headers: { Authorization: token } }
      );
      setPermissions(
        permissions.map(permission =>
          permission.id === currentPermissionId ? response.data : permission
        )
      );
      resetForm();
      toast.success('Permission updated successfully!');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error(error.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePermission = async (id) => {
    setIsLoading(true);
    try {
      await axios.delete(`${apiUrl}/api/permissions/${id}`, { headers: { Authorization: token } });
      setPermissions(permissions.filter(permission => permission.id !== id));
      toast.success('Permission deleted successfully!');
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error(error.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewPermission({ role: '', permission_type: [] });
    setCurrentPermissionId(null);
    setIsEditMode(false);
    setModalOpen(false);
  };

  const openEditModal = (permission) => {
    setCurrentPermissionId(permission.id);
    setNewPermission({
      role: permission.role_id,
      permission_type: permission.permission_type.map(pt => ({ value: pt, label: pt })),
    });
    setIsEditMode(true);
    setModalOpen(true);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPermissions = [...permissions].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Outside click handler for column filter panel
  useEffect(() => {
    const handleOutsideClick = (event) => {
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
    <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
      <ToastContainer />
      {isLoading ? (
        <div className="flex justify-center items-center">
          <BeatLoader color="#f1c40f" />
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
                <li className="text-gray-800 dark:text-gray-200 font-medium" aria-current="page">
                  Permissions
                </li>
              </ol>
            </nav>
            <div className="flex space-x-4">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                <MdOutlineCreateNewFolder className="inline-block mr-2" />
                Create Permission
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
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  {columnFilter.id && (
                    <th
                      className="px-4 py-2 text-left cursor-pointer"
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
                  {columnFilter.role && <th className="px-4 py-2 text-left">Role</th>}
                  {columnFilter.permission_type && <th className="px-4 py-2 text-left">Permission Type</th>}
                  {columnFilter.actions && <th className="px-4 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPermissions.map((permission, index) => (
                  <tr key={permission.id} className="border-b border-stroke dark:border-gray-600">
                    {columnFilter.id && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {index + 1}
                      </td>
                    )}
                    {columnFilter.role && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {permission.role_name}
                      </td>
                    )}
                    {columnFilter.permission_type && (
                      <td className="py-5 px-4 text-gray-800 dark:text-gray-200">
                        {permission.permission_type.join(', ')}
                      </td>
                    )}
                    {columnFilter.actions && (
                      <td className="py-5 px-4 flex justify-center space-x-3">
                        <button
                          onClick={() => openEditModal(permission)}
                          className="text-gray-500 dark:text-gray-300 hover:text-blue-500"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeletePermission(permission.id)}
                          className="text-gray-500 dark:text-gray-300 hover:text-red-500"
                        >
                          <FiTrash size={18} />
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
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md ${pagination.currentPage === 1 ? 'invisible' : 'visible'
                }`}
            >
              <TfiAngleLeft size={22} className="mr-1" />
              Previous
            </button>
            <span className="pagination-info text-gray-800 font-bold dark:text-gray-200">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md ${pagination.currentPage === pagination.totalPages ? 'invisible' : 'visible'
                }`}
            >
              Next
              <TfiAngleRight size={22} className="ml-1" />
            </button>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              isEditMode ? handleEditPermission() : handleCreatePermission();
            }
          }}
          tabIndex={0}
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 relative">
            <MdClose
              className="absolute top-2 right-2 cursor-pointer text-gray-600 dark:text-gray-200"
              size={24}
              onClick={resetForm}
            />
            <h2 className="text-xl mb-4 text-gray-900 dark:text-gray-100">
              {isEditMode ? 'Edit Permission' : 'Create Permission'}
            </h2>
            <Select
              options={roles}
              value={roles.find(role => role.value === newPermission.role)}
              onChange={(selected) =>
                setNewPermission({ ...newPermission, role: selected.value })
              }
              placeholder="Select Role"
              classNames={{
                control: () => "w-full px-3 my-2 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500",
                menu: () => "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto",
                option: ({ isSelected }) =>
                  `px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${isSelected ? "bg-blue-500 text-white dark:bg-blue-600" : "text-gray-900 dark:text-gray-200"
                  }`,
                singleValue: () => "text-gray-900 dark:text-gray-200",
              }}
              styles={{
                menuList: (provided) => ({
                  ...provided,
                  maxHeight: '150px',
                  overflowY: 'auto'
                })
              }}
            />

            <Select
              isMulti
              options={[
                { value: 'create', label: 'Create' },
                { value: 'edit', label: 'Edit' },
                { value: 'delete', label: 'Delete' },
                { value: 'view', label: 'View' },
              ]}
              value={newPermission.permission_type}
              onChange={(selected) =>
                setNewPermission({ ...newPermission, permission_type: selected })
              }
              placeholder="Select Permission Types"
              classNames={{
                control: () => "w-full px-3  py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-500",
                menu: () => "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto",
                option: ({ isSelected }) =>
                  `px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${isSelected ? "bg-blue-500 text-white dark:bg-blue-600" : "text-gray-900 dark:text-gray-200"
                  }`,
                multiValue: () => "bg-blue-500 text-white px-2 py-1 rounded-md dark:bg-blue-600",
                singleValue: () => "text-gray-900 dark:text-gray-200",
              }}
            />

            <div className="mt-4 flex justify-end space-x-4">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-500 text-white rounded">
                Cancel
              </button>
              <button
                onClick={isEditMode ? handleEditPermission : handleCreatePermission}
                className="px-4 py-2 bg-blue-500 text-white rounded"
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

export default Permission;
