// Switch.jsx
import React from "react";
import styled from "styled-components";

/**
 * A reusable toggle switch using your custom CSS with styled-components.
 * Takes 3 props:
 *  - id: a unique string for label + input 
 *  - isChecked: boolean controlling whether the switch is on/off
 *  - onChange: callback for toggling the checked state
 */
const Switch = ({ id, isChecked, onChange }) => {
  return (
    <StyledWrapper>
      <div>
        <input
          type="checkbox"
          id={id}
          checked={isChecked}
          onChange={onChange}
        />
        <label htmlFor={id} className="toggleSwitch"></label>
      </div>
    </StyledWrapper>
  );
};

export default Switch;

/* Styled Components CSS */
const StyledWrapper = styled.div`
  /* Hide the checkbox visually */
  input[type="checkbox"] {
    display: none;
  }

  .toggleSwitch {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 50px;
    height: 30px;
    background-color: rgb(82, 82, 82);
    border-radius: 20px;
    cursor: pointer;
    transition-duration: 0.2s;
  }

  .toggleSwitch::after {
    content: "";
    position: absolute;
    height: 20px;
    width: 20px;
    left: 5px;
    background-color: transparent;
    border-radius: 50%;
    transition-duration: 0.2s;
    box-shadow: 5px 2px 7px rgba(8, 8, 8, 0.26);
    border: 5px solid white;
  }

  /* Slide the knob + recolor the background when checked */
  input[type="checkbox"]:checked + .toggleSwitch {
    background-color: rgb(148, 118, 255);
  }
  input[type="checkbox"]:checked + .toggleSwitch::after {
    transform: translateX(100%);
    background-color: white;
  }
`;
