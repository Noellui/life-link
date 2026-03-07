import React, { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const HospitalAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- GET LOGGED-IN HOSPITAL USER ---
  const getHospitalEmail = () => {
    const stored =
      JSON.parse(localStorage.getItem('user_data') || 'null') ||
      JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    return stored?.email || '';
  };

  // --- FETCH APPOINTMENTS FROM BACKEND ---
  const fetchAppointments = useCallback(async () => {
    const email = getHospitalEmail();
    if (!email) {
      setError('Could not identify logged-in hospital. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/hospital/appointments/?email=${encodeURIComponent(email)}`
      );
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load appointments. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // --- GENERIC STATUS UPDATER (Approve/Reject/Screening Failed) ---
  const updateStatus = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/hospital/appointments/${appointmentId}/update/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) throw new Error('Update failed');

      // Optimistic UI Update
      setAppointments(prev =>
        prev.map(app =>
          app.id === appointmentId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      alert('Failed to update appointment status. Please try again.');
    }
  };

  // --- SUCCESSFUL DONATION (Fulfill) ---
  const handleDonated = async (appointment) => {
    if (!window.confirm(`Confirm that ${appointment.donorName} has successfully donated?`)) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/hospital/appointments/${appointment.id}/fulfill/`,
        { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' } 
        }
      );

      if (!res.ok) throw new Error('Fulfill failed');

      setAppointments(prev =>
        prev.map(app =>
          app.id === appointment.id ? { ...app, status: 'Fulfilled' } : app
        )
      );
      alert('✅ Donation Recorded! Blood stock has been updated.');
    } catch (err) {
      alert('Failed to record donation. Please check server connection.');
    }
  };

  // --- FAILED SCREENING ---
  const handleFailedScreening = async (appointmentId) => {
    if (!window.confirm('Mark this donor as failed screening? (e.g. Low Hemoglobin, BP issues)')) return;
    await updateStatus(appointmentId, 'Screening Failed');
  };

  // --- HELPER: STATUS COLORS ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Fulfilled':        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Confirmed':        return 'bg-green-100 text-green-800 border-green-200';
      case 'Screening Failed': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Rejected':         return 'bg-red-100 text-red-800 border-red-200';
      case 'Canceled':         return 'bg-gray-100 text-gray-500 border-gray-200';
      default:                 return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Appointment Requests 📅</h1>
      <p className="text-gray-500 mb-8">
        Manage donor flow: Approve requests, conduct screenings, and record donations.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Donor</th>
              <th className="px-6 py-4">Blood Type</th>
              <th className="px-6 py-4">Slot</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-gray-400">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading appointments...</p>
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  No appointments found.
                </td>
              </tr>
            ) : (
              appointments.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-500">{app.requestDate}</td>
                  
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{app.donorName}</div>
                    <div className="text-xs text-gray-400">{app.donorEmail}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded text-xs">
                      {app.bloodType || 'N/A'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{app.date}</div>
                    <div className="text-xs text-gray-500">{app.time}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    
                    {/* PENDING: Approve/Reject */}
                    {app.status === 'Pending' && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => updateStatus(app.id, 'Confirmed')} 
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 shadow-sm"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'Rejected')} 
                          className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 hover:text-red-600 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* CONFIRMED: Mark Donated / Failed Screening */}
                    {app.status === 'Confirmed' && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDonated(app)} 
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1"
                        >
                          <span>🩸</span> Mark Donated
                        </button>
                        <button 
                          onClick={() => handleFailedScreening(app.id)} 
                          className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-100 transition"
                        >
                          Failed Screening
                        </button>
                      </div>
                    )}

                    {/* FINAL STATES */}
                    {app.status === 'Fulfilled' && <span className="text-xs text-green-600 font-bold">Stock Added ✅</span>}
                    {app.status === 'Screening Failed' && <span className="text-xs text-orange-600 font-bold">Not Eligible ⚠️</span>}
                    {app.status === 'Rejected' && <span className="text-xs text-gray-400 italic">Request Declined</span>}
                    {app.status === 'Canceled' && <span className="text-xs text-gray-400 italic">Canceled by Donor</span>}

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HospitalAppointments;