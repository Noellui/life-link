import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [unpaidCount, setUnpaidCount] = useState(0);

  // --- STYLING HELPER ---
  const navLinkStyles = ({ isActive }) =>
    `transition font-medium pb-1 flex items-center gap-1 ${isActive
      ? 'text-red-600 border-b-2 border-red-600'
      : 'text-gray-600 hover:text-red-600'
    }`;

  const [eligibility, setEligibility] = useState({ eligible: true, daysRemaining: 0 });

  // --- FETCH UNPAID BILLS FOR RECIPIENT & ELIGIBILITY FOR DONOR FROM DATABASE ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Fallback to local storage if user.email isn't directly on the user prop
        const userEmail = user.email || JSON.parse(localStorage.getItem('user_data') || localStorage.getItem('lifeLinkUser') || '{}').email;

        if (!userEmail) return;

        if (user.role === 'Recipient') {
          try {
            const res = await fetch(`http://127.0.0.1:8000/api/recipient/bills/?email=${encodeURIComponent(userEmail)}`);
            if (res.ok) {
              const data = await res.json();
              // Count purely from database response, no mock fallbacks
              if (Array.isArray(data)) {
                const unpaid = data.filter(bill => bill.paymentStatus === 'Unpaid').length;
                setUnpaidCount(unpaid);
              } else {
                setUnpaidCount(0);
              }
            }
          } catch (error) {
            console.error("Failed to fetch unpaid bills count:", error);
            setUnpaidCount(0);
          }
        } else if (user.role === 'Donor') {
          try {
            const res = await fetch(`http://127.0.0.1:8000/api/donor/eligibility/?email=${encodeURIComponent(userEmail)}`);
            if (res.ok) {
              const data = await res.json();
              setEligibility(data);
            }
          } catch (error) {
            console.error("Failed to fetch eligibility:", error);
          }
        }
      }
    };

    fetchUserData();

    // Listen for storage changes so the badge updates immediately when a bill is paid
    window.addEventListener('storage', fetchUserData);
    return () => window.removeEventListener('storage', fetchUserData);
  }, [user]);

  if (user && user.role === 'Admin') {
    return null;
  }

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
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

  const renderNavLinks = () => {
    // 1. GUEST NAVIGATION
    if (!user) {
      return (
        <>
          <NavLink to="/" end className={navLinkStyles}>Home</NavLink>

          <div
            className="relative"
            onMouseEnter={() => setIsServicesOpen(true)}
            onMouseLeave={() => setIsServicesOpen(false)}
          >
            <button className="text-gray-600 hover:text-red-600 transition font-medium flex items-center gap-1 focus:outline-none py-2">
              Services ▾
            </button>
            {isServicesOpen && (
              <div className="absolute top-full left-0 w-48 bg-white shadow-lg rounded-lg py-2 border border-gray-100 z-50">
                <button onClick={() => handleScroll('service-donor')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600">For Donors</button>
                <button onClick={() => handleScroll('service-recipient')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">For Recipients</button>
                <button onClick={() => handleScroll('service-hospital')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600">For Hospitals</button>
              </div>
            )}
          </div>

          <button onClick={() => handleScroll('about-us')} className="text-gray-600 hover:text-red-600 transition font-medium">About Us</button>

          <div className="flex items-center space-x-4 ml-4">
            <NavLink to="/login" className={navLinkStyles}>Log In</NavLink>
            <Link to="/register" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Register Now</Link>
          </div>
        </>
      );
    }

    // 2. DONOR NAVIGATION
    if (user.role === 'Donor') {
      const canBook = eligibility.eligible;
      return (
        <>
          <NavLink to="/dashboard/donor" className={navLinkStyles}>Dashboard</NavLink>
          <NavLink to="/history" className={navLinkStyles}>My History</NavLink>
          <NavLink to="/DonationCamps" className={navLinkStyles}>Nearby Camps</NavLink>

          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            {canBook ? (
              <NavLink to="/schedule" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Schedule Appointment</NavLink>
            ) : (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  alert(`You are allowed to book an appointment only after 52 days since your last donation.\n\nPlease wait ${eligibility.daysRemaining} more days.`);
                }}
                className="bg-gray-300 text-gray-500 cursor-not-allowed px-5 py-2 rounded-full font-medium shadow-sm transition"
              >
                Schedule Appointment
              </button>
            )}
          </div>
        </>
      );
    }

    // 3. HOSPITAL NAVIGATION
    if (user.role === 'Hospital') {
      return (
        <>
          <NavLink to="/dashboard/hospital" className={navLinkStyles}>Dashboard</NavLink>
          <NavLink to="/patient-requests" className={navLinkStyles}>Patient Requests</NavLink>
          <NavLink to="/hospital/appointments" className={navLinkStyles}>Donor Appointments</NavLink>
          <NavLink to="/hospital/events" className={navLinkStyles}>Manage Events</NavLink>

          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <NavLink to="/manage-stock" className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md">View Stock</NavLink>
          </div>
        </>
      );
    }

    // 4. RECIPIENT NAVIGATION
    if (user.role === 'Recipient') {
      return (
        <>
          <NavLink to="/dashboard/recipient" className={navLinkStyles}>Dashboard</NavLink>
          <NavLink to="/my-requests" className={navLinkStyles}>Track Requests</NavLink>

          <NavLink to="/my-bills" className={navLinkStyles}>
            My Bills
            {unpaidCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1 animate-pulse">
                {unpaidCount}
              </span>
            )}
          </NavLink>

          <div className="flex items-center space-x-4 ml-4">
            <button onClick={handleLogoutClick} className="text-gray-600 hover:text-red-600 font-medium">Log Out</button>
            <NavLink to="/request-blood" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition shadow-md">Request Blood</NavLink>
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
              <span className="font-bold text-xl text-gray-800 tracking-wider">LifeLink</span>
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