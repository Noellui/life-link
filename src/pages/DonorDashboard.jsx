import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DonorDashboard = () => {
  const navigate = useNavigate();

  // --- MOCK DATA ---
  const [user] = useState({
    name: "Noel Louis",
    bloodType: "O+",
    totalDonations: 5,
    livesSaved: 15,
    lastDonation: "2025-11-15",
  });

  // Appointment State (can be null if no appointment exists)
  const [upcomingAppointment, setUpcomingAppointment] = useState({
    id: 101,
    date: "24",
    month: "Nov",
    time: "10:00 AM",
    location: "City Civil Hospital, Ahmedabad",
    status: "Confirmed"
  });

  const [donationHistory] = useState([
    { id: 1, date: "2023-08-15", location: "Red Cross Camp", units: 1, status: "Completed" },
    { id: 2, date: "2023-02-10", location: "City Civil Hospital", units: 1, status: "Completed" },
    { id: 3, date: "2022-09-05", location: "Community Hall Drive", units: 1, status: "Completed" },
  ]);

  // --- HANDLERS ---
  const handleReschedule = () => {
    navigate('/schedule', { state: { appointment: upcomingAppointment } });
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel your upcoming appointment?")) {
      setUpcomingAppointment(null); // Remove the appointment card
      alert("Appointment cancelled successfully.");
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* 1. Dashboard Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">
              Donor ID: #DN-2023-8492 • Blood Type: <span className="font-bold text-red-600">{user.bloodType}</span>
            </p>
          </div>
          <Link 
            to="/schedule" 
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition shadow-md w-full md:w-auto text-center"
          >
            + Schedule New Donation
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* 2. Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 text-2xl">🩸</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900">{user.totalDonations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 text-2xl">❤️</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Lives Impacted</p>
                <p className="text-2xl font-bold text-gray-900">{user.livesSaved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 text-2xl">📅</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Donation</p>
                <p className="text-2xl font-bold text-gray-900">{user.lastDonation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. Main Column: Donation History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Donation History</h3>
                <Link to="/history" className="text-red-600 text-sm font-medium hover:underline">View All</Link>
              </div>
              <div className="overflow-x-auto">
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
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">{item.date}</td>
                        <td className="px-6 py-4">{item.location}</td>
                        <td className="px-6 py-4">{item.units} Unit</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. Sidebar Column: Upcoming Appt & Actions */}
          <div className="space-y-6">
            
            {/* Upcoming Appointment Card (Conditional Render) */}
            {upcomingAppointment ? (
              <div className="bg-white rounded-xl shadow-md border border-red-100 overflow-hidden">
                <div className="bg-red-600 px-6 py-3">
                  <h3 className="text-white font-bold text-sm uppercase tracking-wide">Next Appointment</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-col text-center bg-gray-100 p-2 rounded-lg min-w-[60px]">
                      <span className="block text-xs uppercase text-gray-500 font-bold">{upcomingAppointment.month}</span>
                      <span className="block text-2xl font-bold text-gray-900">{upcomingAppointment.date}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{upcomingAppointment.time}</p>
                      <p className="text-gray-600 text-sm mt-1">{upcomingAppointment.location}</p>
                      <div className="mt-3 flex space-x-2">
                         <button 
                           onClick={handleReschedule}
                           className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition"
                         >
                           Reschedule
                         </button>
                         <button 
                           onClick={handleCancel}
                           className="text-xs text-red-600 hover:text-red-800 px-2 py-1 transition"
                         >
                           Cancel
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Empty State Card
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-gray-500 mb-4">No upcoming appointments.</p>
                <Link to="/schedule" className="text-red-600 font-medium hover:underline text-sm">
                  Book Now
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
    
                {/* UPDATED: Changed to "Update Profile" and made it a Link */}
                <Link to="/profile" className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-red-600 hover:bg-red-50 transition group">
                  <span className="text-gray-700 font-medium group-hover:text-red-600">Update Profile</span>
                  <span className="text-gray-400">→</span>
                </Link>

                <button className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-red-600 hover:bg-red-50 transition group">
                  <span className="text-gray-700 font-medium group-hover:text-red-600">Download Donor Card</span>
                <span className="text-gray-400">→</span>
                </button>
    
                <Link to="/history" className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-red-600 hover:bg-red-50 transition group">
                 <span className="text-gray-700 font-medium group-hover:text-red-600">View Certificates</span>
                  <span className="text-gray-400">→</span>
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