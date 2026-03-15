import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'http://127.0.0.1:8000';

const RecipientProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: '',
    contactNumber: '',
    address: '',
    email: '',
    bloodType: '',
    password: '',
    dob: '',
    city: '',
    weight: '',
    gender: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(''); // 'success' | 'error' | 'pwdMismatch'

  const getStoredUser = () =>
    JSON.parse(localStorage.getItem('user_data') || 'null') ||
    JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');

  useEffect(() => {
    const fetchProfile = async () => {
      const stored = getStoredUser();
      if (!stored?.email) {
        navigate('/login');
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/api/recipient/profile/?email=${encodeURIComponent(stored.email)}`
        );
        if (res.ok) {
          const data = await res.json();
          setProfile({
            fullName:      data.fullName      || stored.name  || '',
            contactNumber: data.contactNumber || '',
            address:       data.address       || '',
            email:         stored.email,
            bloodType:     data.bloodType     || '',
            password:      data.password      || '',
            dob:           data.dob           || '',
            city:          data.city          || '',
            weight:        data.weight        || '',
            gender:        data.gender        || '',
          });
        } else {
          // fallback to localStorage info
          setProfile(prev => ({
            ...prev,
            fullName: stored.name  || '',
            email:    stored.email || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load recipient profile:', err);
        setProfile(prev => ({
          ...prev,
          fullName: getStoredUser()?.name  || '',
          email:    getStoredUser()?.email || '',
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (profile.password && profile.password !== confirmPassword) {
      setSaveMsg('pwdMismatch');
      return;
    }
    setSaving(true);
    setSaveMsg('');

    try {
      const res = await fetch(`${BASE_URL}/api/recipient/profile/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:         profile.email,
          contactNumber: profile.contactNumber,
          address:       profile.address,
          password:      profile.password,
          dob:           profile.dob,
          city:          profile.city,
          weight:        profile.weight,
          gender:        profile.gender,
        }),
      });

      if (res.ok) {
        setSaveMsg('success');
        // Update localStorage name if available
        const stored = getStoredUser();
        if (stored) {
          stored.name = profile.fullName;
          localStorage.setItem('user_data', JSON.stringify(stored));
        }
      } else {
        setSaveMsg('error');
      }
    } catch (err) {
      console.error('Update failed:', err);
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading your profile…</p>
        </div>
      </div>
    );
  }

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
            <span className="text-2xl font-bold text-red-500">{profile.bloodType || "N/A"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">1. Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={profile.fullName} disabled className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read Only)</label>
              <input type="email" name="email" value={profile.email} disabled className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="tel" name="contactNumber" value={profile.contactNumber} onChange={handleChange} maxLength="10" required pattern="[0-9]{10}" className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" name="dob" value={profile.dob} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" name="password" value={profile.password} onChange={handleChange} placeholder="Leave blank to keep current" className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" name="confirmPassword" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setSaveMsg(''); }} placeholder="Re-enter new password" className={`w-full border rounded-lg p-2 ${saveMsg === 'pwdMismatch' ? 'border-red-500' : ''}`} />
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">2. Physical & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="address" value={profile.address} onChange={handleChange} required className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" value={profile.city} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input type="number" name="weight" value={profile.weight} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={profile.gender} onChange={handleChange} className="w-full border rounded-lg p-2 bg-white">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div>
              {saveMsg === 'success' && (
                <span className="text-green-600 text-sm font-bold">✅ Profile updated successfully!</span>
              )}
              {saveMsg === 'error' && (
                <span className="text-red-600 text-sm font-bold">❌ Failed to save. Please check the server.</span>
              )}
              {saveMsg === 'pwdMismatch' && (
                <span className="text-red-600 text-sm font-bold">❌ Passwords do not match.</span>
              )}
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => navigate('/dashboard/recipient')} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className={`px-6 py-2 bg-red-600 text-white rounded-lg font-medium ${saving ? 'opacity-70' : ''}`}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipientProfile;