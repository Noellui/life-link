import React, { useState, useEffect } from 'react';

const HospitalAppointments = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const storedApps = JSON.parse(localStorage.getItem('donor_appointments') || '[]');
    setAppointments(storedApps);
  }, []);

  // Generic Status Updater
  const updateStatus = (id, newStatus) => {
    const updatedList = appointments.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    );
    setAppointments(updatedList);
    localStorage.setItem('donor_appointments', JSON.stringify(updatedList));
  };

  // --- OPTION 1: SUCCESSFUL DONATION ---
  const handleDonated = (appointment) => {
    if(!window.confirm(`Confirm that ${appointment.donorName} has successfully donated?`)) return;

    // 1. Update Appointment Status
    updateStatus(appointment.id, 'Fulfilled');

    // 2. ADD TO STOCK LOGS (Inventory Update)
    const logEntry = {
      id: Date.now(),
      type: 'Incoming',
      source: `Appt: ${appointment.centerName}`,
      person: appointment.donorName,
      email: appointment.donorEmail,
      bloodGroup: 'O+', // In a real app, this would be input by the nurse
      quantity: 450,
      time: new Date().toLocaleString()
    };

    const currentLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
    localStorage.setItem('stock_logs', JSON.stringify([logEntry, ...currentLogs]));

    alert("✅ Donation Recorded! Inventory updated.");
  };

  // --- OPTION 2: FAILED SCREENING ---
  const handleFailedScreening = (id) => {
    if(!window.confirm("Mark this donor as failed screening? (e.g. Low Hemoglobin, BP issues)")) return;
    
    // Just update status, do NOT add to stock
    updateStatus(id, 'Screening Failed');
  };

  // Helper for Status Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Fulfilled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Screening Failed': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Appointment Requests 📅</h1>
      <p className="text-gray-500 mb-8">Manage donor flow: Approve requests, conduct screenings, and record donations.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Donor</th>
              <th className="px-6 py-4">Slot</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments.length === 0 ? (
               <tr><td colSpan="5" className="p-8 text-center text-gray-400">No appointments found.</td></tr>
            ) : (
              appointments.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-500">{app.requestDate}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{app.donorName}</td>
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
                    
                    {/* STATE 1: PENDING (Approve/Reject Request) */}
                    {app.status === 'Pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => updateStatus(app.id, 'Confirmed')} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 shadow-sm">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(app.id, 'Rejected')} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 hover:text-red-600 transition">
                          Reject
                        </button>
                      </div>
                    )}

                    {/* STATE 2: CONFIRMED (Screening Outcome) */}
                    {app.status === 'Confirmed' && (
                      <div className="flex justify-end gap-2">
                        {/* Option 1: Passed */}
                        <button 
                          onClick={() => handleDonated(app)} 
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1"
                        >
                          <span>🩸</span> Mark Donated
                        </button>
                        
                        {/* Option 2: Failed */}
                        <button 
                          onClick={() => handleFailedScreening(app.id)} 
                          className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-100 transition"
                        >
                          Failed Screening
                        </button>
                      </div>
                    )}

                    {/* STATE 3: COMPLETED STATES */}
                    {app.status === 'Fulfilled' && <span className="text-xs text-green-600 font-bold">Stock Added ✅</span>}
                    {app.status === 'Screening Failed' && <span className="text-xs text-orange-600 font-bold">Not Eligible ⚠️</span>}
                    {app.status === 'Rejected' && <span className="text-xs text-gray-400 italic">Request Declined</span>}

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