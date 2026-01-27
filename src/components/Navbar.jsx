import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  // --- 1. ADMIN CHECK ---
  // If Admin is logged in: Hide Navbar.
  // If Admin logs out: 'user' becomes null -> This check fails -> Navbar returns to normal.
  if (user && user.role === 'Admin') {
    return null;
  }

  // --- HANDLERS ---
  const handleLogoutClick = () => {
    onLogout();         // 1. Clear user state in App.js
    navigate('/login'); // 2. Redirect to login page
  };

  const handleScroll = (id) => {
    setIsServicesOpen(false); 
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  // Helper function to render links based on Role
  const renderNavLinks = () => {
    // 1. GUEST (Not Logged In - The "Normal" State)
    if (!user) {
      return (
        <>
          <Link to="/" className="text-gray-600 hover:text-red-600 transition font-medium">Home</Link>
          
          {/* --- SERVICES DROPDOWN --- */}
          <div 
            className="relative"
            onMouseEnter={() => setIsServicesOpen(true)}
            onMouseLeave={() => setIsServicesOpen(false)}
          >
            <button className="text-gray-600 hover:text-red-600 transition font-medium flex items-center gap-1 focus:outline-none py-2">
              Services ▾
            </button>

            {isServicesOpen && (
              <div className="absolute top-full left-0 w-48 bg-white shadow-lg rounded-lg py-2 border border-gray-100 animate-fade-in-up z-50">
                <button onClick={() => handleScroll('service-donor')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600">For Donors</button>
                <button onClick={() => handleScroll('service-recipient')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">For Recipients</button>
                <button onClick={() => handleScroll('service-hospital')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600">For Hospitals</button>
              </div>
            )}
          </div>

          <button onClick={() => handleScroll('about-us')} className="text-gray-600 hover:text-red-600 transition font-medium focus:outline-none">About Us</button>

          <div className="flex items-center space-x-4 ml-4">
            <Link to="/login" className="text-gray-600 hover:text-red-600 font-medium">Log In</Link>
            <Link to="/register" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Donate Now</Link>
          </div>
        </>
      );
    }

    // 2. DONOR NAVIGATION
    if (user.role === 'Donor') {
      return (
        <>
          <Link to="/dashboard/donor" className="text-gray-600 hover:text-red-600 transition font-medium">Dashboard</Link>
          <Link to="/history" className="text-gray-600 hover:text-red-600 transition font-medium">My History</Link>
          <Link to="/DonationCamps" className="text-gray-600 hover:text-red-600 transition font-medium">Nearby Camps</Link>
          
          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <Link to="/schedule" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Schedule Appointment</Link>
          </div>
        </>
      );
    }

    // 3. HOSPITAL NAVIGATION
    if (user.role === 'Hospital') {
      return (
        <>
          <Link to="/dashboard/hospital" className="text-gray-600 hover:text-red-600 transition font-medium">Dashboard</Link>
          <Link to="/patient-requests" className="text-gray-600 hover:text-red-600 transition font-medium">Patient Requests</Link>
          <Link to="/hospital/appointments" className="text-gray-600 hover:text-red-600 transition font-medium">Donor Appointments</Link>
          <Link to="/hospital/events" className="text-gray-600 hover:text-red-600 transition font-medium">Mannage events</Link>
          

          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <Link to="/manage-stock" className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md">View Stock</Link>
          </div>
        </>
      );
    }

    // 4. RECIPIENT NAVIGATION
    if (user.role === 'Recipient') {
      return (
        <>
          <Link to="/dashboard/recipient" className="text-gray-600 hover:text-red-600 transition font-medium">Dashboard</Link>
          <Link to="/my-requests" className="text-gray-600 hover:text-red-600 transition font-medium">Track Requests</Link>

          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <Link to="/request-blood" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Request Blood</Link>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? `/dashboard/${user.role.toLowerCase()}` : "/"} className="flex-shrink-0 flex items-center gap-2">
              <span className="text-3xl">🩸</span>
              <span className="font-bold text-xl text-gray-800 tracking-wider">
                LifeLink
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {renderNavLinks()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;