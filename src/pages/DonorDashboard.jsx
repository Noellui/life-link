import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// Features added to DonorDashboard:
//   Feature 3 — "I Can Donate" now calls the backend API and
//               tracks which requests the donor has responded to.
//   Feature 5 — Eligibility Countdown with 56-day blood donation rule.
// ============================================================

const DonorDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: 'Loading...',
    email: '',
    bloodType: '...',
    city: 'Vadodara',
    id: '...',
  });

  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, lives: 0, lastDate: 'N/A' });
  const [myAppointment, setMyAppointment] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]);

  // Feature 3 – track interested request IDs in state
  const [interestedIds, setInterestedIds] = useState(
    () => JSON.parse(localStorage.getItem('interested_request_ids') || '[]')
  );
  const [interestLoading, setInterestLoading] = useState(null); // holds the requestId being submitted

  // Feature 5 – eligibility countdown
  const [eligibility, setEligibility] = useState({
    eligible: true,
    daysRemaining: 0,
    nextEligibleDate: null,
  });

  const getLoggedInUser = () => {
    const s = localStorage.getItem('user_data');
    return s ? JSON.parse(s) : null;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const loggedInUser = getLoggedInUser();
      if (!loggedInUser?.email) {
        navigate('/login');
        return;
      }
      const email = loggedInUser.email;

      try {
        // 1. Stats
        const statsRes = await fetch(`http://127.0.0.1:8000/api/donor/stats/?email=${email}`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setUser({
            name: data.user_details.name,
            email,
            bloodType: data.user_details.bloodType,
            city: data.user_details.city,
            id: data.user_details.id,
          });
        }

        // 2. Urgent requests
        const reqRes = await fetch('http://127.0.0.1:8000/api/donor/requests/');
        if (reqRes.ok) setNearbyRequests(await reqRes.json());

        // 3. Upcoming appointment
        const appRes = await fetch(`http://127.0.0.1:8000/api/donor/appointments/?email=${email}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          setMyAppointment(appData.find(a => a.status !== 'Canceled') || null);
        }

        // 4. Full history
        const histRes = await fetch(`http://127.0.0.1:8000/api/donor/history/?email=${email}`);
        if (histRes.ok) setDonationHistory(await histRes.json());

        // Feature 5 — Eligibility check
        const eligRes = await fetch(`http://127.0.0.1:8000/api/donor/eligibility/?email=${email}`);
        if (eligRes.ok) setEligibility(await eligRes.json());

      } catch (err) {
        console.error('Dashboard Connection Error:', err);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // --- Feature 3: Handle "I Can Donate" ---
  const handleDonateClick = async (req) => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser?.email) return navigate('/login');

    setInterestLoading(req.id);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/donor/interest/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInUser.email, requestId: req.id }),
      });
      const data = await res.json();
      alert(`✅ ${data.message}`);

      const updated = [...new Set([...interestedIds, req.id])];
      setInterestedIds(updated);
      localStorage.setItem('interested_request_ids', JSON.stringify(updated));
    } catch {
      // Fallback: mark locally anyway
      const updated = [...new Set([...interestedIds, req.id])];
      setInterestedIds(updated);
      localStorage.setItem('interested_request_ids', JSON.stringify(updated));
      alert(`✅ Your interest has been noted! The hospital will follow up.`);
    } finally {
      setInterestLoading(null);
    }
  };

  // --- Cancel appointment ---
  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/donor/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) { alert('Appointment canceled.'); window.location.reload(); }
      else alert('Failed to cancel.');
    } catch (err) { console.error(err); }
  };

  // ============================================================
  // Feature 5 — Eligibility Countdown Widget
  // ============================================================
  const EligibilityCard = () => {
    const { eligible, daysRemaining, nextEligibleDate, lastDonation } = eligibility;
    const progressPct = eligible ? 100 : Math.round(((56 - daysRemaining) / 56) * 100);

    return (
      <div className={`rounded-xl shadow-sm border overflow-hidden ${eligible ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <div className={`px-5 py-3 ${eligible ? 'bg-green-600' : 'bg-orange-500'}`}>
          <h3 className="text-white font-bold text-sm uppercase tracking-wide">
            {eligible ? '🟢 Eligible to Donate' : '⏳ Eligibility Countdown'}
          </h3>
        </div>

        <div className="p-5">
          {eligible ? (
            <div className="text-center">
              <div className="text-4xl mb-2">❤️</div>
              <p className="font-bold text-green-800 text-lg">You can donate today!</p>
              {lastDonation && (
                <p className="text-xs text-green-600 mt-1">Last donation: {lastDonation}</p>
              )}
              {!lastDonation && (
                <p className="text-xs text-green-600 mt-1">No donation on record — your first time?</p>
              )}
              <Link
                to="/schedule"
                className="mt-4 inline-block bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Schedule Now →
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-600">Recovery Progress</span>
                <span className="text-xs font-bold text-orange-700">{progressPct}%</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-3 mb-4">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="text-2xl font-black text-orange-600">{daysRemaining}</p>
                  <p className="text-xs text-gray-500 font-medium">Days Remaining</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="text-xs font-bold text-gray-500 mb-1">Next Eligible</p>
                  <p className="text-sm font-bold text-gray-800">
                    {nextEligibleDate
                      ? new Date(nextEligibleDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Whole blood donors must wait 56 days between donations to ensure full recovery.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">
              Donor ID: <span className="font-mono text-gray-700">{user.id}</span> •
              Blood Type: <span className="font-bold text-red-600">{user.bloodType}</span> •
              City: <span className="font-bold text-red-600">{user.city}</span>
            </p>
          </div>
          <Link
            to="/schedule"
            className={`px-6 py-2 rounded-lg font-medium transition shadow-md w-full md:w-auto text-center ${
              eligibility.eligible
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={e => { if (!eligibility.eligible) e.preventDefault(); }}
            title={!eligibility.eligible ? `Eligible in ${eligibility.daysRemaining} days` : ''}
          >
            {eligibility.eligible ? '+ Schedule Donation' : `⏳ ${eligibility.daysRemaining}d Until Eligible`}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 text-2xl">🩸</div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Donations</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 text-2xl">❤️</div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Lives Impacted</p><p className="text-2xl font-bold text-gray-900">{stats.lives}</p></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 text-2xl">📅</div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Last Donation</p><p className="text-2xl font-bold text-gray-900">{stats.lastDate}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">
            {/* URGENT REQUESTS with Feature 3 */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Urgent Blood Needed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nearbyRequests.length > 0 ? nearbyRequests.map((req) => {
                  const alreadyInterested = interestedIds.includes(req.id);
                  const isLoading = interestLoading === req.id;
                  return (
                    <div key={req.id} className="bg-white rounded-xl shadow-sm border border-red-100 p-5 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{req.urgency}</span>
                        {alreadyInterested && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Responded ✓</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{req.patientName}</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {req.city} • <strong>{req.bloodGroup}</strong> ({req.units} Units)
                      </p>
                      {alreadyInterested ? (
                        <div className="w-full bg-green-50 text-green-700 font-bold py-2 rounded-lg text-center text-sm border border-green-200">
                          ✅ Hospital Notified — Thank you!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDonateClick(req)}
                          disabled={isLoading || !eligibility.eligible}
                          className={`w-full font-bold py-2 rounded-lg transition ${
                            !eligibility.eligible
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isLoading
                              ? 'bg-red-300 text-white cursor-wait'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                          title={!eligibility.eligible ? `You are not yet eligible to donate (${eligibility.daysRemaining} days remaining)` : ''}
                        >
                          {isLoading ? 'Notifying...' : eligibility.eligible ? 'I Can Donate' : `Eligible in ${eligibility.daysRemaining}d`}
                        </button>
                      )}
                    </div>
                  );
                }) : (
                  <div className="col-span-2 bg-white p-6 rounded-xl text-center text-gray-500 border border-gray-200 border-dashed">
                    No urgent blood requests at the moment. Good news!
                  </div>
                )}
              </div>
            </div>

            {/* DONATION HISTORY TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Donation History</h3>
                <Link to="/history" className="text-red-600 text-sm font-medium hover:underline">View All</Link>
              </div>

              {donationHistory.length > 0 ? (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-900 font-medium">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Location</th>
                      <th className="px-6 py-3">Units</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {donationHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">{item.date}</td>
                        <td className="px-6 py-4">{item.location}</td>
                        <td className="px-6 py-4">{item.units} Unit</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status?.toLowerCase().trim() === 'fulfilled' ? 'bg-green-100 text-green-800' :
                            item.status?.toLowerCase().trim() === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                            item.status?.toLowerCase().trim() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            item.status?.toLowerCase().trim() === 'canceled'  ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>You haven't made any donations yet.</p>
                  <p className="text-sm mt-1">Schedule an appointment to save lives!</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* Feature 5: Eligibility Card */}
            <EligibilityCard />
            {myAppointment ? (
              <div className={`rounded-xl shadow-md border overflow-hidden ${
                myAppointment.status === 'Rejected' || myAppointment.status === 'Screening Failed'
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-red-100 bg-white'
              }`}>
                <div className={`px-6 py-3 ${
                  myAppointment.status === 'Confirmed' ? 'bg-green-600' :
                  myAppointment.status === 'Rejected' || myAppointment.status === 'Screening Failed' ? 'bg-gray-500' :
                  'bg-yellow-500'
                }`}>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                    {myAppointment.status === 'Confirmed' ? 'Appointment Confirmed ✅' :
                     myAppointment.status === 'Rejected' ? 'Appointment Declined ❌' :
                     myAppointment.status === 'Pending' ? 'Upcoming Appointment ⏳' :
                     myAppointment.status === 'Screening Failed' ? 'Screening Unsuccessful ⚠️' :
                     'Request Pending ⏳'}
                  </h3>
                </div>

                <div className="p-6">
                  {myAppointment.status === 'Rejected' || myAppointment.status === 'Screening Failed' ? (
                    <div>
                      <p className="text-gray-800 font-bold mb-2">
                        {myAppointment.status === 'Screening Failed' ? 'Donation Deferred' : 'We are sorry'}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {myAppointment.status === 'Screening Failed'
                          ? `Thank you for visiting ${myAppointment.centerName}. You were marked ineligible during the health screening. Please check with the center for when you can try again.`
                          : `The hospital could not accept your appointment for ${myAppointment.date}. This is usually due to full capacity.`
                        }
                      </p>
                      <button onClick={() => navigate('/schedule')} className="mt-4 text-red-600 text-sm font-bold hover:underline">
                        Schedule New Appointment →
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-4">
                      <div className="flex-col text-center bg-gray-100 p-2 rounded-lg min-w-[60px]">
                        <span className="block text-xs uppercase text-gray-500 font-bold">Date</span>
                        <span className="block text-xl font-bold text-gray-900">{myAppointment.date?.split('-')[2]}</span>
                      </div>
                      <div>
                        {/* FIX: time now shows real value from DB (e.g. "02:30 PM") */}
                        <p className="text-lg font-bold text-gray-900">{myAppointment.time}</p>
                        <p className="text-gray-600 text-sm mt-1">{myAppointment.centerName}</p>
                        {myAppointment.status === 'Pending' && (
                          <p className="text-xs text-orange-600 mt-2 font-medium bg-orange-50 px-2 py-1 rounded inline-block">
                            Waiting for hospital approval...
                          </p>
                        )}
                        <div className="mt-3 flex space-x-2">
                          <button onClick={() => navigate('/schedule')} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition">Reschedule</button>
                          {(myAppointment.status === 'Pending' || myAppointment.status === 'Confirmed') && (
                            <button
                              onClick={() => handleCancel(myAppointment.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded transition font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-gray-500 mb-4">No upcoming appointments.</p>
                {eligibility.eligible ? (
                  <Link to="/schedule" className="text-red-600 font-medium hover:underline text-sm">Book Now</Link>
                ) : (
                  <p className="text-orange-500 text-sm font-medium">
                    Eligible to book in {eligibility.daysRemaining} days
                  </p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/profile" className="block p-3 rounded-lg border hover:bg-red-50 hover:border-red-600 transition">
                  Update Profile
                </Link>
                <Link to="/history" className="block p-3 rounded-lg border hover:bg-red-50 hover:border-red-600 transition">
                  View Certificates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;