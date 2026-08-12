// ActionButton.jsx
const ActionButton = ({
  onClick,
  disabled = false,
  label,
  icon = null,
  title = '',
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
      flex 
        flex-1 px-2.5 py-2 rounded-md font-semibold text-[13px] transition-all duration-200 ease-in-out justify-center gap-x-1 items-center
        ${
          disabled
            ? 'bg-disabled cursor-not-allowed text-white'
            : 'bg-primary-blue hover:bg-secondary-navy cursor-pointer text-white'
        }
        ${className}
      `}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  );
};

export default ActionButton;
