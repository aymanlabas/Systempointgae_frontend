import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Punch from './pages/Punch';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import Scanner from './pages/Scanner';
import Departments from './pages/Departments';
import Teams from './pages/Teams';
import Leaves from './pages/Leaves';
import Schedules from './pages/Schedules';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

function AppLayout({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app-layout">
      {currentUser && !isLoginPage && <Sidebar />}
      <div className="app-main">
        <ThemeToggle />
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <AppLayout>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Admin Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute requiredRole="admin"><Employees /></ProtectedRoute>
              } />
              <Route path="/departments" element={
                <ProtectedRoute requiredRole="admin"><Departments /></ProtectedRoute>
              } />
              <Route path="/teams" element={
                <ProtectedRoute requiredRole="admin"><Teams /></ProtectedRoute>
              } />
              <Route path="/schedules" element={
                <ProtectedRoute requiredRole="admin"><Schedules /></ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>
              } />

              {/* Shared Routes (admin + employee) */}
              <Route path="/leaves" element={
                <ProtectedRoute><Leaves /></ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute><Notifications /></ProtectedRoute>
              } />
              <Route path="/punch" element={
                <ProtectedRoute><Punch /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/scanner" element={
                <ProtectedRoute><Scanner /></ProtectedRoute>
              } />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/punch" replace />} />
              <Route path="*" element={<Navigate to="/punch" replace />} />
            </Routes>
          </AppLayout>
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
