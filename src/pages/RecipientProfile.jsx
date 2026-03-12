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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(''); // 'success' | 'error' | ''

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
    <div className="min-h-screen bg-gray-50">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar circle with initials */}
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-black shadow-md select-none">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.fullName || 'My Profile'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {profile.email}
                {profile.bloodType && (
                  <span className="ml-2 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                    🩸 {profile.bloodType}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep your contact details up to date for smooth hospital coordination.
              </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Full Name — read-only since set at registration */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  disabled
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Name cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Email — always read-only */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Email Address (Read Only)
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={profile.contactNumber}
                  onChange={handleChange}
                  maxLength="10"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile number"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Room / Ward number, Hospital name or home address…"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none"
                />
              </div>
            </div>

            {/* Save footer */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
              <div>
                {saveMsg === 'success' && (
                  <span className="text-green-600 text-sm font-bold">
                    ✅ Profile updated successfully!
                  </span>
                )}
                {saveMsg === 'error' && (
                  <span className="text-red-600 text-sm font-bold">
                    ❌ Failed to save. Please check the server.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/recipient')}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition ${
                    saving ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Info box */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
          <p className="text-sm text-blue-700">
            Your contact number and address are shared with the hospital when a blood request is processed.
            Keeping them accurate ensures faster coordination.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipientProfile;