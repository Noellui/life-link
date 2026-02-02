import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DonorDashboard = () => {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState({
    name: "Loading...",
    email: "", 
    bloodType: "...",
    city: "Vadodara",
    id: "..."
  });

  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, lives: 0, lastDate: 'N/A' });
  const [myAppointment, setMyAppointment] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]); 

  // --- HELPER: Get Logged-In User ---
  const getLoggedInUser = () => {
    const storedUser = localStorage.getItem('user_data');
    return storedUser ? JSON.parse(storedUser) : null;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const loggedInUser = getLoggedInUser();
      if (!loggedInUser || !loggedInUser.email) {
        navigate('/login');
        return;
      }

      try {
        const email = loggedInUser.email;

        const statsRes = await fetch(`http://127.0.0.1:8000/api/donor/stats/?email=${email}`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setUser({
            name: data.user_details.name,
            email: email,
            bloodType: data.user_details.bloodType,
            city: data.user_details.city,
            id: data.user_details.id
          });
        }

        const reqRes = await fetch('http://127.0.0.1:8000/api/donor/requests/');
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setNearbyRequests(reqData);
        }

        // --- 3. FETCH UPCOMING APPOINTMENTS ---
        const appRes = await fetch(`http://127.0.0.1:8000/api/donor/appointments/?email=${email}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          // Find the first appointment that isn't canceled to show in the 'Upcoming' card
          const activeAppointment = appData.find(app => app.status !== 'Canceled');
          setMyAppointment(activeAppointment || null);
        }

        // --- 4. FETCH FULL HISTORY (ALL STATUSES) ---
        const histRes = await fetch(`http://127.0.0.1:8000/api/donor/history/?email=${email}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setDonationHistory(histData);
        }

      } catch (err) {
        console.error("Dashboard Connection Error:", err);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // --- HANDLE CANCEL ---
  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/donor/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        alert("Appointment canceled successfully.");
        window.location.reload(); 
      } else {
        alert("Failed to cancel appointment.");
      }
    } catch (err) {
      console.error("Cancel Error:", err);
    }
  };

  const handleDonateClick = (reqId) => {
    alert(`Thank you! The hospital has been notified that you are interested in Request #${reqId}.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">
              Donor ID: <span className="font-mono text-gray-700">{user.id}</span> • Blood Type: <span className="font-bold text-red-600">{user.bloodType}</span> • City: <span className="font-bold text-red-600">{user.city}</span>
            </p>
          </div>
          <Link to="/schedule" className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition shadow-md w-full md:w-auto text-center">+ Schedule Donation</Link>
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
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                Urgent Blood Needed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nearbyRequests.length > 0 ? nearbyRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl shadow-sm border border-red-100 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{req.urgency}</span></div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{req.patientName}</h3>
                    <p className="text-sm text-gray-500 mb-4">{req.city} • <strong>{req.bloodGroup}</strong> ({req.units} Units)</p>
                    <button onClick={() => handleDonateClick(req.id)} className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700">I Can Donate</button>
                  </div>
                )) : (
                  <div className="col-span-2 bg-white p-6 rounded-xl text-center text-gray-500 border border-gray-200 border-dashed">
                    No urgent blood requests at the moment. Good news!
                  </div>
                )}
              </div>
            </div>

            {/* DONATION HISTORY TABLE (NOW SHOWING ALL STATUSES) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Donation History</h3>
                <Link to="/history" className="text-red-600 text-sm font-medium hover:underline">View All</Link>
              </div>
              
              {donationHistory.length > 0 ? (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-900 font-medium"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Location</th><th className="px-6 py-3">Units</th><th className="px-6 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {donationHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">{item.date}</td>
                        <td className="px-6 py-4">{item.location}</td>
                        <td className="px-6 py-4">{item.units} Unit</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            // Using .toLowerCase() and .trim() makes the check bulletproof
                            item.status?.toLowerCase().trim() === 'fulfilled' ? 'bg-green-100 text-green-800' :
                            item.status?.toLowerCase().trim() === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                            item.status?.toLowerCase().trim() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            item.status?.toLowerCase().trim() === 'canceled'  ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800' // This remains for 'Rejected' or 'Screening Failed'
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

          <div className="space-y-6">
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
                    {
                    myAppointment.status === 'Confirmed' ? 'Appointment Confirmed ✅' : 
                     myAppointment.status === 'Rejected' ? 'Appointment Declined ❌' : 
                     myAppointment.status === 'Pending' ? 'Upcoming appointment ⏳' : 
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
                          ? `Thank you for visiting ${myAppointment.centerName}. You were marked ineligible during the health screening today. Please check with the center for when you can try again.`
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
                        <span className="block text-xl font-bold text-gray-900">{myAppointment.date.split('-')[2]}</span>
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
                <Link to="/schedule" className="text-red-600 font-medium hover:underline text-sm">Book Now</Link>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/profile" className="block p-3 rounded-lg border hover:bg-red-50 hover:border-red-600 transition">Update Profile</Link>
                <Link to="/history" className="block p-3 rounded-lg border hover:bg-red-50 hover:border-red-600 transition">View Certificates</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;