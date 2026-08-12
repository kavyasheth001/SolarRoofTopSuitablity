import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MdOutlineCreateNewFolder, MdClose } from "react-icons/md";
import { TfiAngleLeft, TfiAngleRight } from "react-icons/tfi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BeatLoader } from "react-spinners";

const TableFive = () => {
  const navigate = useNavigate();
  // Static project data
  const [projects, setProjects] = useState([
    { id: 1, name: "Urban Development Project" },
    { id: 2, name: "Highway Construction" },
    { id: 3, name: "Water Resource Management" },
    { id: 4, name: "Smart City Initiative" },
    { id: 5, name: "Green Energy Implementation" },
    { id: 6, name: "Public Transport Upgrade" },
    { id: 7, name: "Residential Zone Planning" },
    { id: 8, name: "Industrial Area Development" },
  ]);

  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // Search query for filtering
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Helper function to detect dark mode
  const isDarkMode = () => document.documentElement.classList.contains("dark");

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProjects.length / pagination.itemsPerPage);
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const paginatedProjects = filteredProjects.slice(
    startIndex,
    startIndex + pagination.itemsPerPage
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };
  
  // Handling search input change
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when searching
  };

  // Handling entries per page change
  const handleEntriesChange = (event) => {
    setPagination((prev) => ({
      ...prev,
      itemsPerPage: parseInt(event.target.value, 10),
      currentPage: 1, // Reset to first page when changing entries
    }));
  };

  // Handle creating a new project
  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
      const projectToAdd = { id: newId, name: newProject.name.trim() };
      
      setProjects([...projects, projectToAdd]);
      resetForm();
      toast.success("Project created successfully!");
      setIsLoading(false);
      
      // Navigate to map after successful creation
      navigate("/proposed-layer");
    }, 500);
  };

  // Reset form and close modal
  const resetForm = () => {
    setNewProject({ name: "" });
    setModalOpen(false);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <ToastContainer />
      {isLoading ? (
        <div className="flex justify-center items-center">
          <BeatLoader color={isDarkMode() ? "#2563eb" : "#2563eb"} />
        </div>
      ) : (
        <>
          {/* Breadcrumb + Create Button */}
          <div className="flex flex-wrap justify-between items-center mb-4">
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
                  Projects
                </li>
              </ol>
            </nav>
            <div className="flex space-x-4">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center"
              >
                <MdOutlineCreateNewFolder className="inline-block mr-2" />
                Create Project
              </button>
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-gray-800 dark:text-gray-200">Show</span>
              <select
                className="mx-2 border rounded px-2 py-1 text-gray-800 dark:text-gray-200 dark:bg-boxdark"
                value={pagination.itemsPerPage}
                onChange={handleEntriesChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-800 dark:text-gray-200">entries</span>
            </div>
            <input
              type="text"
              placeholder="Search"
              className="border rounded px-2 py-1 text-gray-800 dark:text-gray-200 dark:bg-boxdark"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          {/* Projects Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left" style={{ width: '50%' }}>SR No</th>
                  <th className="px-6 py-4 text-left"style={{ width: '50%' }}>Project Name</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project, index) => (
                  <tr
                    key={project.id}
                    className="border-b border-stroke dark:border-gray-600"
                  >
                    <td className="py-5 px-6">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-5 px-6">
                      <span 
                        className="text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 font-medium "
                        onClick={() => navigate("/proposed-layer", { state: { selectedProject: project } })}
                      >
                        {project.name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination flex justify-end items-center mt-4 gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md ${
                pagination.currentPage === 1 ? "invisible" : "visible"
              }`}
            >
              <TfiAngleLeft size={22} className="mr-1" />
              Previous
            </button>
            <span className="pagination-info text-gray-800 font-bold dark:text-gray-200">
              Page {pagination.currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              className={`pagination-btn flex items-center text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md ${
                pagination.currentPage === totalPages ? "invisible" : "visible"
              }`}
            >
              Next
              <TfiAngleRight size={22} className="ml-1" />
            </button>
          </div>
        </>
      )}

      {/* Modal for Create Project */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dark:bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg shadow-lg p-8 w-full max-w-md">
            <MdClose
              className="absolute top-4 right-4 cursor-pointer text-gray-600 dark:text-gray-200"
              onClick={resetForm}
              size={24}
            />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
              Create Project
            </h2>

            {/* Input */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Project Name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableFive;