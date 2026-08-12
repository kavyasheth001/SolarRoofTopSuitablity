import React from 'react';

const ExportButton = ({
  onClick,
  enabled = true,
  isLoading = false,
  label = 'Download',
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={!enabled || isLoading}
      className={`
        flex-1 px-3 py-1.5 rounded-md border-0 font-semibold whitespace-nowrap text-[13px] text-white
        ${enabled && !isLoading
          ? 'bg-primary-blue cursor-pointer hover:bg-secondary-navy'
          : 'bg-disabled cursor-not-allowed'
        }
        transition-colors duration-200
        ${className}
      `}
    >
      {label}
    </button>
  );
};

export default ExportButton;
