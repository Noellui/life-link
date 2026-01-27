import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DonorProfile = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. INITIAL STATE (Empty) ---
  const [formData, setFormData] = useState({
    // Personal
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    
    // Address
    address: "",
    city: "",
    state: "",
    zipCode: "",

    // Health
    bloodGroup: "", 
    weight: "",
    lastDonation: "",
    medicalConditions: "",
    isSmoker: false,
    hasTattoo: false,
  });

  // --- 2. LOAD DATA ON MOUNT ---
  useEffect(() => {
    // Get currently logged-in user
    const savedUser = JSON.parse(localStorage.getItem('lifeLinkUser'));
    
    if (savedUser) {
      setFormData({
        fullName: savedUser.name || "",
        email: savedUser.email || "",
        phone: savedUser.phone || "", // If these fields don't exist yet, default to empty
        dob: savedUser.dob || "",
        gender: savedUser.gender || "Male",
        
        address: savedUser.address || "",
        city: savedUser.city || "",
        state: savedUser.state || "",
        zipCode: savedUser.zipCode || "",

        bloodGroup: savedUser.bloodType || "O+", // Map 'bloodType' from auth to 'bloodGroup'
        weight: savedUser.weight || "",
        lastDonation: savedUser.lastDonation || "",
        medicalConditions: savedUser.medicalConditions || "None",
        isSmoker: savedUser.isSmoker || false,
        hasTattoo: savedUser.hasTattoo || false,
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);

    // --- 3. SAVE DATA TO LOCAL STORAGE ---
    // Retrieve current user object to preserve ID, Role, etc.
    const currentUser = JSON.parse(localStorage.getItem('lifeLinkUser')) || {};

    const updatedUser = {
      ...currentUser,
      // Update fields
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob,
      gender: formData.gender,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      // Health info
      bloodType: formData.bloodGroup,
      weight: formData.weight,
      lastDonation: formData.lastDonation,
      medicalConditions: formData.medicalConditions,
      isSmoker: formData.isSmoker,
      hasTattoo: formData.hasTattoo,
    };

    // Save back to storage
    localStorage.setItem('lifeLinkUser', JSON.stringify(updatedUser));

    // Simulate Network Delay
    setTimeout(() => {
      alert("Profile updated successfully! ✅");
      setIsSaving(false);
      // We force a reload so App.js picks up the new name/details in Navbar
      window.location.href = '/dashboard/donor'; 
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 px-8 py-6 flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold">Edit Profile ✏️</h1>
            <p className="opacity-80 text-sm mt-1">Manage your personal details and health status.</p>
          </div>
          {/* Read Only Badge */}
          <div className="text-right hidden sm:block">
            <span className="block text-xs uppercase opacity-70">Blood Group</span>
            <span className="text-2xl font-bold text-red-500">{formData.bloodGroup || "N/A"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          {/* SECTION 1: Personal Details */}
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">1. Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2 bg-gray-50" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" placeholder="+91 98765 43210"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
          </div>

          {/* SECTION 2: Address */}
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">2. Address & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
          </div>

          {/* SECTION 3: Health Profile */}
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">3. Health & Eligibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Donation Date</label>
              <input type="date" name="lastDonation" value={formData.lastDonation} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2" />
              <p className="text-xs text-gray-500 mt-1">Leave empty if you have never donated.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions / Allergies</label>
              <textarea name="medicalConditions" rows="3" value={formData.medicalConditions} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-600 focus:border-red-600 border p-2"></textarea>
            </div>
            
            {/* Checkboxes */}
            <div className="flex items-center gap-2">
               <input type="checkbox" name="isSmoker" checked={formData.isSmoker} onChange={handleChange} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
               <label className="text-sm text-gray-700">I am a regular smoker</label>
            </div>
            <div className="flex items-center gap-2">
               <input type="checkbox" name="hasTattoo" checked={formData.hasTattoo} onChange={handleChange} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
               <label className="text-sm text-gray-700">I got a tattoo in the last 6 months</label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard/donor')} 
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DonorProfile;