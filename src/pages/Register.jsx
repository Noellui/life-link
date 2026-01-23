import React, { useState } from 'react';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    bloodType: '',
    role: 'Donor', // Default role
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted:', formData);
    // Here you will eventually connect to your Python Backend
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the community saving lives daily
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="sr-only">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
                placeholder="Full Name"
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
                placeholder="Email address"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Role Selection */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
               <select
                 className="block w-full px-3 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
                 onChange={(e) => setFormData({...formData, role: e.target.value})}
               >
                 <option value="Not Selected">Not Selected</option>
                 <option value="Donor">Donor</option>
                 <option value="Recipient">Recipient</option>
                 <option value="Hospital">Hospital Representative</option>
               </select>
            </div>

             {/* Blood Type (Only show if Donor or Recipient) */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
               <select
                 className="block w-full px-3 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
                 onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
               >
                 <option value="">Select Blood Type</option>
                 <option value="A+">A+</option>
                 <option value="A-">A-</option>
                 <option value="B+">B+</option>
                 <option value="B-">B-</option>
                 <option value="O+">O+</option>
                 <option value="O-">O-</option>
                 <option value="AB+">AB+</option>
                 <option value="AB-">AB-</option>
               </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;