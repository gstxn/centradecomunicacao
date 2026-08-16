import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { PermissionKey } from '../../services/api';

export const ProtectedRoute: React.FC<{ requiredPermission?: PermissionKey }> = ({ requiredPermission }) => {
  const { user, activeCompany } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (requiredPermission && !activeCompany?.membership?.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};
