import React, { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function HospitalProfile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(''); // 'success' | 'error' | 'pwdMismatch'

  // Editable form state
  const [form, setForm] = useState({
    hospitalName: '',
    licenseNo: '',
    address: '',
    city: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
  });

  const getEmail = () => {
    const stored =
      JSON.parse(localStorage.getItem('user_data') || 'null') ||
      JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    return stored?.email || '';
  };

  const fetchData = useCallback(async () => {
    const email = getEmail();
    if (!email) { setLoading(false); return; }

    try {
      setLoading(true);

      const profileRes = await fetch(
        `${BASE_URL}/api/hospital/profile/?email=${encodeURIComponent(email)}`
      );
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setForm(prev => ({
          ...prev,
          hospitalName: data.hospitalName || '',
          licenseNo: data.licenseNo || '',
          address: data.address || '',
          city: data.city || '',
          contactEmail: email,
          password: data.password || '',
          confirmPassword: data.password || '',
        }));
      }

      const subRes = await fetch(
        `${BASE_URL}/api/hospital/subscription/?email=${encodeURIComponent(email)}`
      );
      if (subRes.ok) {
        setSubscription(await subRes.json());
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validate passwords match if a new password was entered
    if (form.password && form.password !== form.confirmPassword) {
      setSaveMsg('pwdMismatch');
      return;
    }

    setSaving(true);
    setSaveMsg('');
    const email = getEmail();

    try {
      const payload = {
        email,
        hospitalName: form.hospitalName,
        address: form.address,
        city: form.city,
      };
      // Only send password if it was changed
      if (form.password && form.password !== profile?.password) {
        payload.password = form.password;
      }

      const res = await fetch(`${BASE_URL}/api/hospital/profile/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveMsg('success');
        fetchData();
      } else {
        setSaveMsg('error');
      }
    } catch {
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  };

  const handleRenewPayment = async () => {
    setRenewing(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert('Razorpay SDK failed to load. Check network connection.');
      setRenewing(false);
      return;
    }

    const options = {
      key: 'rzp_test_SQPi7UmKIOJJal',
      amount: 200 * 100,
      currency: 'INR',
      name: 'LifeLink',
      description: 'Hospital Subscription Renewal (30 days)',
      handler: async function (response) {
        try {
          const res = await fetch(`${BASE_URL}/api/hospital/subscription/renew/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: getEmail(),
              paymentId: response.razorpay_payment_id,
            }),
          });
          if (res.ok) {
            alert('✅ Subscription extended by 30 days!');
            fetchData();
          }
        } catch (err) {
          console.error('Renewal error:', err);
        } finally {
          setRenewing(false);
        }
      },
      modal: { ondismiss: () => setRenewing(false) },
      prefill: { email: getEmail(), name: profile?.hospitalName || 'Hospital Admin' },
      theme: { color: '#1D4ED8' },
    };

    const rp = new window.Razorpay(options);
    rp.open();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading hospital profile…</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'profile', label: '🏥 Profile Information' },
    { key: 'subscription', label: '💳 Subscription' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── PAGE HEADER (matches Donor/Recipient style) ── */}
        <div className="bg-gray-900 px-8 py-6 flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold">Hospital Settings ✏️</h1>
            <p className="opacity-80 text-sm mt-1">Manage your facility's information and subscription.</p>
          </div>
          <div className="text-right">
            <span className="block text-xs uppercase opacity-70">Account Type</span>
            <span className="text-xl font-bold text-blue-400">🏥 Hospital</span>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-gray-200 px-8 pt-4 gap-1 bg-white">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-t-lg text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">

          {/* ══════════ TAB: PROFILE ══════════ */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave}>

              {/* Section 1: Account Details */}
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">1. Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={form.hospitalName}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="e.g. City General Hospital"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email (Read Only)</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current"
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter new password"
                    className={`w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${saveMsg === 'pwdMismatch' ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>

              {/* Section 2: Facility & Location */}
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-6">2. Facility &amp; Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    name="licenseNo"
                    value={form.licenseNo}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="e.g. Vadodara"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Street, Area, Landmark…"
                  />
                </div>
              </div>

              {/* Save bar */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div>
                  {saveMsg === 'success' && (
                    <span className="text-green-600 text-sm font-bold">✅ Profile updated successfully!</span>
                  )}
                  {saveMsg === 'error' && (
                    <span className="text-red-600 text-sm font-bold">❌ Failed to save. Please try again.</span>
                  )}
                  {saveMsg === 'pwdMismatch' && (
                    <span className="text-red-600 text-sm font-bold">❌ Passwords do not match.</span>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSaveMsg('')}
                    className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ══════════ TAB: SUBSCRIPTION ══════════ */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {subscription ? (
                <>
                  {/* Status banner */}
                  <div className={`rounded-2xl p-6 border ${
                    subscription.status === 'Active'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                          subscription.status === 'Active' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {subscription.status === 'Active' ? '✅' : '⚠️'}
                        </div>
                        <div>
                          <p className={`font-bold text-base ${
                            subscription.status === 'Active' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            Subscription {subscription.status}
                          </p>
                          <p className={`text-sm ${
                            subscription.status === 'Active' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {subscription.status === 'Active'
                              ? 'Your hospital has full platform access.'
                              : 'Your access has been suspended. Renew to continue.'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-black ${
                        subscription.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subscription.status}
                      </span>
                    </div>
                  </div>

                  {/* Details card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">Current Plan</h2>
                    </div>
                    <div className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hospital</p>
                          <p className="text-sm font-bold text-gray-800">{subscription.hospitalName}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 text-center">
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Valid Until</p>
                          <p className="text-xl font-black text-blue-800">{subscription.endDate}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Renewal Fee</p>
                          <p className="text-xl font-black text-gray-800">₹200</p>
                          <p className="text-xs text-gray-500 mt-1">for 30 days</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Included in Plan</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            'Donor Appointment Management',
                            'Event Creation & Donor Roster',
                            'Patient Request Processing',
                            'Blood Stock Audit Log',
                            'Transfusion Invoice Generation',
                            'Priority Blood Matching Alerts',
                          ].map(feature => (
                            <div key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="text-green-500 font-bold">✓</span>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleRenewPayment}
                          disabled={renewing}
                          className={`px-8 py-3 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center gap-2 ${
                            renewing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {renewing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>💳 Extend Subscription (₹200)</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-400 text-lg">No subscription data found.</p>
                  <p className="text-gray-400 text-sm mt-2">Please contact support to set up your hospital subscription.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}