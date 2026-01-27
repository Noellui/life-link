import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // --- MOCK DATABASE (Aligned with System Data) ---
  const mockUsers = [
    {
      id: 1,
      role: 'Recipient',
      email: 'anjali@test.com',
      password: '123',
      name: "Anjali Gupta",
      bloodGroup: "B+",
      city: "Vadodara",
      phone: "+91 98765 43210",
      address: "B-22, Alkapuri Society"
    },
    {
      id: 2,
      role: 'Donor',
      // CHANGED: Matches the email in HospitalEvents.jsx so history appears automatically
      email: 'noel@example.com', 
      password: '123',
      name: "Noel Louis",
      bloodGroup: "O+",
      city: "Vadodara", 
      phone: "+91 90000 11111",
      totalDonations: 5,
      livesSaved: 15,
      lastDonation: "2025-11-15",
      // Profile Data defaults
      weight: 72,
      dob: "1998-05-15"
    },
    {
      id: 3,
      role: 'Hospital',
      email: 'city@test.com',
      password: '123',
      name: "City General Hospital",
      city: "Vadodara",
      license: "GUJ-HOSP-2023-882"
    },
    {
      id: 4,
      role: 'Admin',
      email: 'admin@test.com',
      password: '123',
      name: "System Administrator"
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Find User
    const foundUser = mockUsers.find(
      u => u.email.toLowerCase() === formData.email.toLowerCase() && u.password === formData.password
    );

    if (foundUser) {
      // 2. Pass the full user object to App.js (Saves to localStorage)
      onLogin(foundUser); 
      
      // 3. Redirect based on Role
      if (foundUser.role === 'Admin') navigate('/dashboard/admin');
      else if (foundUser.role === 'Donor') navigate('/dashboard/donor');
      else if (foundUser.role === 'Hospital') navigate('/dashboard/hospital');
      else navigate('/dashboard/recipient'); 
    } else {
      alert("❌ Invalid Credentials! \nTry: noel@example.com / 123");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <span className="text-4xl block text-center">🩸</span>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-center text-sm text-gray-900">
          Login here for | Donor | Recipient | Hospital 
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input name="email" type="email" required onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" required onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>

            <div className="flex gap-4">
              <button type="submit" className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Sign In
              </button>
              
              <Link to="/register" className="flex-1 flex justify-center py-2 px-4 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Register
              </Link>
            </div>

          </form>
          
          <div className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
             <p className="mb-1 font-bold">Demo Accounts (Pass: 123):</p>
             <div className="flex justify-center gap-2">
               <span>Recipient: anjali@test.com</span>
               <span>|</span>
               {/* Updated Email */}
               <span className="font-bold text-red-600">Donor: noel@example.com</span>
             </div>
             <div className="flex justify-center gap-2">
             <span>Hospital: city@test.com</span>
             <span>|</span>
             <span>Admin: admin@test.com</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;