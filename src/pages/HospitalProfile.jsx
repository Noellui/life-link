import React, { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
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

  // Updated to match your specific localStorage keys from Login logic
  const getEmail = () => {
    const stored = JSON.parse(localStorage.getItem('user_data') || localStorage.getItem('lifeLinkUser') || 'null');
    return stored?.email || '';
  };

  const fetchData = useCallback(async () => {
    const email = getEmail();
    if (!email) {
      console.error("No email found in localStorage");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fixed path: matches path('api/hospital/profile/', ...) in urls.py
      const profileRes = await fetch(`${BASE_URL}/api/hospital/profile/?email=${encodeURIComponent(email)}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      // Fixed path: matches path('api/hospital/subscription/', ...) in urls.py
      const subRes = await fetch(`${BASE_URL}/api/hospital/subscription/?email=${encodeURIComponent(email)}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRenewPayment = async () => {
    setRenewing(true);
    const isLoaded = await loadRazorpayScript();
    
    if (!isLoaded) {
      alert('Razorpay SDK failed to load.');
      setRenewing(false);
      return;
    }

    const options = {
      key: 'rzp_test_YOUR_KEY_HERE', 
      amount: 200 * 100, 
      currency: 'INR',
      name: 'LifeLink',
      description: 'Hospital Subscription Renewal',
      handler: async function (response) {
        try {
          // Matches path('api/hospital/subscription/renew/', ...) in urls.py
          const res = await fetch(`${BASE_URL}/api/hospital/subscription/renew/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: getEmail(),
              paymentId: response.razorpay_payment_id 
            }),
          });

          if (res.ok) {
            alert('Subscription extended successfully!');
            fetchData();
          }
        } catch (err) {
          console.error('Renewal error:', err);
        } finally {
          setRenewing(false);
        }
      },
      prefill: {
        email: getEmail(),
        name: profile?.hospitalName || 'Hospital Admin'
      },
      theme: { color: '#4F46E5' }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile data...</div>;

  // Render logic remains identical to keep your current design
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Hospital Settings</h1>

        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-sm font-bold ${activeTab === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 px-4 text-sm font-bold ${activeTab === 'subscription' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Subscription Details
          </button>
        </div>

        {activeTab === 'profile' && profile && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Facility Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hospital Name</label>
                <div className="text-gray-900 font-medium bg-gray-50 p-3 rounded border">{profile.hospitalName}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">License Number</label>
                <div className="text-gray-900 font-medium bg-gray-50 p-3 rounded border">{profile.licenseNo}</div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address</label>
                <div className="text-gray-900 font-medium bg-gray-50 p-3 rounded border">{profile.address}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">City</label>
                <div className="text-gray-900 font-medium bg-gray-50 p-3 rounded border">{profile.city}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && subscription && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Current Plan</h2>
                <p className="text-sm text-gray-500 mt-1">Manage platform access and billing</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {subscription.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 flex justify-between items-center mb-6">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Valid Until</p>
                <p className="text-2xl font-black text-gray-900">{subscription.endDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Renewal Fee</p>
                <p className="text-2xl font-black text-gray-900">₹200</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleRenewPayment}
                disabled={renewing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition"
              >
                {renewing ? 'Processing...' : 'Extend Subscription (₹200)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}