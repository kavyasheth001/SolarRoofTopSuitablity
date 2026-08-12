const AnalysisModeToggle = ({
  analysisMode,
  onAnalysisModeChange,
  className,
  style,
  isLoading,
}) => {
  const getButtonClasses = (mode) => {
    const isActive = analysisMode === mode
    return `
      flex-1 px-3 py-2.5 border rounded text-sm transition-all duration-200 ease-in-out
      ${isActive 
        ? 'bg-primary-blue text-white border-primary-blue font-semibold' 
        : 'bg-white text-primary-black border-gray-300 font-normal hover:bg-secondary-blue/10 hover:border-secondary-blue/30'
      }
      ${isLoading 
        ? 'cursor-not-allowed opacity-60' 
        : 'cursor-pointer'
      }
    `.trim().replace(/\s+/g, ' ')
  }

  return (
    <div className={`mb-3 ${className || ''}`} style={style}>
      <label className="block font-semibold mb-1.5 text-primary-blue">
        Analysis Mode:
      </label>
      <div className="flex gap-1">
        <button
          onClick={() => onAnalysisModeChange('ward')}
          className={getButtonClasses('ward')}
          type="button"
          disabled={isLoading}
        >
          Ward Analysis
        </button>
        <button
          onClick={() => onAnalysisModeChange('buffer')}
          className={getButtonClasses('buffer')}
          type="button"
          disabled={isLoading}
        >
          Buffer Analysis
        </button>
      </div>
    </div>
  )
}
export default AnalysisModeToggle;