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
  const [saveMsg, setSaveMsg] = useState('');

  // Editable form state
  const [form, setForm] = useState({
    hospitalName: '',
    licenseNo: '',
    address: '',
    city: '',
    contactEmail: '',
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
        setForm({
          hospitalName: data.hospitalName || '',
          licenseNo: data.licenseNo || '',
          address: data.address || '',
          city: data.city || '',
          contactEmail: email,
        });
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

  // ── Handle form field change ─────────────────────────────────────────────
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveMsg('');
  };

  // ── Save profile update ───────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    const email = getEmail();

    try {
      const res = await fetch(`${BASE_URL}/api/hospital/profile/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...form }),
      });

      if (res.ok) {
        setSaveMsg('success');
        fetchData(); // Refresh from DB
      } else {
        setSaveMsg('error');
      }
    } catch {
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  };

  // ── Razorpay subscription renewal ─────────────────────────────────────────
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
    <div className="min-h-screen bg-gray-50">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-2xl shadow-md">
              🏥
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.hospitalName || 'Hospital Settings'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your facility's information and subscription plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ── TABS ── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: PROFILE ══════════ */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Facility Details</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your hospital's official registration information.
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Synced with Database
                </span>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hospital Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Hospital Name
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={form.hospitalName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="e.g. City General Hospital"
                  />
                </div>

                {/* License No */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    name="licenseNo"
                    value={form.licenseNo}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="e.g. GJ/MED/2024/0001"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="e.g. Vadodara"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Full Address
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    placeholder="Street, Area, Landmark…"
                  />
                </div>

                {/* Read-only Email */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Contact Email (Read Only)
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    readOnly
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Save bar */}
              <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  {saveMsg === 'success' && (
                    <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                      ✅ Profile updated successfully!
                    </span>
                  )}
                  {saveMsg === 'error' && (
                    <span className="text-red-600 text-sm font-bold">
                      ❌ Failed to save. Please try again.
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-8 py-3 rounded-xl text-white font-bold text-sm shadow-sm transition ${
                    saving
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Saving…' : '💾 Save Changes'}
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Hospital
                        </p>
                        <p className="text-sm font-bold text-gray-800">{subscription.hospitalName}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 text-center">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
                          Valid Until
                        </p>
                        <p className="text-xl font-black text-blue-800">{subscription.endDate}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Renewal Fee
                        </p>
                        <p className="text-xl font-black text-gray-800">₹200</p>
                        <p className="text-xs text-gray-500 mt-1">for 30 days</p>
                      </div>
                    </div>

                    {/* Features included */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Included in Plan
                      </p>
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
                          renewing
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
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
                <p className="text-gray-400 text-sm mt-2">
                  Please contact support to set up your hospital subscription.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}