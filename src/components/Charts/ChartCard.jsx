import React from 'react';

const ChartCard = ({ title, total, children }) => {
  return (
    <div className="px-5 py-7.5 rounded-sm border border-gray-300 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-xl font-semibold text-gray-800 dark:text-white">
          {title} <span className="ml-2 text-base">– Total: {total}</span>
        </h5>
      </div>
      <div className="flex justify-center">{children}</div>
    </div>
  );
};

export default ChartCard;
