import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { BeatLoader } from 'react-spinners';
import {
  MdOutlineCreateNewFolder,
  MdClose,
  MdViewColumn,
} from 'react-icons/md';
import { FiEdit, FiTrash } from 'react-icons/fi';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavLink } from 'react-router-dom';

// Helper function to detect dark mode
const isDarkMode = () => document.documentElement.classList.contains('dark');

const User = () => {
  // Data and UI States
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [userLevels, setUserLevels] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role_id: '',
    password: '',
    department: '',
    users_level: '',
    designation_level: '',
  });
  const DESIGNATION_TO_USER_LEVEL = {
    1: 6, // L1 → Maker
    2: 1, // L2 → Checker
    3: 7, // L3 → Reviewer
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    user_level: '',
    designation: '',
    role: '',
    department: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
  });
const [isLoading, setIsLoading] = useState(false);
const [isFetching, setIsFetching] = useState(false);
  // Column Filter States - Added user_level and designation columns
  const [columnFilter, setColumnFilter] = useState({
    id: true,
    name: true,
    email: true,
    role: true,
    department: true,
    user_level: true,
    designation: true,
    actions: true,
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const filterRef = useRef(null);

  const apiUrl = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('token');

  const GLOBAL_ADMIN_ROLE_LABELS = ['admin', 'super admin', 'superadmin'];

  // Check if selected role is a global admin (no department needed)
  const selectedRoleLabel = roles.find(r => r.value === parseInt(newUser.role_id) || r.value === newUser.role_id)?.label || '';
  const isGlobalAdminRole = GLOBAL_ADMIN_ROLE_LABELS.includes(selectedRoleLabel.toLowerCase().trim());

  const customSelectClassNames = {
    control: (state) =>
      `bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2`,
    menu: (state) =>
      `bg-white dark:bg-gray-700 rounded mt-1 shadow-lg`,
    menuList: (state) =>
      `max-h-60 overflow-y-auto`,
    option: (state) =>
      state.isFocused
        ? `bg-gray-200 dark:bg-gray-600`
        : `bg-white dark:bg-gray-700`,
    singleValue: (state) =>
      `text-gray-900 dark:text-gray-200`,
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      if (prev.direction === 'desc') return { column: null, direction: null };
      return { column, direction: 'asc' };
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Fetch data on mount and when pagination changes
useEffect(() => {
  const debounceTimer = setTimeout(() => {
    fetchUsers();
  }, 300);
  return () => clearTimeout(debounceTimer);
}, [pagination.currentPage, searchQuery, filters.user_level, filters.designation, filters.role, filters.department, sortConfig.column, sortConfig.direction]);
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch departments, user levels, and designations (independent of pagination)
  useEffect(() => {
    setIsLoading(true);

    // Fetch departments
    axios
      .get(`${apiUrl}/api/departments/all`, {
        headers: { Authorization: token },
      })
      .then((response) =>
        setDepartments(
          response.data.data.map((department) => ({
            value: department.id,
            label: department.name,
          }))
        )
      )
      .catch((error) => console.error('Error fetching departments:', error));

    // Fetch user levels
    axios
      .get(`${apiUrl}/api/user-levels`, {
        headers: { Authorization: token },
      })
      .then((response) =>
        setUserLevels(
          response.data.data.map((level) => ({
            value: level.id,
            label: level.name,
          }))
        )
      )
      .catch((error) => console.error('Error fetching user levels:', error));

    // Fetch designations
    axios
      .get(`${apiUrl}/api/designations`, {
        headers: { Authorization: token },
      })
      .then((response) =>
        setDesignations(
          response.data.data.map((designation) => ({
            value: designation.id,
            label: designation.name,
          }))
        )
      )
      .catch((error) => console.error('Error fetching designations:', error))
      .finally(() => setIsLoading(false));
  }, []);

  // Updated Column Filter Logic:
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close filter if click is outside filter dialog (.column-filter)
      // and outside filter button (.filter-btn)
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

const fetchUsers = async () => {
  setIsFetching(true);
  try {
    const params = new URLSearchParams({
      page: pagination.currentPage,
      limit: pagination.itemsPerPage,
    });
    if (searchQuery) params.append('search', searchQuery);
    if (filters.user_level) params.append('user_level', filters.user_level);
    if (filters.designation) params.append('designation', filters.designation);
    if (filters.role) params.append('role', filters.role);
    if (filters.department) params.append('department', filters.department);
    if (sortConfig.column) params.append('sort_by', sortConfig.column);
    if (sortConfig.direction) params.append('sort_dir', sortConfig.direction);

    const response = await axios.get(`${apiUrl}/api/people?${params.toString()}`, {
      headers: { Authorization: token },
    });
    setUsers(response.data.data);
    setPagination((prev) => ({
      ...prev,
      totalPages: response.data.meta.totalPages,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    setIsFetching(false);
  }
};

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/roles/all`, {
        headers: { Authorization: token },
      });
      setRoles(
        response.data.data.map((role) => ({
          value: role.id,
          label: role.name,
        }))
      );
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Pagination handler
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleCreateUser = async () => {
    // Department is only required for non-admin roles
    const needsDept = !isGlobalAdminRole;
    if (!newUser.name || !newUser.email || !newUser.role_id || !newUser.users_level || !newUser.designation_level || (needsDept && !newUser.department)) {
      toast.error('All fields are required.');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${apiUrl}/api/people`, newUser, {
        headers: { Authorization: token },
      });
      fetchUsers();
      resetForm();
      toast.success('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    // Department is only required for non-admin roles
    const needsDept = !isGlobalAdminRole;
    if (!newUser.name || !newUser.email || !newUser.role_id || !newUser.users_level || !newUser.designation_level || (needsDept && !newUser.department)) {
      toast.error('All fields are required.');
      return;
    }
    setIsLoading(true);
    try {
      await axios.put(`${apiUrl}/api/people/${currentUserId}`, newUser, {
        headers: { Authorization: token },
      });
      fetchUsers();
      resetForm();
      toast.success('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    setIsLoading(true);
    try {
      await axios.delete(`${apiUrl}/api/people/${id}`, {
        headers: { Authorization: token },
      });
      fetchUsers();
      toast.success('User deleted successfully!');
    } catch (error) {
      const message =
        error.response?.data?.error || 'Failed to delete user';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      role_id: '',
      password: '',
      department: '',
      users_level: '',
      designation_level: '',
    });
    setCurrentUserId(null);
    setIsEditMode(false);
    setModalOpen(false);
  };

  const SortIcon = ({ column }) => {
  if (sortConfig.column !== column) return <span className="ml-1 text-gray-400 text-xs">⇅</span>;
  if (sortConfig.direction === 'asc') return <span className="ml-1 text-blue-500 text-xs">↑</span>;
  if (sortConfig.direction === 'desc') return <span className="ml-1 text-blue-500 text-xs">↓</span>;
  return null;
};

  return (
    <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
      <ToastContainer />
     {isLoading ? (
  <div className="flex justify-center items-center">
    <BeatLoader color={isDarkMode() ? '#2563eb' : '#2563eb'} />
  </div>
) : (
  <>
    {/* Subtle fetch indicator — thin animated bar at top */}
    <div className={`h-0.5 rounded mb-2 transition-all duration-300 ${isFetching ? 'bg-blue-500 animate-pulse' : 'bg-transparent'}`} />
          {/* Breadcrumb + Create Button */}
          <div className="flex justify-between items-center mb-4">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb flex items-center space-x-2 text-secondary dark:text-secondary">
                <li className="breadcrumb-item hover:text-black dark:hover:text-white">
                  <NavLink to="/dashboard">Home</NavLink>
                </li>
                <li className="text-secondary dark:text-secondary">&gt;</li>
                <li
                  className="breadcrumb-item text-black dark:text-white font-medium"
                  aria-current="page"
                >
                  Users
                </li>
              </ol>
            </nav>
            <div className="flex space-x-4">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                <MdOutlineCreateNewFolder className="inline-block mr-2" />
                Create User
              </button>
              <button
                className="filter-btn bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColumnFilter((prev) => !prev);
                }}
              >
                <MdViewColumn className="inline-block mr-1" />
                Filter
              </button>

              {showColumnFilter && (
                <div
                  ref={filterRef}
                  className="column-filter absolute bg-boxdark text-white p-4 rounded shadow-lg z-50"
                  style={{ right: '2rem', top: '7rem', width: '200px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Filter Columns
                  </h4>
                  {Object.keys(columnFilter).map((column) => (
                    <div key={column} className="mb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
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
                          className="accent-blue-600"
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
            {/* Search and Filters Row */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 flex-1 min-w-[200px]"
              />
              <select
                value={filters.role}
                onChange={(e) => { setFilters((p) => ({ ...p, role: e.target.value })); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Roles</option>
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <select
                value={filters.department}
                onChange={(e) => { setFilters((p) => ({ ...p, department: e.target.value })); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              {/* <select
                value={filters.user_level}
                onChange={(e) => { setFilters((p) => ({ ...p, user_level: e.target.value })); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All User Levels</option>
                {userLevels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select> */}
              <select
                value={filters.designation}
                onChange={(e) => { setFilters((p) => ({ ...p, designation: e.target.value })); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Designations</option>
                {designations.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              {(searchQuery || filters.role || filters.department || filters.user_level || filters.designation) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilters({ user_level: '', designation: '', role: '', department: '' }); setPagination((p) => ({ ...p, currentPage: 1 })); }}
                  className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600 text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          {/* Users Table - Added User Level and Designation Columns */}
          <div style={{ scrollbarWidth: "thin" }} className="overflow-x-auto border rounded-lg dark:border-gray-600 ">
            <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-200 dark:bg-gray-700">
                  <tr>
                    {columnFilter.id && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('id')}>
                        ID <SortIcon column="id" />
                      </th>
                    )}
                    {columnFilter.name && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                        Name <SortIcon column="name" />
                      </th>
                    )}
                    {columnFilter.email && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('email')}>
                        Email / Emp code <SortIcon column="email" />
                      </th>
                    )}
                    {columnFilter.role && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('role')}>
                        Role <SortIcon column="role" />
                      </th>
                    )}
                    {columnFilter.department && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('department')}>
                        Department <SortIcon column="department" />
                      </th>
                    )}
                    {/* {columnFilter.user_level && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('user_level')}>
                        User Level <SortIcon column="user_level" />
                      </th>
                    )} */}
                    {columnFilter.designation && (
                      <th className="px-4 py-2 text-left cursor-pointer select-none hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => handleSort('designation')}>
                        Designation <SortIcon column="designation" />
                      </th>
                    )}
                    {columnFilter.actions && (
                      <th className="px-4 py-2 text-left">Actions</th>
                    )}
                  </tr>
                </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b border-stroke dark:border-gray-600"
                  >
                    {columnFilter.id && (
                      <td className="py-5 px-4">
                        {index +
                          1 +
                          (pagination.currentPage - 1) * pagination.itemsPerPage}
                      </td>
                    )}
                    {columnFilter.name && (
                      <td className="py-5 px-4">{user.name}</td>
                    )}
                    {columnFilter.email && (
                      <td className="py-5 px-4">{user.email}</td>
                    )}
                    {columnFilter.role && (
                      <td className="py-5 px-4">{user.role_name}</td>
                    )}
                    {columnFilter.department && (
                      <td className="py-5 px-4">{user.department_name}</td>
                    )}
                    {/* {columnFilter.user_level && (
                      <td className="py-5 px-4">{user.user_level_name}</td>
                    )} */}
                    {columnFilter.designation && (
                      <td className="py-5 px-4">{user.designation_name}</td>
                    )}
                    {columnFilter.actions && (
                      <td className="py-5 px-4 flex justify-center space-x-3">
                        <button
                          onClick={() => {
                            setCurrentUserId(user.id);
                            setNewUser({
                              name: user.name || '',
                              email: user.email || '',
                              role_id: user.role_id || '',
                              password: '',
                              department: user.department || '',
                              users_level: user.users_level || '',
                              designation_level: user.designation_level || '',
                            });
                            setIsEditMode(true);
                            setModalOpen(true);
                          }}
                          className="text-gray-500 dark:text-gray-300 hover:text-blue-500"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, userId: user.id })}
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

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              isEditMode ? handleEditUser() : handleCreateUser();
            }
          }}
          tabIndex={0}
        >
          <div className="relative bg-white dark:bg-boxdark dark:text-white rounded-lg  shadow-lg p-8 w-full max-w-md">
            <MdClose
              className="absolute top-4 right-4 cursor-pointer text-gray-600 dark:text-gray-200"
              onClick={resetForm}
              size={24}
            />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              {isEditMode ? 'Edit User' : 'Create User'}
            </h2>

            {/* Inputs */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={newUser.name || ''}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Email / Employee Code"
                value={newUser.email || ''}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="password"
                placeholder="Password (leave blank for AD users)"
                value={newUser.password || ''}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Select Inputs with Dark Mode Fix */}
            <div className="mt-4">
              {/* Roles Select */}
              <Select
                options={roles}
                value={roles.find(
                  (role) => role.value === parseInt(newUser.role_id) || role.value === newUser.role_id
                )}
                onChange={(selected) => {
                  // Clear department when switching to a global admin role
                  const newLabel = (selected?.label || '').toLowerCase().trim();
                  const willBeAdmin = GLOBAL_ADMIN_ROLE_LABELS.includes(newLabel);
                  setNewUser({
                    ...newUser,
                    role_id: selected.value,
                    department: willBeAdmin ? '' : newUser.department,
                  });
                }}
                placeholder="Select Role"
                className="mb-4"
                classNames={customSelectClassNames}
                styles={{
                  menuList: (provided) => ({
                    ...provided,
                    maxHeight: '150px',
                    overflowY: 'auto'
                  })
                }}
              />

              {/* Department Select — hidden for Admin / Super Admin */}
              {!isGlobalAdminRole && (
                <Select
                  options={departments}
                  value={departments.find(
                    (dept) => dept.value === parseInt(newUser.department) || dept.value === newUser.department
                  )}
                  onChange={(selected) =>
                    setNewUser({ ...newUser, department: selected.value })
                  }
                  placeholder="Select Department"
                  className="mb-4 dark:text-white"
                  classNames={customSelectClassNames}
                  styles={{
                    menuList: (provided) => ({
                      ...provided,
                      maxHeight: '170px',
                      overflowY: 'auto'
                    })
                  }}
                />
              )}

              {/* Designation Select */}
              <Select
                options={designations}
                value={designations.find(
                  (designation) => designation.value === parseInt(newUser.designation_level) || designation.value === newUser.designation_level
                )}
                onChange={(selected) => {
                  const autoUserLevel = DESIGNATION_TO_USER_LEVEL[selected.value] ?? newUser.users_level;
                  setNewUser({ ...newUser, designation_level: selected.value, users_level: autoUserLevel });
                }}
                placeholder="Select Designation"
                className="mb-4 dark:text-white"
                classNames={customSelectClassNames}
                styles={{
                  menuList: (provided) => ({
                    ...provided,
                    maxHeight: '150px',
                    overflowY: 'auto'
                  })
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded bg-accent text-white"
              >
                Cancel
              </button>
              <button
                onClick={isEditMode ? handleEditUser : handleCreateUser}
                className="px-4 py-2 rounded bg-primary text-white"
              >
                {isEditMode ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, userId: null })}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleDeleteUser(deleteConfirm.userId); setDeleteConfirm({ open: false, userId: null }); }}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
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

export default User;