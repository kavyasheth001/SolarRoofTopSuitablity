const Selection = ({
  selectedOption,
  onOptionChange,
  Options = [],
  label = "Select Option:",
  placeholder = "Select an Option...",
  disabled = false,
}) => {
  return (
    <div className="mb-3">
      <label className="block font-semibold mb-1 text-primary-blue">
        {label}
      </label>
      <select
        value={selectedOption}
        onChange={(e) => onOptionChange(e.target.value)}
        disabled={disabled || Options.length === 0}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm
          focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
          transition duration-150
        `}
      >
        <option value="">{placeholder}</option>
        {Options.map((Option, index) => (
          <option key={index} value={Option}>
            {Option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Selection;
