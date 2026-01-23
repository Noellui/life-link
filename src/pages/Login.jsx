import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = ({ onLogin }) => { // <--- Receive the function here
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'noellouis2005@gmail.com',
    password: '123',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    // --- MOCK LOGIC (Replace with Backend later) ---
    let userRole = "Donor";
    let userName = "Noel"; // Mock name

    if (formData.email.includes("hospital")) {
      userRole = "Hospital";
      userName = "City Hospital";
    } else if (formData.email.includes("recipient")) {
      userRole = "Recipient";
      userName = "noel";
    } else if (formData.email.includes("admin")) {
      userRole = "Admin";
    }
    
    const userData = { name: userName, email: formData.email, role: userRole };

    onLogin(userData);

    switch (userRole) {
      case 'Donor': navigate('/dashboard/donor'); break;
      case 'Hospital': navigate('/dashboard/hospital'); break;
      case 'Recipient': navigate('/dashboard/recipient'); break;
      case 'Admin': navigate('/dashboard/admin'); break;
      default: alert("Role not recognized!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              required
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition"
          >
            Sign In
          </button>
        </form>
        
         <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-brand-red hover:text-red-500">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;