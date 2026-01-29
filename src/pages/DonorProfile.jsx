import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DonorProfile = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    bloodGroup: "", 
    weight: "",
  });

  useEffect(() => {
    // Dashboard and Login use 'user_data' key
    const storedUser = JSON.parse(localStorage.getItem('user_data'));
    
    if (!storedUser) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/donor/profile/?email=${storedUser.email}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(data);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/donor/profile/?email=${formData.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Update local name in case it changed
        const storedUser = JSON.parse(localStorage.getItem('user_data'));
        localStorage.setItem('user_data', JSON.stringify({ ...storedUser, name: formData.fullName }));
        
        alert("Profile updated successfully! ✅");
        navigate('/dashboard/donor');
      } else {
        alert("Failed to update profile.");
      }
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="bg-gray-900 px-8 py-6 flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold">Edit Profile ✏️</h1>
            <p className="opacity-80 text-sm mt-1">Update your info in the LifeLink database.</p>
          </div>
          <div className="text-right">
            <span className="block text-xs uppercase opacity-70">Blood Group</span>
            <span className="text-2xl font-bold text-red-500">{formData.bloodGroup || "N/A"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">1. Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read Only)</label>
              <input type="email" name="email" value={formData.email} className="w-full border rounded-lg p-2 bg-gray-100" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">2. Physical & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border rounded-lg p-2">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/dashboard/donor')} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className={`px-6 py-2 bg-red-600 text-white rounded-lg font-medium ${isSaving ? 'opacity-70' : ''}`}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonorProfile;