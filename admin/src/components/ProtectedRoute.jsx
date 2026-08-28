import React from 'react';
import { Navigate } from 'react-router-dom';

// Guards admin-only pages. Redirects to /login if there's no token, or if
// the cached user isn't an admin (defence-in-depth — the backend also
// rejects non-admin tokens on every mutating request).
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('adminUser') || 'null');
  } catch {
    user = null;
  }

  if (!token || !user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
