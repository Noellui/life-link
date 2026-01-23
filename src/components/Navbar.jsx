import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  // Helper function to render links based on Role
  const renderNavLinks = () => {
    // 1. GUEST (Not Logged In)
    if (!user) {
      return (
        <>
          <Link to="/" className="text-gray-600 hover:text-red-600 transition font-medium">Home</Link>
          <Link to="/about" className="text-gray-600 hover:text-red-600 transition font-medium">About Us</Link>
          <div className="flex items-center space-x-4 ml-4">
            <Link to="/login" className="text-gray-600 hover:text-red-600 font-medium">
              Log In
            </Link>
            <Link to="/register" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">
              Donate Now
            </Link>
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
            <Link to="/schedule" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">
              Schedule Appointment
            </Link>
          </div>
        </>
      );
    }

    // 3. HOSPITAL NAVIGATION
    if (user.role === 'Hospital') {
      return (
        <>
          <Link to="/dashboard/hospital" className="text-gray-600 hover:text-red-600 transition font-medium">Dashboard</Link>
          <Link to="/inventory" className="text-gray-600 hover:text-red-600 transition font-medium">Inventory</Link>
          <Link to="/requests" className="text-gray-600 hover:text-red-600 transition font-medium">Patient Requests</Link>
          
          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <Link to="/inventory/update" className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md">Update Stock</Link>
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
            <Link to="/request-blood" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">
              Request Blood
            </Link>
          </div>
        </>
      );
    }

    // Fallback if role is unknown
    return null;
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo Link Dynamic Redirection */}
            <Link to={user ? `/dashboard/${user.role.toLowerCase()}` : "/"} className="flex-shrink-0 flex items-center gap-2">
              <span className="text-3xl">🩸</span>
              <span className="font-bold text-xl text-gray-800 tracking-wider">
                LifeLink
              </span>
            </Link>
          </div>

          {/* Render the specific links based on the function above */}
          <div className="hidden md:flex items-center space-x-8">
            {renderNavLinks()}
          </div>

          {/* Mobile Menu Button Placeholder (Optional) */}
          <div className="md:hidden flex items-center">
             {/* You can add a hamburger icon here later */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;