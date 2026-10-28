import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ForcedPasswordChangeModal from './components/ForcedPasswordChangeModal';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RequestAccessPage from './pages/RequestAccessPage';
import ParentPortal from './pages/ParentPortal';
import StaffPortal from './pages/StaffPortal';
import AdminPortal from './pages/AdminPortal';
import CertificateVerificationPage from './pages/CertificateVerificationPage';
import SchedulePage from './pages/SchedulePage';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: '250px', height: '40px' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's assigned dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/parent" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <ForcedPasswordChangeModal />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/request-access" element={<RequestAccessPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/verify" element={<CertificateVerificationPage />} />

          {/* Role-Protected Portals */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <StaffPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
