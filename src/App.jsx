import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Component Imports
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';

// Dashboard Imports
import DonorDashboard from './pages/DonorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Feature Page Imports
import DonationCamps from './pages/DonationCamps';

import DonorHistory from './pages/DonorHistory';
import ScheduleAppointment from './pages/ScheduleAppointment';
import DonorProfile from './pages/DonorProfile';
import RequestBlood from './pages/RequestBlood';
import PatientRequests from './pages/PatientRequests';
import StockManagement from './pages/StockManagement';
import MyRequests from './pages/MyRequests';
import HospitalEvents from './pages/HospitalEvents';
import HospitalAppointments from './pages/HospitalAppointments';
import MyBills from './pages/MyBills';
import RecipientProfile from './pages/RecipientProfile';
import HospitalProfile from './pages/HospitalProfile';
import FinanceReport from './pages/FinanceReport';

const BASE_URL = 'http://127.0.0.1:8000';


// ✅ Single key used everywhere for localStorage
export const USER_STORAGE_KEY = 'lifeLinkUser';

function App() {
  // --- AUTH STATE MANAGEMENT ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // --- LOGIN HANDLER — single source of truth for localStorage ---
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  };

  // --- LOGOUT HANDLER — clears both keys in case of legacy user_data key ---
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('user_data'); // clean up legacy key
  };

  // --- REFRESH SUBSCRIPTION STATUS FOR HOSPITALS ---
  React.useEffect(() => {
    if (user?.role === 'Hospital' && user?.email) {
      fetch(`${BASE_URL}/api/hospital/id/?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.subscriptionStatus && data.subscriptionStatus !== user.subscriptionStatus) {
            const updatedUser = { ...user, subscriptionStatus: data.subscriptionStatus };
            setUser(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
          }
        })
        .catch(err => console.error("Sub check failed:", err));
    }
  }, [user?.email, user?.role, user?.subscriptionStatus]);

  // --- ROUTE GUARDS ---
  const HospitalRoute = ({ children }) => {
    if (user?.role !== 'Hospital') return <Navigate to="/login" />;
    // If not active, only allow profile (where subscription tab lives)
    if (user.subscriptionStatus !== 'Active') {
      return <Navigate to="/hospital-profile" />;
    }
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        <Navbar user={user} onLogout={handleLogout} />

        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />

          {/* --- PROTECTED DASHBOARDS --- */}
          <Route
            path="/dashboard/admin"
            element={user?.role === 'Admin' ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/donor"
            element={user?.role === 'Donor' ? <DonorDashboard user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/hospital"
            element={<HospitalRoute><HospitalDashboard user={user} /></HospitalRoute>}
          />
          <Route
            path="/dashboard/recipient"
            element={user?.role === 'Recipient' ? <RecipientDashboard user={user} /> : <Navigate to="/login" />}
          />

          {/* --- RECIPIENT FEATURES --- */}
          <Route path="/request-blood" element={<RequestBlood />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/my-bills" element={<MyBills />} />
          <Route path="/recipient-profile" element={<RecipientProfile />} />

          {/* --- DONOR FEATURES --- */}
          <Route path="/DonationCamps" element={<DonationCamps />} />
          <Route path="/history" element={<DonorHistory />} />
          <Route path="/schedule" element={<ScheduleAppointment />} />
          <Route path="/profile" element={<DonorProfile />} />

          {/* --- HOSPITAL FEATURES --- */}
          <Route path="/patient-requests" element={<HospitalRoute><PatientRequests /></HospitalRoute>} />
          <Route path="/manage-stock" element={<HospitalRoute><StockManagement /></HospitalRoute>} />
          <Route path="/hospital/events" element={<HospitalRoute><HospitalEvents /></HospitalRoute>} />
          <Route path="/hospital/appointments" element={<HospitalRoute><HospitalAppointments /></HospitalRoute>} />
          <Route path="/hospital-profile" element={user?.role === 'Hospital' ? <HospitalProfile /> : <Navigate to="/login" />} />

          <Route path="/admin/report/finance" element={<FinanceReport />} />

          {/* --- FALLBACK --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;