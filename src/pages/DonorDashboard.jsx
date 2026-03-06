import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// DonorDashboard
//
// CITY-BASED REQUEST FILTERING:
//   The "Urgent Requests Near You" section now passes the
//   donor's email to the backend (?email=...) so the server
//   can look up the donor's city and filter requests to only
//   show hospitals in the same city.  This prevents "notification
//   fatigue" — donors only see requests they can realistically act on.
// ============================================================

const API = 'http://127.0.0.1:8000/api';

// ── Small helpers ────────────────────────────────────────────────
const urgencyColor = (u) => {
  if (u === 'Critical') return 'bg-red-100 text-red-700 border-red-200';
  if (u === 'High')     return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

const statusColor = (s) => {
  if (s === 'Fulfilled')  return 'bg-green-100 text-green-700';
  if (s === 'Confirmed')  return 'bg-blue-100 text-blue-700';
  if (s === 'Canceled')   return 'bg-gray-100 text-gray-500';
  if (s === 'Rejected')   return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
};

// ── Main component ───────────────────────────────────────────────
const DonorDashboard = () => {
  const navigate = useNavigate();

  // ---- State --------------------------------------------------
  const [user,        setUser]        = useState(null);
  const [stats,       setStats]       = useState({});
  const [requests,    setRequests]    = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [history,     setHistory]     = useState([]);
  const [eligibility, setEligibility] = useState({ eligible: true, daysRemaining: 0 });
  const [loading,     setLoading]     = useState(true);
  const [interestSent, setInterestSent] = useState({});

  // ---- Load user from localStorage ---------------------------
  useEffect(() => {
    const stored =
      JSON.parse(localStorage.getItem('lifeLinkUser') || 'null') ||
      JSON.parse(localStorage.getItem('user_data')    || 'null');
    if (!stored) { navigate('/login'); return; }
    setUser(stored);
  }, [navigate]);

  // ---- Fetch all dashboard data ------------------------------
  const fetchDashboardData = useCallback(async () => {
    if (!user?.email) return;
    const email = user.email;
    setLoading(true);

    try {
      const [statsRes, reqRes, apptRes, histRes, eligRes] = await Promise.allSettled([
        fetch(`${API}/donor/stats/?email=${email}`),

        // CITY-BASED FILTERING — pass email so backend filters by donor city.
        // Without ?email=, the server would return all pending requests globally.
        fetch(`${API}/donor/requests/?email=${email}`),

        fetch(`${API}/donor/appointments/?email=${email}`),
        fetch(`${API}/donor/history/?email=${email}`),
        fetch(`${API}/donor/eligibility/?email=${email}`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        setStats(d.stats || {});
        setUser(prev => ({ ...prev, ...d.user_details }));
      }

      if (reqRes.status === 'fulfilled' && reqRes.value.ok) {
        setRequests(await reqRes.value.json());
      }

      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        const arr = await apptRes.value.json();
        setAppointment(arr[0] || null);
      }

      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        setHistory(await histRes.value.json());
      }

      if (eligRes.status === 'fulfilled' && eligRes.value.ok) {
        setEligibility(await eligRes.value.json());
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ---- "I Can Donate" ----------------------------------------
  const handleInterest = async (requestId) => {
    if (interestSent[requestId]) return;
    try {
      await fetch(`${API}/donor/interest/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: user?.email, requestId }),
      });
      setInterestSent(prev => ({ ...prev, [requestId]: true }));
    } catch {
      setInterestSent(prev => ({ ...prev, [requestId]: true }));
    }
  };

  // ---- Cancel appointment ------------------------------------
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await fetch(`${API}/donor/appointments/${id}/cancel/`, { method: 'POST' });
      setAppointment(null);
    } catch (e) {
      console.error(e);
    }
  };

  // ============================================================
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  );

  const cityLabel = user?.city || 'your city';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      {/* ── Header ── */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.bloodType && (
                <>Blood Type: <span className="font-black text-red-600">{user.bloodType}</span> &bull; </>
              )}
              📍 {cityLabel}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/donor/schedule"
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-700 transition shadow-md text-sm">
              + Schedule Donation
            </Link>
            <Link to="/donor/profile"
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg font-bold hover:bg-gray-50 transition text-sm">
              My Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* ── Eligibility Banner ── */}
        {!eligibility.eligible && eligibility.daysRemaining > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-center gap-4">
            <span className="text-3xl">⏳</span>
            <div>
              <p className="font-bold text-amber-800">Not yet eligible to donate</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {eligibility.daysRemaining} days remaining before your next eligible donation.
                Last donated on <strong>{eligibility.lastDonation}</strong>.
              </p>
            </div>
          </div>
        )}
        {eligibility.eligible && stats.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-4">
            <span className="text-3xl">✅</span>
            <p className="font-bold text-green-800">You are eligible to donate today!</p>
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Donations', val: stats.total   || 0,    icon: '🩸', color: 'text-red-600',   bg: 'bg-red-50'   },
            { label: 'Lives Impacted',  val: stats.lives   || 0,    icon: '❤️', color: 'text-pink-600',  bg: 'bg-pink-50'  },
            { label: 'Last Donation',   val: stats.lastDate || 'N/A', icon: '📅', color: 'text-blue-600',  bg: 'bg-blue-50'  },
          ].map(({ label, val, icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-5 border border-white shadow-sm`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-black ${color} mt-1`}>{icon} {val}</p>
            </div>
          ))}
        </div>

        {/* ── Active Appointment ── */}
        {appointment && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">📅 Upcoming Appointment</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(appointment.status)} border`}>
                {appointment.status}
              </span>
            </div>
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-lg">{appointment.centerName}</p>
                <p className="text-gray-500 text-sm">🗓 {appointment.date} &bull; 🕐 {appointment.time}</p>
              </div>
              <button
                onClick={() => handleCancel(appointment.id)}
                className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition font-bold">
                Cancel Appointment
              </button>
            </div>
          </div>
        )}

        {/* ── Urgent Requests Near You ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800">🚨 Urgent Requests Near You</h3>
              {/* City filter label — lets the donor know requests are local */}
              <p className="text-xs text-gray-500 mt-0.5">
                Showing requests from hospitals in <strong>{cityLabel}</strong> only
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-lg">🎉 No urgent requests in {cityLabel} right now.</p>
              <p className="text-sm mt-1">Check back later — you'll be notified when a match appears.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map(req => (
                <div key={req.id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-red-600 text-xl">{req.bloodGroup}</span>
                        <span className="text-gray-700 font-semibold">{req.units} Unit{req.units > 1 ? 's' : ''}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${urgencyColor(req.urgency)}`}>
                          {req.urgency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Patient: <strong>{req.patientName}</strong> &bull; 📍 {req.city}
                      </p>
                    </div>
                    <button
                      onClick={() => handleInterest(req.id)}
                      disabled={interestSent[req.id]}
                      className={`px-5 py-2 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap
                        ${interestSent[req.id]
                          ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                          : 'bg-red-600 text-white hover:bg-red-700'}`}
                    >
                      {interestSent[req.id] ? '✅ Interest Sent' : '🙋 I Can Donate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Donation History ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">🩸 Donation History</h3>
            <Link to="/donor/history" className="text-sm text-blue-600 font-medium hover:underline">
              View All →
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No donation history found in the database. Schedule your first donation!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.slice(0, 5).map(h => (
                <div key={h.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition">
                  <div>
                    <p className="font-semibold text-gray-900">{h.location}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {h.date} &bull; {h.donationType}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 font-bold">{h.units} unit</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(h.status)}`}>
                      {h.status}
                    </span>
                    {h.status === 'Fulfilled' && (
                      <Link
                        to={`/donor/certificate/${h.id}`}
                        className="text-xs text-blue-600 font-bold hover:underline">
                        📄 Certificate
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DonorDashboard;
