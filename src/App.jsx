import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import DonorDashboard from './pages/DonorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DonationCamps from './pages/DonationCamps';
import DonorHistory from './pages/DonorHistory';
import ScheduleAppointment from './pages/ScheduleAppointment';
import DonorProfile from './pages/DonorProfile'

function App() {
  // State to track if user is logged in
  // We check localStorage first so the user stays logged in if they refresh the page
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Function to handle login (we pass this to Login.jsx)
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Function to handle logout (we pass this to Navbar.jsx)
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Pass user and logout function to Navbar */}
        <Navbar user={user} onLogout={handleLogout} />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          
          {/* Pass handleLogin to the Login page so it can update the state */}
          <Route path="/login" element={<Login onLogin={handleLogin} />} />

          {/* Private Dashboard Routes */}
          {/* We can protect these routes later, for now let's keep them open */}
          <Route path="/dashboard/donor" element={<DonorDashboard />} />
          <Route path="/dashboard/hospital" element={<HospitalDashboard />} />
          <Route path="/dashboard/recipient" element={<RecipientDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          {/*recipiennt routes */}
          <Route path="/DonationCamps" element={<DonationCamps />} />

          {/*donor routes */}
          <Route path="/history" element={<DonorHistory />} />
          <Route path="/schedule" element={<ScheduleAppointment />} />
          <Route path="/profile" element={<DonorProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;