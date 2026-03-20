import React, { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const HospitalAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [subscription, setSubscription] = useState({ status: 'Active', endDate: '' });
  const [subLoading, setSubLoading] = useState(true);

  const getHospitalEmail = () => {
    const stored =
      JSON.parse(localStorage.getItem('user_data') || 'null') ||
      JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    return stored?.email || '';
  };

  const fetchSubscription = useCallback(async () => {
    const email = getHospitalEmail();
    if (!email) return;
    try {
      setSubLoading(true);
      const res = await fetch(`${BASE_URL}/api/hospital/subscription/?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Subscription check failed:', err);
    } finally {
      setSubLoading(false);
    }
  }, []);

  const handleRenew = async () => {
    const email = getHospitalEmail();
    try {
      const res = await fetch(`${BASE_URL}/api/hospital/subscription/renew/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        alert('✅ Subscription Renewed successfully!');
        fetchSubscription();
      } else {
        throw new Error('Renewal failed');
      }
    } catch (err) {
      alert('Renewal failed. Please try again.');
    }
  };

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
    fetchSubscription();
    fetchAppointments();
  }, [fetchSubscription, fetchAppointments]);

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
      const data = await res.json();

      setAppointments(prev =>
        prev.map(app =>
          app.id === appointmentId ? { ...app, status: newStatus } : app
        )
      );

      // Show deferral notice to the hospital user for their records
      if (newStatus === 'Screening Failed' && data.deferralUntil) {
        alert(
          `⚠️ Donor marked as Screening Failed.\n\n` +
          `Deferral period: 14 days (eligible again from ${data.deferralUntil}).\n\n` +
          `If this appointment was linked to a blood request, it has been automatically re-broadcast to other donors.`
        );
      }
    } catch (err) {
      alert('Failed to update appointment status. Please try again.');
    }
  };

  // FIXED: correct URL for transfusion endpoint
  const handleConfirmTransfusion = async (appointmentId, requestId) => {
    if (!window.confirm("Confirm that the transfusion is complete? This will finalize the process and generate an invoice.")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/hospital/appointments/transfusion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, requestId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Confirmation failed');
      }

      setAppointments(prev =>
        prev.map(app => app.id === appointmentId ? { ...app, status: 'Transfusion Done' } : app)
      );
      alert('✅ Transfusion Recorded! The invoice has been generated.');
    } catch (err) {
      console.error('Transfusion error:', err);
      alert(`Failed to finalize transfusion: ${err.message}`);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/hospital/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Cancellation failed');
      }

      setAppointments(prev =>
        prev.map(app => app.id === appointmentId ? { ...app, status: 'Canceled' } : app)
      );
      alert('✅ Appointment Canceled successfully.');
    } catch (err) {
      console.error('Cancellation error:', err);
      alert(`Failed to cancel appointment: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Transfusion Done':  return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Screening Passed':  return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Confirmed':         return 'bg-green-100 text-green-800 border-green-200';
      case 'Screening Failed':  return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Rejected':          return 'bg-red-100 text-red-800 border-red-200';
      case 'Canceled':          return 'bg-gray-100 text-gray-500 border-gray-200';
      default:                  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (!subLoading && subscription.status === 'Expired') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Expired</h2>
          <p className="text-gray-600 mb-6">
            Your access to the donor portal has been suspended. Please renew your hospital subscription to continue managing appointments.
          </p>
          <button
            onClick={handleRenew}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition shadow-lg"
          >
            Pay ₹200 to Renew
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Appointment Requests 📅</h1>
          <p className="text-gray-500">
            Manage donor flow sequentially: Approve requests, conduct screenings, and finalize transfusions.
          </p>
        </div>
        {!subLoading && subscription.endDate && (
          <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border shadow-sm">
            Subscription Valid Until: <span className="text-gray-900">{subscription.endDate}</span>
          </div>
        )}
      </div>

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
                  <td className="px-6 py-4 text-sm text-gray-500">{app.requestDate || app.date}</td>

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

                    {/* STEP 1: PENDING -> Approve/Reject */}
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
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* STEP 2: CONFIRMED -> Pass/Fail Screening */}
                    {app.status === 'Confirmed' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => updateStatus(app.id, 'Screening Passed')}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm"
                        >
                          Pass Screening
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Mark this donor as failed screening?')) {
                              updateStatus(app.id, 'Screening Failed');
                            }
                          }}
                          className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-100 transition"
                        >
                          Fail Screening
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* STEP 3: SCREENING PASSED -> Confirm Transfusion */}
                    {app.status === 'Screening Passed' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleConfirmTransfusion(app.id, app.requestId || null)}
                          className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 shadow-sm flex items-center gap-1 animate-pulse"
                        >
                          <span>🩸</span> Confirm Transfusion
                        </button>
                      </div>
                    )}

                    {/* FINAL STATES */}
                    {app.status === 'Transfusion Done'  && <span className="text-xs text-purple-600 font-bold">Process Complete ✅</span>}
                    {app.status === 'Fulfilled'         && <span className="text-xs text-green-600 font-bold">Stock Added ✅</span>}
                    {app.status === 'Screening Failed'  && <span className="text-xs text-orange-600 font-bold">Not Eligible ⚠️</span>}
                    {app.status === 'Rejected'          && <span className="text-xs text-gray-400 italic">Request Declined</span>}
                    {app.status === 'Canceled'          && <span className="text-xs text-gray-400 italic">Canceled by Donor</span>}

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