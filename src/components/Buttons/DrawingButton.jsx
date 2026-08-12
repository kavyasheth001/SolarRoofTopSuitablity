import React from "react";

const DrawingButton = ({
  type,
  icon,
  title,
  selectedTool,
  onStart,
  onCancel,
}) => {
  const isSelected = selectedTool === type;

  return (
    <button
      onClick={() => (isSelected ? onCancel(type) : onStart(type))}
      title={title}
      className={`
        flex-1 py-2 text-lg rounded-md transition-colors duration-200
        ${isSelected 
          ? "bg-primary-blue border border-blue-500 text-white" 
          : "bg-gray-100 border border-gray-300 hover:bg-gray-200"}
      `}
    >
      {icon}
    </button>
  );
};

export default DrawingButton;
