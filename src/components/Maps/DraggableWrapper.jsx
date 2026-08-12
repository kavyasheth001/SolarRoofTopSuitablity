// Debug version of DraggableWrapper to troubleshoot the issue
import React, { useEffect, useRef } from 'react';
import { useToolbar } from '../../context/ToolbarContext';

export const DraggableWrapper = ({ 
  children, 
  componentId, 
  onDragStart,
  onDragEnd,
  onMouseMove,
  debug = false, // Enable debug mode
  ...props 
}) => {
  const { registerComponent, unregisterComponent, markComponentAsDragged, shouldShiftToolbar } = useToolbar();
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const elementRef = useRef(null);

  const log = (message) => {
    if (debug) {
      console.log(`[DraggableWrapper ${componentId}] ${message}`);
    }
  };

  useEffect(() => {
    log('Component mounted, registering...');
    registerComponent(componentId);
    hasDraggedRef.current = false;

    return () => {
      log('Component unmounting, unregistering...');
      unregisterComponent(componentId);
    };
  }, [componentId]);

  // Alternative approach: Use a capturing phase listener on the wrapper element
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseDownCapture = (e) => {
      log('Mouse down captured');
      isDraggingRef.current = true;
      mouseStartPos.current = { x: e.clientX, y: e.clientY };
    };

    // Add listener in capture phase to intercept before child components
    element.addEventListener('mousedown', handleMouseDownCapture, true);

    return () => {
      element.removeEventListener('mousedown', handleMouseDownCapture, true);
    };
  }, []);

  // Global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDraggingRef.current) {
        const dx = Math.abs(e.clientX - mouseStartPos.current.x);
        const dy = Math.abs(e.clientY - mouseStartPos.current.y);
        
        if (!hasDraggedRef.current && (dx > 5 || dy > 5)) {
          hasDraggedRef.current = true;
          log(`Drag detected! Movement: ${dx}px, ${dy}px. Marking as dragged...`);
          markComponentAsDragged(componentId);
          log(`Toolbar should shift: ${shouldShiftToolbar}`);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        log('Mouse up detected, ending drag');
        isDraggingRef.current = false;
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [componentId, markComponentAsDragged]);

  // Log toolbar state periodically during debug
  useEffect(() => {
    if (debug) {
      const interval = setInterval(() => {
        log(`Current state - isDragging: ${isDraggingRef.current}, hasDragged: ${hasDraggedRef.current}, shouldShift: ${shouldShiftToolbar}`);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [shouldShiftToolbar]);

  const handleMouseDown = (e) => {
    log('handleMouseDown called');
    isDraggingRef.current = true;
    mouseStartPos.current = { x: e.clientX, y: e.clientY };
    
    const childElement = React.Children.only(children);
    if (childElement.props.onMouseDown) {
      childElement.props.onMouseDown(e);
    }
    
    if (onDragStart) {
      onDragStart(e);
    }
  };

  const handleMouseMove = (e) => {
    const childElement = React.Children.only(children);
    if (childElement.props.onMouseMove) {
      childElement.props.onMouseMove(e);
    }
    
    if (onMouseMove) {
      onMouseMove(e);
    }
  };

  const handleMouseUp = (e) => {
    log('handleMouseUp called');
    const childElement = React.Children.only(children);
    if (childElement.props.onMouseUp) {
      childElement.props.onMouseUp(e);
    }
    
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  // Wrap in a div to ensure we can capture events
  return (
    <div 
      ref={elementRef} 
      style={{ display: 'contents' }}
      data-draggable-wrapper={componentId}
    >
      {React.cloneElement(React.Children.only(children), {
        ...props,
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
      })}
    </div>
  );
};

// Alternative approach if the above doesn't work:
// This version uses MutationObserver to detect position changes
export const DraggableWrapperAlternative = ({ children, componentId }) => {
  const { registerComponent, unregisterComponent, markComponentAsDragged } = useToolbar();
  const childRef = useRef(null);
  const lastPosition = useRef(null);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    registerComponent(componentId);
    hasMovedRef.current = false;

    return () => {
      unregisterComponent(componentId);
    };
  }, [componentId]);

  useEffect(() => {
    if (!childRef.current) return;

    // Create a MutationObserver to watch for style changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const element = mutation.target;
          const currentLeft = element.style.left;
          const currentTop = element.style.top;

          if (lastPosition.current) {
            if (currentLeft !== lastPosition.current.left || 
                currentTop !== lastPosition.current.top) {
              if (!hasMovedRef.current) {
                console.log(`[Alternative Wrapper ${componentId}] Movement detected via MutationObserver`);
                hasMovedRef.current = true;
                markComponentAsDragged(componentId);
              }
            }
          }

          lastPosition.current = { left: currentLeft, top: currentTop };
        }
      });
    });

    // Start observing
    observer.observe(childRef.current, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => {
      observer.disconnect();
    };
  }, [componentId, markComponentAsDragged]);

  return React.cloneElement(React.Children.only(children), {
    ref: childRef
  });
};


//This is working for now 