// src/components/EnhancedToolbar.js
import React from 'react';
import { useToolbar } from '../../context/ToolbarContext';

export const EnhancedToolbar = ({ children }) => {
  const { shouldShiftToolbar } = useToolbar();

  return (
    <div 
      style={{
        position: 'relative',
        left: shouldShiftToolbar ? '-320px' : '0px',
        transition: 'left 0.3s ease',
        zIndex: 9876
      }}
    >
     {children}
    </div>
  );
};

//This is working for now 
