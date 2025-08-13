import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, bootstrapped } = useAuth();
  if (!bootstrapped) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}


