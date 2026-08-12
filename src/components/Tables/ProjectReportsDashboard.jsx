import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MdFilterList, MdRefresh, MdAssessment, MdCheckCircle,
  MdChevronLeft, MdChevronRight, MdFileDownload,
  MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdViewColumn,
} from "react-icons/md";
import { FiCalendar, FiUser, FiBriefcase, FiClock, FiSearch } from "react-icons/fi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

const todayStr = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

// ─── Status helpers ───────────────────────────────────────────────────────────
// status_id 11 = Rejected. Everything else that is not approved is pending/returned/draft.
// The old code used isapproved===false for "rejected" which is wrong — isapproved:false
// just means "not finally approved yet", which includes pending and returned records.
const STATUS_REJECTED = 11;
const STATUS_APPROVED = 10;

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: "s_no", label: "S.No", sortable: false },
  { key: "file_no", label: "File No", sortable: true },
  { key: "objectid", label: "Object ID", sortable: true },
  { key: "department_name", label: "Department", sortable: true },
  { key: "project_layer_name", label: "Project Layer", sortable: true },
  { key: "area_sq_mtr", label: "Area (sq.m)", sortable: true },
  { key: "length_mtr", label: "Length (m)", sortable: true },
  { key: "latitude", label: "Latitude", sortable: true },
  { key: "longitude", label: "Longitude", sortable: true },
  { key: "comment", label: "Comment", sortable: false },
  { key: "review_comment", label: "Review Comment", sortable: false },  // NEW
  { key: "created_by", label: "Created By", sortable: true },
  { key: "created_at", label: "Created At", sortable: true },
  { key: "updated_at", label: "Updated At", sortable: true },
  { key: "reviewed_at", label: "Reviewed At", sortable: true },  // NEW
  { key: "status", label: "Status", sortable: true },
  { key: "layer_feature", label: "Layer Feature", sortable: true },
  { key: "city", label: "City", sortable: true },
  { key: "ward", label: "Ward", sortable: true },
  { key: "zone", label: "Zone", sortable: true },
];

const DEFAULT_VISIBLE = new Set([
  "created_by", "created_at",
  "updated_at", "reviewed_at", "review_comment", "status",
  "ward", "zone",
]);

// ─── Status label/color map ───────────────────────────────────────────────────
const STATUS_MAP = {
  1: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600" },
  2: { label: "Pending with L2", color: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
  3: { label: "Pending with L2", color: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
  4: { label: "Pending with L3", color: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700" },
  5: { label: "Pending with L3", color: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700" },
  10: { label: "Approved", color: "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
  11: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
  12: { label: "Returned by L2", color: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700" },
  13: { label: "Returned by L3", color: "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" },
  14: { label: "Correction Pending (L2)", color: "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
  15: { label: "Correction Pending (L2)", color: "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
  16: { label: "Forwarded to L3 (correction)", color: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700" },
};

const getStatusDisplay = (statusId) =>
  STATUS_MAP[statusId] ?? { label: `Status ${statusId}`, color: "bg-gray-100 text-gray-600 border-gray-300" };

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const getSortValue = (report, key) => {
  switch (key) {
    case "file_no": return report.file_no ?? "";
    case "objectid": return report.objectid ?? "";
    case "department_name": return report.department_name ?? "";
    case "project_layer_name": return report.project_layer_name ?? "";
    case "area_sq_mtr": return report.area_sq_mtr ?? -Infinity;
    case "length_mtr": return report.length_mtr ?? -Infinity;
    case "latitude": return report.latitude ?? -Infinity;
    case "longitude": return report.longitude ?? -Infinity;
    case "created_by": return report.created_by_name ?? "";
    case "created_at": return report.created_at ? new Date(report.created_at).getTime() : 0;
    case "updated_at": return report.updated_at ? new Date(report.updated_at).getTime() : 0;
    case "status": return report.status_id ?? 0;
    case "layer_feature": return report.project_layer_feature_data?.name ?? "";
    case "city": return report.project_layer_feature_data?.city_name ?? "";
    case "ward": return report.project_layer_feature_data?.ward_name ?? "";
    case "zone": return report.project_layer_feature_data?.zone_name ?? "";
    case "reviewed_at": return report.reviewed_at ? new Date(report.reviewed_at).getTime() : 0;
    default: return "";
  }
};

const sortReports = (data, { key, dir }) => {
  if (!key) return data;
  return [...data].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
};

// ─── SortIcon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ colKey, sort }) => {
  if (sort.key !== colKey)
    return <MdUnfoldMore className="w-3.5 h-3.5 opacity-30 ml-1 inline-block" />;
  return sort.dir === "asc"
    ? <MdArrowUpward className="w-3.5 h-3.5 ml-1 inline-block text-blue-500" />
    : <MdArrowDownward className="w-3.5 h-3.5 ml-1 inline-block text-blue-500" />;
};

// ─── UserMultiSelect ──────────────────────────────────────────────────────────
// FIX 1: Added search input inside the dropdown.
// FIX 2: The parent already passes only department-scoped users via `filteredUsers`,
//        but the filtering logic is also corrected in the main component below.

const UserMultiSelect = ({ users, selectedIds, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");   // NEW: search state
  const ref = useRef(null);
  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus the search box when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) setSearch(""); // clear search on close
  }, [open]);

  const toggle = (id) => {
    const idStr = String(id);
    onChange(
      selectedIds.includes(idStr)
        ? selectedIds.filter((x) => x !== idStr)
        : [...selectedIds, idStr]
    );
  };

  const selectAll = () => onChange(users.map((u) => String(u.id)));
  const clearAll = () => onChange([]);

  // NEW: filter users by search query (name match, case-insensitive)
  const visibleUsers = search.trim()
    ? users.filter((u) =>
      u.name.toLowerCase().includes(search.trim().toLowerCase())
    )
    : users;

  const label =
    selectedIds.length === 0
      ? "All Users"
      : selectedIds.length === 1
        ? users.find((u) => String(u.id) === selectedIds[0])?.name ?? "1 selected"
        : `${selectedIds.length} users selected`;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-sm transition-all min-w-[160px] max-w-[220px]
          ${disabled
            ? "border-gray-200 dark:border-strokedark text-gray-400 bg-gray-50 dark:bg-meta-4/20 cursor-not-allowed"
            : "border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          }`}
      >
        <FiUser className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate text-gray-700 dark:text-white">{label}</span>
        {selectedIds.length > 0 && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-1.5 py-0.5 font-semibold shrink-0">
            {selectedIds.length}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-xl shadow-xl w-60 py-2">

          {/* Header: title + select-all / clear */}
          <div className="px-3 pb-2 border-b border-gray-100 dark:border-strokedark flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-bodydark2 uppercase tracking-wider">
              Filter by User
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 dark:text-bodydark hover:underline font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          {/* NEW: Search input */}
          {/* Search input */}
          <div className="px-2 pt-2 pb-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-100 dark:bg-meta-4 border border-transparent focus-within:border-blue-400 focus-within:bg-white dark:focus-within:bg-boxdark transition-all">
              <FiSearch className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white placeholder-gray-400 outline-none min-w-0"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 text-[10px] leading-none transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* User list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {visibleUsers.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-bodydark2">
                {users.length === 0
                  ? "No users in this department"
                  : "No users match your search"}
              </p>
            ) : (
              visibleUsers.map((u) => {
                const idStr = String(u.id);
                const checked = selectedIds.includes(idStr);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(u.id)}
                      className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0"
                    />
                    <span className="text-sm text-gray-700 dark:text-white truncate">{u.name}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer: showing X of Y users */}
          {search && (
            <div className="px-3 pt-1 border-t border-gray-100 dark:border-strokedark">
              <p className="text-xs text-gray-400 py-1">
                {visibleUsers.length} of {users.length} users
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── ColumnTogglePanel ────────────────────────────────────────────────────────

const ColumnTogglePanel = ({ visible, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (key) => {
    const next = new Set(visible);
    if (next.has(key)) { if (next.size > 1) next.delete(key); }
    else next.add(key);
    onChange(next);
  };

  const toggleAll = () => {
    if (visible.size === ALL_COLUMNS.length) onChange(new Set(["s_no"]));
    else onChange(new Set(ALL_COLUMNS.map((c) => c.key)));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-form-strokedark text-gray-700 dark:text-white bg-white dark:bg-form-input rounded-lg hover:bg-gray-50 dark:hover:bg-meta-4 text-sm font-medium transition-all"
      >
        <MdViewColumn className="w-4 h-4" />
        Columns
        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-1.5 py-0.5 font-semibold">
          {visible.size}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-xl shadow-xl w-52 py-2">
          <div className="px-3 pb-2 border-b border-gray-100 dark:border-strokedark flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-bodydark2 uppercase tracking-wider">
              Show / Hide
            </span>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {visible.size === ALL_COLUMNS.length ? "Hide all" : "Show all"}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {ALL_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visible.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-white">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProjectReportsDashboard = () => {
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const rawToken = localStorage.getItem("token");
  const me = decodeToken(rawToken);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    department: "",
    user_ids: [],
    from_date: firstOfMonth(),
    to_date: todayStr(),
  });

  // FIX 3: status filter now maps to actual status_id values, not isapproved boolean.
  // Options: "all" | "approved" (status_id 10) | "rejected" (status_id 11)
  //          | "returned" (status_id 12 or 13) | "pending" (everything else)
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    approvedProjects: 0,
    proposedProjects: 0,
  });

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // ── Column visibility ──────────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE);

  // ── Role ───────────────────────────────────────────────────────────────────
  const isAdmin = me?.role === "admin" || me?.role === "superadmin";

  // ── Derived: status-filtered + sorted + paginated ─────────────────────────
  // FIX 3: filter by status_id, not by isapproved boolean.
  const statusFilteredReports = reports.filter((r) => {
    switch (statusFilter) {
      case "approved": return r.status_id === STATUS_APPROVED;
      case "rejected": return r.status_id === STATUS_REJECTED;
      case "returned": return r.status_id === 12 || r.status_id === 13;
      case "pending": return ![STATUS_APPROVED, STATUS_REJECTED, 12, 13].includes(r.status_id);
      default: return true;
    }
  });

  const sortedReports = sortReports(statusFilteredReports, sort);
  const totalPages = Math.ceil(sortedReports.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentReports = sortedReports.slice(startIndex, startIndex + pageSize);

  // ── Visible column list (ordered) ─────────────────────────────────────────
  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  // ── Init filters for non-admin ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin && me) {
      setFilters((prev) => ({
        ...prev,
        department: me.department_id ? String(me.department_id) : prev.department,
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch reference data ───────────────────────────────────────────────────
  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch reports whenever filters change ──────────────────────────────────
  useEffect(() => {
    if (!filters.from_date || !filters.to_date) return;
    if (isAdmin && filters.department && departments.length === 0) return;
    fetchReports();
  }, [filters, departments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset page on filter / sort / pageSize change ─────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, statusFilter, pageSize, sort]);

  // ── FIX 2: Department-scoped user filtering ────────────────────────────────
  // The users array from /api/people/all has a `department` field (department name string).
  // We match it against the selected department's name.
  // For non-admins, we scope to their own department from the JWT.
  useEffect(() => {
    let subset;

    if (filters.department) {
      // Find the dept name for the selected dept ID
      const dept = departments.find((d) => String(d.id) === String(filters.department));
      const deptName = dept?.name ?? "";

      // Match users whose `department` field equals the dept name.
      // Falls back to `user_department_name` if your /people/all uses that field instead.
      subset = users.filter(
        (u) =>
          u.department === deptName ||
          u.user_department_name === deptName ||
          u.department_name === deptName
      );
    } else if (!isAdmin && me?.department) {
      // Non-admin with no explicit dept filter: scope to their own dept from JWT
      const myDept = me.department;
      subset = users.filter(
        (u) =>
          u.department === myDept ||
          u.user_department_name === myDept ||
          u.department_name === myDept
      );
    } else {
      // Admin with no dept selected — show all users
      subset = users;
    }

    setFilteredUsers(subset);

    // Drop any selected user_ids that no longer belong to the new department
    if (filters.user_ids.length > 0) {
      const validIds = new Set(subset.map((u) => String(u.id)));
      const stillValid = filters.user_ids.filter((id) => validIds.has(id));
      if (stillValid.length !== filters.user_ids.length) {
        setFilters((prev) => ({ ...prev, user_ids: stillValid }));
      }
    }
  }, [filters.department, users, departments]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API calls ──────────────────────────────────────────────────────────────
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/departments/all`, {
        headers: { Authorization: rawToken },
      });
      const data = await res.json();
      setDepartments(data.data || []);
    } catch (e) {
      console.error("fetchDepartments", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/people/all`, {
        headers: { Authorization: rawToken },
      });
      const data = await res.json();
      setUsers(data.data || []);
      setFilteredUsers(data.data || []);
    } catch (e) {
      console.error("fetchUsers", e);
    }
  };

  const getDepartmentName = useCallback(
    (deptId) => departments.find((d) => String(d.id) === String(deptId))?.name ?? "",
    [departments]
  );

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (isAdmin) {
        if (filters.department) params.append("department", getDepartmentName(filters.department));
      } else {
        if (me?.department_id) params.append("department_id", me.department_id);
      }

      if (filters.user_ids.length > 0) {
        params.append("user_ids", filters.user_ids.join(","));
      }

      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);

      const res = await fetch(
        `${BASE_URL}/api/projectss/project-report?${params}`,
        { headers: { Authorization: rawToken } }
      );
      const data = await res.json();
      const reportData = data.data || [];
      setReports(reportData);

      const approvedCount = reportData.filter((r) => r.status_id === STATUS_APPROVED).length;
      const proposedCount = reportData.filter((r) => r.project_status === "Proposed").length;
      setStats({
        totalProjects: reportData.length,
        approvedProjects: approvedCount,
        proposedProjects: proposedCount,
      });
    } catch (e) {
      console.error("fetchReports", e);
      setReports([]);
      setStats({ totalProjects: 0, approvedProjects: 0, proposedProjects: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFilterChange = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const handleReset = () => {
    setFilters({
      department: isAdmin ? "" : (me?.department_id ? String(me.department_id) : ""),
      user_ids: [],
      from_date: firstOfMonth(),
      to_date: todayStr(),
    });
    setStatusFilter("all");
    setSort({ key: null, dir: "asc" });
  };

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (sortedReports.length === 0) return;
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = [
      "S.No", "File No", "Object ID", "Department", "Project Layer",
      "Area (sq.m)", "Length (m)", "Latitude", "Longitude", "Comment",
      "Review Comment", "Created By", "Created By Email", "Created At", "Updated At",
      "Reviewed At", "Status", "Project Status", "Layer Feature", "City", "Ward", "Zone", "Geometry",
    ];
    const rows = sortedReports.map((r, i) => [
      i + 1,
      esc(r.file_no),
      esc(r.objectid),
      esc(r.department_name),
      esc(r.project_layer_name),
      r.area_sq_mtr != null ? r.area_sq_mtr.toFixed(2) : "",
      r.length_mtr != null ? r.length_mtr.toFixed(2) : "",
      r.latitude != null ? r.latitude.toFixed(6) : "",
      r.longitude != null ? r.longitude.toFixed(6) : "",
      esc(r.comment),
      esc(r.review_comment),
      esc(r.created_by_name),
      esc(r.created_by_email),
      esc(r.created_at ? new Date(r.created_at).toLocaleString() : ""),
      esc(r.updated_at ? new Date(r.updated_at).toLocaleString() : ""),
      esc(r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ""),
      esc(getStatusDisplay(r.status_id).label),
      esc(r.project_status),
      esc(r.project_layer_feature_data?.name),
      esc(r.project_layer_feature_data?.city_name),
      esc(r.project_layer_feature_data?.ward_name),
      esc(r.project_layer_feature_data?.zone_name),
      esc(r.geometry),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_reports_${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Pagination numbers ─────────────────────────────────────────────────────
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      [1, 2, 3, 4, "...", totalPages].forEach((p) => pages.push(p));
    } else if (currentPage >= totalPages - 2) {
      [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages].forEach((p) =>
        pages.push(p)
      );
    } else {
      [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages].forEach((p) =>
        pages.push(p)
      );
    }
    return pages;
  };

  // ── Cell renderer ──────────────────────────────────────────────────────────
  const renderCell = (col, report, rowIdx) => {
    switch (col.key) {
      case "s_no":
        return (
          <td
            key={col.key}
            className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-inherit"
          >
            {startIndex + rowIdx + 1}
          </td>
        );
      case "file_no":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
            {report.file_no || "—"}
          </td>
        );
      case "objectid":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.objectid || "—"}
          </td>
        );
      case "department_name":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
            {report.department_name || "—"}
          </td>
        );
      case "project_layer_name":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.project_layer_name || "—"}
          </td>
        );
      case "area_sq_mtr":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono text-right">
            {report.area_sq_mtr != null ? report.area_sq_mtr.toFixed(2) : "—"}
          </td>
        );
      case "length_mtr":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono text-right">
            {report.length_mtr != null ? report.length_mtr.toFixed(2) : "—"}
          </td>
        );
      case "latitude":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
            {report.latitude != null ? report.latitude.toFixed(6) : "—"}
          </td>
        );
      case "longitude":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
            {report.longitude != null ? report.longitude.toFixed(6) : "—"}
          </td>
        );
      case "comment":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-600 dark:text-bodydark max-w-[180px]">
            <div className="truncate" title={report.comment}>
              {report.comment || "—"}
            </div>
          </td>
        );
      case "created_by":
        return (
          <td key={col.key} className="px-4 py-3 text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {report.created_by_name || "—"}
            </div>
            {report.created_by_email && (
              <div className="text-xs text-gray-400 dark:text-bodydark2 mt-0.5">
                {report.created_by_email}
              </div>
            )}
          </td>
        );
      case "created_at":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
            {report.created_at ? new Date(report.created_at).toLocaleString() : "—"}
          </td>
        );
      case "updated_at":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
            {report.updated_at ? new Date(report.updated_at).toLocaleString() : "—"}
          </td>
        );
      case "review_comment":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-600 dark:text-bodydark max-w-[200px]">
            <div className="truncate" title={report.review_comment}>
              {report.review_comment || <span className="text-gray-300 dark:text-gray-600 italic text-xs">—</span>}
            </div>
          </td>
        );

      case "reviewed_at":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
            {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : "—"}
          </td>
        );
      // FIX 3: "status" column now uses status_id → STATUS_MAP for accurate label + color
      case "status": {
        const { label, color } = getStatusDisplay(report.status_id);
        return (
          <td key={col.key} className="px-4 py-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${color}`}
            >
              {label}
            </span>
          </td>
        );
      }

      case "layer_feature":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.project_layer_feature_data?.name || "—"}
          </td>
        );
      case "city":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.project_layer_feature_data?.city_name || "—"}
          </td>
        );
      case "ward":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.project_layer_feature_data?.ward_name || "—"}
          </td>
        );
      case "zone":
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            {report.project_layer_feature_data?.zone_name || "—"}
          </td>
        );
      default:
        return (
          <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            —
          </td>
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-boxdark-2 p-6">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Project Reports Dashboard
        </h1>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-200 dark:border-strokedark px-4 py-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">

          <div className="flex items-center gap-1.5 text-gray-500 dark:text-bodydark shrink-0">
            <MdFilterList className="w-4 h-4" />
            <span className="text-sm font-semibold">Filters</span>
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-strokedark shrink-0 hidden sm:block" />

          {/* Department */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 min-w-[160px]">
              <FiBriefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
                className="flex-1 text-sm px-2.5 py-1.5 border border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-bodydark bg-gray-100 dark:bg-meta-4 px-2.5 py-1.5 rounded-lg">
              <FiBriefcase className="w-3.5 h-3.5 text-gray-400" />
              <span>{getDepartmentName(filters.department) || "My Department"}</span>
            </div>
          )}

          {/* User filter — only shows users in the selected/own department */}
          <UserMultiSelect
            users={filteredUsers}
            selectedIds={filters.user_ids}
            onChange={(ids) => setFilters((prev) => ({ ...prev, user_ids: ids }))}
            disabled={false}
          />

          {/* From Date */}
          <div className="flex items-center gap-1.5">
            <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange("from_date", e.target.value)}
              className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <span className="text-gray-400 text-sm shrink-0">→</span>

          {/* To Date */}
          <div className="flex items-center gap-1.5">
            <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange("to_date", e.target.value)}
              className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-opacity-90 transition-all text-sm font-medium ml-auto shrink-0"
          >
            <MdRefresh className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-200 dark:border-strokedark p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-bodydark uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalProjects}</p>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <MdAssessment className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-200 dark:border-strokedark p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-bodydark uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.approvedProjects}</p>
          </div>
          <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <MdCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-200 dark:border-strokedark p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-bodydark uppercase tracking-wider">Proposed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.proposedProjects}</p>
          </div>
          <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <FiClock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* ── Reports Table ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-200 dark:border-strokedark overflow-hidden">

        {/* Table toolbar */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-strokedark bg-gradient-to-r from-blue-50 to-white dark:from-boxdark dark:to-boxdark">
          <div className="flex items-center justify-between flex-wrap gap-3">

            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Project Reports</h2>
              <p className="text-xs text-gray-500 dark:text-bodydark mt-0.5">
                {sortedReports.length > 0
                  ? `${startIndex + 1}–${Math.min(startIndex + pageSize, sortedReports.length)} of ${sortedReports.length} projects`
                  : "0 projects"}
                {sort.key && (
                  <span className="ml-2 text-blue-500">
                    · Sorted by {ALL_COLUMNS.find((c) => c.key === sort.key)?.label} ({sort.dir})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">

              {/* FIX 3: Status filter with all real statuses */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="returned">Returned</option>
                <option value="pending">Pending</option>
              </select>

              {/* Page size */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-form-strokedark dark:bg-form-input dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <ColumnTogglePanel visible={visibleCols} onChange={setVisibleCols} />

              <button
                onClick={handleExportCSV}
                disabled={sortedReports.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${sortedReports.length === 0
                  ? "border-gray-200 dark:border-strokedark text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-meta-4/20"
                  : "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40"
                  }`}
              >
                <MdFileDownload className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : sortedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4">
            <div className="p-3 bg-gray-100 dark:bg-meta-4 rounded-full mb-3">
              <MdAssessment className="w-10 h-10 text-gray-400 dark:text-bodydark" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              No projects found
            </h3>
            <p className="text-sm text-gray-500 dark:text-bodydark text-center max-w-sm">
              No projects match your selected filters. Try adjusting the filters or reset them.
            </p>
          </div>
        ) : (
          <>
            <div
              className="overflow-x-auto"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f1f5f9" }}
            >
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-meta-4">
                  <tr className="border-b-2 border-gray-300 dark:border-strokedark">
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                        className={`px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-bodydark1 uppercase tracking-wider whitespace-nowrap
                          ${col.key === "s_no" ? "sticky left-0 bg-gray-100 dark:bg-meta-4" : ""}
                          ${col.sortable ? "cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-meta-4/80 transition-colors" : ""}
                        `}
                      >
                        {col.label}
                        {col.sortable && <SortIcon colKey={col.key} sort={sort} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentReports.map((report, rowIdx) => (
                    <tr
                      key={report.id || rowIdx}
                      className={`border-b border-gray-100 dark:border-strokedark transition-colors hover:bg-blue-50 dark:hover:bg-meta-4
                        ${rowIdx % 2 === 0 ? "bg-white dark:bg-boxdark" : "bg-gray-50/60 dark:bg-meta-4/20"}`}
                    >
                      {visibleColumns.map((col) => renderCell(col, report, rowIdx))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-bodydark">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border transition-all ${currentPage === 1
                      ? "border-gray-200 dark:border-strokedark text-gray-300 cursor-not-allowed"
                      : "border-gray-300 dark:border-form-strokedark text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4"
                      }`}
                  >
                    <MdChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers().map((page, idx) =>
                    page === "..." ? (
                      <span key={`e-${idx}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[2rem] px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${currentPage === page
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-form-strokedark text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4"
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages
                      ? "border-gray-200 dark:border-strokedark text-gray-300 cursor-not-allowed"
                      : "border-gray-300 dark:border-form-strokedark text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4"
                      }`}
                  >
                    <MdChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectReportsDashboard;