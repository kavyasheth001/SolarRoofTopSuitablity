import React, { useState } from "react";
import axios from "axios";
import Select from "react-select";

const CardDataStats5 = ({ title, total, icon, showDetails }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [fetchedModalData, setFetchedModalData] = useState([]);
  const [totalWardCount,setTotalWardCount] = useState([]); 
  const [totalWards,setTotalWards] = useState([]); 

  const [loading, setLoading] = useState(false);
  
  const apiUrl = import.meta.env.VITE_BASE_URL;

  // Default filter option is All
  const options = [
    { value: "All", label: "All" },
    { value: "Industrial", label: "Industrial" },
    { value: "Commercial", label: "Commercial" },
    { value: "Land", label: "Land" },
  ];
  const [selectedOption, setSelectedOption] = useState(options[0]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(fetchedModalData.length / itemsPerPage);
  const paginatedData = fetchedModalData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch modal data with an optional option parameter
  const fetchModalData = async (option = selectedOption) => {
    setLoading(true);
    // Build payload with dynamic property filter if not "All"
    const payload = { ac23_heading: title };
    if (option.value !== "All") {
      if (option.value === "Industrial") payload.property = "I-Industrial";
      else if (option.value === "Commercial") payload.property = "C-Commercial";
      else if (option.value === "Land") payload.property = "L-Land";
    }
    try {
      const response = await axios.post(
        `${apiUrl}/api/property-details-filter`,
        payload
      );
      // Transform API data to the expected format
      const apiData = response.data.Data.map((item) => ({
        ward: item.ward,
        total: item.ward_count,
      }));
      setFetchedModalData(apiData);
      setTotalWardCount(response.data.totalWardCount);
      setTotalWards(response.data.totalWards)

    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
    setLoading(false);
  };

  const handleViewDetails = async () => {
    // Open the modal and reset pagination
    setIsModalOpen(true);
    setCurrentPage(1);
    // Fetch dynamic modal data based on default filter ("All")
    await fetchModalData();
  };

  const handlePropertyChange = async (option) => {
    // Update filter state and fetch data with new filter
    setSelectedOption(option);
    setCurrentPage(1);
    await fetchModalData(option);
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Card Container */}
      <div
        className="relative flex items-center justify-between rounded-xl border border-gray-300 bg-white py-6 px-8 shadow-lg
                   dark:border-strokedark dark:bg-boxdark transition duration-300 hover:shadow-xl"
      >
        {/* Icon Section (Left) */}
        <div
          className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full 
                          bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-3xl"
        >
          {icon}
        </div>

        {/* Text & Button Section (Right) */}
        <div className="text-right flex-1 ml-4">
          <h3
            className="text-lg font-semibold text-gray-800 dark:text-white leading-tight 
                     break-words whitespace-normal"
          >
            {title}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {total}
          </p>

          {/* View Details Button */}
          {showDetails && (
            <button
              className="mt-2 text-blue-600 hover:text-blue-700 font-semibold transition"
              onClick={handleViewDetails}
            >
              View Details
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 pt-11">
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-lg p-6 w-[90%] md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
              <h2 className="flex justify-between w-full text-xl font-bold text-gray-900 dark:text-white px-2">
                <span>
                    {title} ({totalWardCount})
                    </span>
                    Total Wards : {totalWards}
              </h2>

              <button
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                onClick={toggleModal}
              >
                ✖
              </button>
            </div>

            {/* React Select for Property Filter */}
            <div className="mt-4">
              <Select
                options={options}
                value={selectedOption}
                onChange={handlePropertyChange}
                isSearchable={false}
              />
            </div>

            {/* Modal Content - Data Table with Pagination */}
            <div className="mt-4 overflow-x-auto">
              {loading ? (
                <p>Loading data...</p>
              ) : (
                <table className="w-full border border-stroke dark:border-gray-700">
                  <thead className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <tr>
                      <th className="p-3 text-left">Ward Name</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300">
                    {paginatedData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-300 dark:border-gray-700"
                      >
                        <td className="p-3">{row.ward}</td>
                        <td className="p-3 text-right">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && fetchedModalData.length > 0 && (
              <div className="mt-4 flex justify-between items-center">
                <button
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? "bg-gray-300 cursor-not-allowed dark:bg-gray-700"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="text-gray-900 dark:text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? "bg-gray-300 cursor-not-allowed dark:bg-gray-700"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}

            {/* Close Button
            <div className="mt-4 flex justify-end">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                onClick={toggleModal}
              >
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}
    </>
  );
};

export default CardDataStats5;
