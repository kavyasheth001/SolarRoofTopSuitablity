import React, { useState } from "react";

const CardDataStats = ({ title, total, icon, showDetails, modalData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(modalData.length / itemsPerPage);
  const paginatedData = modalData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Card Container */}
      <div className="relative flex items-center justify-between rounded-xl border border-gray-300 bg-white py-6 px-8 shadow-lg
                      dark:border-strokedark dark:bg-boxdark transition duration-300 hover:shadow-xl">
        
        {/* Icon Section (Left) */}
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full 
                        bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-3xl">
          {icon}
        </div>

        {/* Text & Button Section (Right) */}
        <div className="text-right flex-1 ml-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white leading-tight 
               break-words whitespace-normal">
  {title.replace(/\./g, ".\u200B").replace(/\+/g, "+\u200B").replace(/\(/g, "(\u200B").replace(/\)/g, ")\u200B")}
</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{total}</p>

          {/* View Details Button */}
          {showDetails && (
            <button 
              className="mt-2 text-blue-600 hover:text-blue-700 font-semibold transition"
              onClick={toggleModal}
            >
              View Details
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-boxdark rounded-lg shadow-lg p-6 w-[90%] md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {title} ({total})
              </h2>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                onClick={toggleModal}
              >
                ✖
              </button>
            </div>

            {/* Modal Content - Data Table with Pagination */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border border-stroke dark:border-gray-700">
                <thead className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <tr>
                    <th className="p-3 text-left">Ward Name</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  {paginatedData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-300 dark:border-gray-700">
                      <td className="p-3">{row.ward}</td>
                      <td className="p-3 text-right">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center">
              <button
                className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed dark:bg-gray-700" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span className="text-gray-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed dark:bg-gray-700" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>

            {/* Close Button */}
            <div className="mt-4 flex justify-end">
              <button 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                onClick={toggleModal}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default CardDataStats;
