// src/Routes/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children, requiredRole, requiredDepartment }) => {
  const { auth } = useAuth();

  const userObj = JSON.parse(auth.user || "{}");
  const userDepartment = userObj?.department?.toLowerCase();
  const userRole = userObj?.role;
  // Check if user is authenticated before rendering protected route
  if (!auth.isAuthenticated) {
    return <Navigate to="/" />;
  }

  // if (userRole === "Super Admin") {
  //   return children;
  // }

  // if (requiredRole && userRole !== requiredRole) {
  //   return <Navigate to="/" />;
  // }
  
  // if (requiredDepartment && userDepartment !== requiredDepartment.toLowerCase()) {
  //   return <Navigate to="/" />;
  // }

  return children;
};

export default ProtectedRoute;
