import React, { useState, useEffect } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const RecipientProfile = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    contactNumber: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getEmail = () => {
    const stored = JSON.parse(localStorage.getItem('user_data') || 'null');
    return stored?.email || '';
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const email = getEmail();
      if (!email) return;

      try {
        const res = await fetch(`${BASE_URL}/api/recipient/profile/?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile({
            fullName: data.fullName || '',
            contactNumber: data.contactNumber || '',
            address: data.address || ''
          });
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch(`${BASE_URL}/api/recipient/profile/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: getEmail(),
          contactNumber: profile.contactNumber,
          address: profile.address
        })
      });

      if (res.ok) {
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">My Profile</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input 
            type="text" 
            name="fullName"
            value={profile.fullName} 
            disabled
            className="w-full border-gray-300 rounded-lg bg-gray-50 p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
          <input 
            type="text" 
            name="contactNumber"
            value={profile.contactNumber} 
            onChange={handleChange}
            maxLength="10"
            required
            className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea 
            name="address"
            value={profile.address} 
            onChange={handleChange}
            required
            rows="3"
            className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default RecipientProfile;