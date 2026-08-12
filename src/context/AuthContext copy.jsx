import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // const [auth, setAuth] = useState({
  //   token: localStorage.getItem("token"),
  //   isAuthenticated: !!localStorage.getItem("token"),
  // });

  const decodeToken = (token) => {
    try {
      const base64Payload = token.split(".")[1]; // Get payload part
      const payload = atob(base64Payload);       // Decode base64
      return JSON.parse(payload);                // Parse JSON
    } catch (e) {
      return null;
    }
  };


 // Initialize state with values from localStorage
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = token ? JSON.stringify(decodeToken(token)) : null;
    return {
      token,
      user,
      isAuthenticated: !!token,
    };
  });

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = token ? JSON.stringify(decodeToken(token)) : null;
    // console.log("User", user);
    setAuth({
      token,
      user,
      isAuthenticated: !!token
    });
  }, []);



  const login = (token) => {
    localStorage.setItem("token", token);
    const user = JSON.stringify(decodeToken(token));
    
    localStorage.setItem("user", user);
    setAuth({ token, user, isAuthenticated: true });
    
    // Redirect to the intended page or default to map
    const from = location.state?.from || "/map";
    navigate(from, { replace: true });
  };  
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null, isAuthenticated: false });
    navigate("/", { state: { message: "Successfully logged out!" } });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);