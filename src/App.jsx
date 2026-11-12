import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientDetail from './pages/PatientDetail';
import PreAmbulationAssessment from './pages/PreAmbulationAssessment';
import AmbulationRecord from './pages/AmbulationRecord';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import RegisterNurse from './pages/RegisterNurse';
import PatientList from './pages/PatientList';
import ChecklistAdmin from './pages/ChecklistAdmin';
import AuditLog from './pages/AuditLog';
import { notificationAPI } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Main App Content
const AppContent = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const prevCountRef = useRef(null);
  const { isAuthenticated } = useAuth();

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // 4 seconds
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationAPI.getUnreadCount();
      const newCount = data.count || 0;
      
      if (prevCountRef.current !== null && newCount > prevCountRef.current) {
        showToast("🔔 มีการแจ้งเตือนใหม่", "warning");
        // แจ้งเตือนของเบราว์เซอร์ (ถ้าอนุญาตไว้ในหน้าตั้งค่า)
        if ('Notification' in window && Notification.permission === 'granted') {
          notificationAPI.getAll().then((list) => {
            const latest = list.find((n) => !n.isRead);
            if (latest) new Notification('SARA', { body: latest.message, tag: latest.id });
          }).catch(() => {});
        }
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
        audio.play().catch(() => {}); // catch autoplay restrictions
      }
      
      prevCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch {
      // Silently fail
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    fetchUnreadCount();
    if (isAuthenticated) {
      const interval = setInterval(fetchUnreadCount, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCount, isAuthenticated]);



  const getToastIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <>
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className="toast-icon">{getToastIcon(toast.type)}</span>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register-nurse" element={<RegisterNurse />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute><PatientRegistration showToast={showToast} /></ProtectedRoute>} />
          <Route path="/patient/:id" element={<ProtectedRoute><PatientDetail showToast={showToast} /></ProtectedRoute>} />
          <Route path="/patient/:id/edit" element={<ProtectedRoute><PatientRegistration showToast={showToast} /></ProtectedRoute>} />
          <Route path="/task/:taskId/assessment" element={<ProtectedRoute><PreAmbulationAssessment showToast={showToast} /></ProtectedRoute>} />
          <Route path="/task/:taskId/ambulation" element={<ProtectedRoute><AmbulationRecord showToast={showToast} /></ProtectedRoute>} />
          <Route path="/checklist-admin" element={<ProtectedRoute><ChecklistAdmin showToast={showToast} /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications showToast={showToast} /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </div>

      {isAuthenticated && <BottomNav unreadCount={unreadCount} />}
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
