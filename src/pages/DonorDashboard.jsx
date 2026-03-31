import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

  // Loaded from DB on mount so all ports/browsers stay in sync
  const [interestedIds, setInterestedIds] = useState([]);
  const [interestLoading, setInterestLoading] = useState(null);

  const [eligibility, setEligibility] = useState({
    eligible: true,
    daysRemaining: 0,
    nextEligibleDate: null,
  });

  const getLoggedInUser = () => {
    const s = localStorage.getItem('user_data');
    return s ? JSON.parse(s) : null;
  };

  const fetchAppointments = async (email) => {
    const appRes = await fetch(`http://127.0.0.1:8000/api/donor/appointments/?email=${email}`);
    if (appRes.ok) {
      const appData = await appRes.json();
      setMyAppointment(appData.find(a => a.status !== 'Canceled') || null);
    }
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

        const reqRes = await fetch(`http://127.0.0.1:8000/api/donor/requests/?email=${email}`);
        if (reqRes.ok) setNearbyRequests(await reqRes.json());

        await fetchAppointments(email);

        const histRes = await fetch(`http://127.0.0.1:8000/api/donor/history/?email=${email}`);
        if (histRes.ok) setDonationHistory(await histRes.json());

        const eligRes = await fetch(`http://127.0.0.1:8000/api/donor/eligibility/?email=${email}`);
        if (eligRes.ok) setEligibility(await eligRes.json());

        // Load already-responded request IDs from DB — synced across all ports/browsers
        const interestsRes = await fetch(`http://127.0.0.1:8000/api/donor/my-interests/?email=${email}`);
        if (interestsRes.ok) {
          const ids = await interestsRes.json();
          setInterestedIds(ids);
        }

      } catch (err) {
        console.error('Dashboard Connection Error:', err);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // --- FIXED: Handle "I Can Donate" — no fake success on failure ---
  const handleDonateClick = async (req) => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser?.email) return navigate('/login');

    const email = loggedInUser.email;
    setInterestLoading(req.id);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/donor/interest/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, requestId: req.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server responded with an error (4xx/5xx)
        alert(`❌ Could not register interest: ${data.error || 'Server error. Please try again.'}`);
        return;
      }

      // Only mark as responded if backend confirmed success
      alert(`✅ ${data.message}`);
      const updated = [...new Set([...interestedIds, req.id])];
      setInterestedIds(updated);
      // No localStorage needed — DB is the source of truth

      await fetchAppointments(email);

    } catch (err) {
      // Network/connection error — Django is likely not running
      console.error('Interest submission failed:', err);
      alert('❌ Could not connect to the server. Please make sure the Django server is running and try again.');
      // Do NOT mark as responded — nothing was saved in the DB
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

  const EligibilityCard = () => {
    const { eligible, daysRemaining, nextEligibleDate, lastDonation } = eligibility;
    const progressPct = eligible ? 100 : Math.round(((52 - daysRemaining) / 52) * 100);

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
                Whole blood donors must wait 52 days between donations to ensure full recovery.
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
            className={`px-6 py-2 rounded-lg font-medium transition shadow-md w-full md:w-auto text-center ${eligibility.eligible
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
            {/* URGENT REQUESTS */}
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
                          className={`w-full font-bold py-2 rounded-lg transition ${!eligibility.eligible
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
                      <th className="px-6 py-3 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {donationHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">{item.date}</td>
                        <td className="px-6 py-4">{item.location}</td>
                        <td className="px-6 py-4">{item.units} Unit</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status?.toLowerCase().trim() === 'fulfilled' ? 'bg-green-100 text-green-800' :
                            item.status?.toLowerCase().trim() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              item.status?.toLowerCase().trim() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                item.status?.toLowerCase().trim() === 'canceled' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.status?.toLowerCase().trim() === 'fulfilled' ? (
                            <button
                              onClick={() => printCertificate(item, user.name)}
                              className="text-red-600 hover:text-red-800 font-bold flex items-center justify-end gap-1 ml-auto"
                            >
                              Print <span className="text-lg">🖨️</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">Not Available</span>
                          )}
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
            <EligibilityCard />
            {myAppointment ? (
              <div className={`rounded-xl shadow-md border overflow-hidden ${myAppointment.status === 'Rejected' || myAppointment.status === 'Screening Failed'
                ? 'border-gray-200 bg-gray-50'
                : 'border-red-100 bg-white'
                }`}>
                <div className={`px-6 py-3 ${myAppointment.status === 'Confirmed' ? 'bg-green-600' :
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

const printCertificate = (record, userName) => {
  if (!record || !record.id) {
    alert('Invalid donation record');
    return;
  }

  const donorName = userName || 'Valued Donor';
  const donationDate = record.date || 'N/A';
  const hospital = record.location || 'LifeLink Center';
  const certId = `LL-${String(record.id).padStart(5, '0')}`;
  const issueDate = new Date().toLocaleDateString('en-GB');

  const printWindow = window.open('', '_blank');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>LifeLink Certificate - ${donorName}</title>
        <style>
            @page { size: A4 landscape; margin: 0; }
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: 'Helvetica', Arial, sans-serif;
                background-color: #fff;
            }
            :root {
                --brand-red: #8c0000;
                --text-dark: #282828;
                --text-gray: #646464;
                --border-light: #969696;
            }
            .certificate { width: 297mm; height: 210mm; background: white; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; }
            /* The header-bar class has been removed */
            
            .frame { margin: 5mm; flex-grow: 1; border: 2mm solid var(--brand-red); position: relative; display: flex; flex-direction: column; align-items: center; padding: 10mm; box-sizing: border-box; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: 900; color: rgba(0,0,0,0.03); z-index: 0; white-space: nowrap; pointer-events: none; }
            
            /* Added margin-top to content to balance the vertical spacing */
            .content { z-index: 1; text-align: center; width: 100%; margin-top: 15mm; }
            
            h1 { font-family: 'Times New Roman', serif; font-size: 36pt; margin: 10mm 0 5mm 0; color: var(--text-dark); }
            .subtitle { font-size: 16pt; color: var(--text-gray); margin-bottom: 8mm; }
            .donor-name { font-family: 'Times New Roman', serif; font-style: italic; font-size: 52pt; color: var(--brand-red); margin-bottom: 8mm; border-bottom: 1px solid var(--brand-red); display: inline-block; padding: 0 20mm; }
            .details { font-size: 14pt; line-height: 1.6; color: var(--text-gray); }
            .bottom-row { margin-top: auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; padding-bottom: 10mm; }
            .meta-data { text-align: left; font-size: 10pt; color: var(--text-gray); }
            
            /* New class for discreet lifelink branding */
            .discreet-branding { font-size: 9pt; font-style: italic; color: var(--border-light); margin-top: 4mm; }
            
            .seal { display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .seal-circle { width: 30mm; height: 30mm; border: 0.5mm solid var(--brand-red); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: var(--brand-red); }
            .signature { text-align: center; }
            .sig-line { border-top: 0.5mm solid var(--border-light); margin-bottom: 2mm; width: 60mm; margin-left: auto; margin-right: auto; }
            .sig-text { font-size: 10pt; font-weight: bold; }
            .sig-subtext { font-size: 9pt; font-style: italic; color: var(--text-gray); }
            .footer-note { font-size: 8pt; color: var(--border-light); position: absolute; bottom: 2mm; width: 100%; text-align: center; }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="frame">
                <div class="watermark">LIFELINK</div>
                <div class="content">
                    <h1>CERTIFICATE OF APPRECIATION</h1>
                    <p class="subtitle">This record of honor is proudly presented to</p>
                    <div class="donor-name">${donorName}</div>
                    <div class="details">For the heroic act of donating — Blood on ${donationDate}.<br>Recorded at ${hospital}.</div>
                </div>
                <div class="bottom-row">
                    <div class="meta-data">
                        Issued: ${issueDate}<br>
                        Cert ID: ${certId}
                        <div class="discreet-branding">Issued by LifeLink</div>
                    </div>
                    <div class="seal"><div class="seal-circle"><span>OFFICIAL</span><span>VERIFIED</span></div></div>
                    <div class="signature">
                        <div class="sig-line"></div>
                        <div class="sig-text">Director of Operations</div>
                        <div class="sig-subtext">LifeLink Authority</div>
                    </div>
                </div>
            </div>
            <div class="footer-note">This is a computer-generated document. No physical signature is required for validity.</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default DonorDashboard;
export { printCertificate };