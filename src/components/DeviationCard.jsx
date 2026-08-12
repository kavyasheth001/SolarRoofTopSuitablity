"use client"

import { useState, memo } from "react"

const DeviationCard = memo(({
  feature,
  index,
  totalCount,
  leftColumnLabel = "Left Column",
  rightColumnLabel = "Right Column",
  leftColumnField = "left_field",
  rightColumnField = "right_field",
  criteriaLabel = "Criteria",
  additionalColumn = [],
  onCardClick,
  currentIndex,
  onAddressToggle,
}) => {
  const attributes = feature.attributes

  const [showAddress, setShowAddress] = useState(false)

  const toggleAddress = () => {
    const newShowAddress = !showAddress
    setShowAddress(newShowAddress)

    // Notify parent component about the toggle with a slight delay
    if (onAddressToggle) {
      setTimeout(() => onAddressToggle(newShowAddress), 50)
    }
  }

  const headerStyle = {
    backgroundColor: "#008eff",
    color: "white",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: "600",
    borderRadius: "8px 8px 0 0",
  }

  const activeCardStyle =
    index === currentIndex
      ? {
        boxShadow: "0 4px 20px rgba(22, 119, 255, 0.3)",
        transform: "translateY(-1px)",
        borderColor: "#008eff",
        borderWidth: "2px",
        borderStyle: "solid",
      }
      : {}

  const contentStyle = {
    padding: "12px",
  }

  const fieldRowStyle = {
    marginBottom: "8px",
    fontSize: "12px",
    lineHeight: "1.4",
  }

  const labelStyle = {
    fontWeight: "600",
    color: "#495057",
  }

  const valueStyle = {
    color: "#6c757d",
  }

  const criteriaTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "12px",
  }

  const criteriaCellStyle = {
    padding: "6px 8px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "600",
  }

  const leftCellStyle = {
    ...criteriaCellStyle,
    backgroundColor: "#f5f9ff",
    border: "1px solid #e0e0e0",
  }

  const rightCellStyle = {
    ...criteriaCellStyle,
    backgroundColor: "#f5f9ff",
    border: "1px solid #e0e0e0",
  }

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(feature)
    }
  }

  // Memoized value formatting
  const formatValue = (value) => {
    if (typeof value === "number") {
      return value.toFixed(2)
    }
    return value || "N/A"
  }

  return (
    <div
      style={{
        ...activeCardStyle,
        borderRadius: "8px",
        backgroundColor: "#f8f9fa",
        cursor: onCardClick ? "pointer" : "default",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "260px", // Fixed height for virtualization
        display: "flex",
        flexDirection: "column",
      }}
      onClick={handleClick}
    >
      {/* Header */}
      <div style={headerStyle}>
        Result {index + 1} of {totalCount.toLocaleString()}
      </div>

      {/* Content */}
      <div style={{ ...contentStyle, flex: 1, overflow: "hidden" }}>
        {/* Name and Ward */}
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Name: </span>
          <span style={valueStyle}>{attributes.name || "N/A"}</span>
          <span style={{ float: "right" }}>
            <span style={labelStyle}>Ward: </span>
            <span style={valueStyle}>{attributes.ward_no || "N/A"}</span>
          </span>
        </div>

        {/* SAC Number */}
        <div style={fieldRowStyle}>
          <span style={labelStyle}>SAC Number: </span>
          <span style={valueStyle}>{attributes.SAC_number || attributes.SACNO || "N/A"}</span>
        </div>

        {/* Conditional fields with null checks */}
        {attributes.residential && (
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Residential: </span>
            <span style={valueStyle}>{attributes.residential}</span>
          </div>
        )}

        {attributes.totalunit && (
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Total Unit: </span>
            <span style={valueStyle}>{attributes.total_unit}</span>
          </div>
        )}

        {attributes.commercial && (
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Commercial: </span>
            <span style={valueStyle}>{attributes.commercial}</span>
          </div>
        )}

        {/* Address with Toggle */}
        <div
          style={{ 
            ...fieldRowStyle, 
            cursor: "pointer",
            maxHeight: showAddress ? "none" : "20px",
            overflow: "hidden"
          }}
          onClick={(e) => {
            e.stopPropagation()
            toggleAddress()
          }}
          title={showAddress ? "Click to hide address" : "Click to show address"}
        >
          <span style={labelStyle}>Address: </span>
          <span style={valueStyle}>
            {showAddress
              ? attributes.address || "N/A"
              : "View more..."}
          </span>
        </div>

        {/* Area */}
        {attributes.Area_sq_m && (
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Area: </span>
            <span style={valueStyle}>{formatValue(attributes.Area_sq_m)} sq.m</span>
          </div>
        )}

        {/* Dynamic Additional Fields */}
        {additionalColumn && additionalColumn.map((column, idx) => (
          attributes[column.field] && (
            <div key={idx} style={fieldRowStyle}>
              <span style={labelStyle}>{column.label}: </span>
              <span style={valueStyle}>{formatValue(attributes[column.field])}</span>
            </div>
          )
        ))}

        {/* Criteria Table */}
        <table style={criteriaTableStyle}>
          <thead>
            <tr>
              <th style={{
                ...criteriaCellStyle,
                backgroundColor: "#17a2b8",
                color: "white",
                border: "1px solid #17a2b8"
              }}>
                {criteriaLabel}
              </th>
              <th style={{
                ...criteriaCellStyle,
                backgroundColor: "#17a2b8",
                color: "white",
                border: "1px solid #17a2b8"
              }}>
                {leftColumnLabel === "Area 2018" ? `${leftColumnLabel} (Sq. m):` : leftColumnLabel}
              </th>
              <th style={{
                ...criteriaCellStyle,
                backgroundColor: "#17a2b8",
                color: "white",
                border: "1px solid #17a2b8"
              }}>
                {rightColumnLabel === "Area 2024" ? `${rightColumnLabel} (Sq. m):` : rightColumnLabel}
              </th>
              {/* Dynamic additional column headers */}
              {additionalColumn && additionalColumn.map((column, idx) => (
                <th key={idx} style={{
                  ...criteriaCellStyle,
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "1px solid #17a2b8"
                }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={leftCellStyle}>{criteriaLabel}</td>
              <td style={leftCellStyle}>
                {formatValue(attributes[leftColumnField])}
              </td>
              <td style={rightCellStyle}>
                {formatValue(attributes[rightColumnField])}
              </td>
              {/* Dynamic additional column data */}
              {additionalColumn && additionalColumn.map((column, idx) => (
                <td key={idx} style={rightCellStyle}>
                  {formatValue(attributes[column.field])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})

// Add display name for debugging
DeviationCard.displayName = 'DeviationCard'

export default DeviationCard