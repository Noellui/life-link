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

function App() {
  // --- AUTH STATE MANAGEMENT ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('lifeLinkUser'); 
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // --- LOGIN HANDLER ---
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('lifeLinkUser', JSON.stringify(userData));
  };

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    setUser(null); 
    localStorage.removeItem('lifeLinkUser'); 
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* Navbar handles its own visibility based on user role */}
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
            element={user?.role === 'Hospital' ? <HospitalDashboard user={user} /> : <Navigate to="/login" />} 
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
          <Route path="/patient-requests" element={<PatientRequests />} />
          <Route path="/manage-stock" element={<StockManagement />} />
          <Route path="/hospital/events" element={<HospitalEvents />} /> 
          <Route path="/hospital/appointments" element={<HospitalAppointments />} /> 
          
          {/* --- FALLBACK --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;