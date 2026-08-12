import React, { useState } from "react";

const CardDataStats = ({ title, total, icon, showDetails, modalData }) => {
  return (
    <>
      {/* Card Container */}
      <div className="relative flex items-center justify-between rounded-xl border border-blue-300 bg-white py-6 px-8 shadow-lg dark:border-strokedark dark:bg-boxdark transition duration-300 hover:shadow-xl">
        
        {/* Icon Section (Left) */}
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-3xl">
          {icon}
        </div>

        {/* Text & Button Section (Right) */}
        <div className="text-right flex-1 ml-4">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-white leading-tight break-words whitespace-normal">
            {title.replace(/\./g, ".\u200B").replace(/\+/g, "+\u200B").replace(/\(/g, "(\u200B").replace(/\)/g, ")\u200B")}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{total}</p>

          {/* View Details Button (removed as requested) */}
        </div>
      </div>
    </>
  );
};

export default CardDataStats;
