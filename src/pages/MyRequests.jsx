import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MyRequests = () => {
  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. LOAD & FILTER REQUESTS ---
  useEffect(() => {
    // A. Get Logged-In User
    const currentUser = JSON.parse(localStorage.getItem('lifeLinkUser'));
    const userName = currentUser?.name || "Anjali Gupta"; // Default for testing

    // B. Fetch Global Requests
    const storedRequests = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');

    // C. Filter: Only show requests for THIS user
    // (Matches if the Patient Name is the user's name)
    const myRequests = storedRequests.filter(req => 
      req.patientName && req.patientName.toLowerCase() === userName.toLowerCase()
    );

    // D. Map to UI Format (Handling different data shapes)
    const formattedRequests = myRequests.map(req => ({
      id: req.id,
      date: req.date || new Date().toISOString().split('T')[0],
      hospital: req.hospitalName || "General Broadcast", // 'General Broadcast' if sent to all
      bloodType: req.bloodGroup,
      units: req.units,
      status: req.status || "Pending",
      urgency: req.urgency,
      notes: req.status === 'Pending' 
        ? "Waiting for a donor response..." 
        : "Hospital has engaged with this request."
    }));

    // E. Add Default Mock Data if empty (So the page isn't blank for the demo)
    if (formattedRequests.length === 0) {
      formattedRequests.push(
        { 
          id: 101, date: "2025-01-24", hospital: "City General Hospital", 
          bloodType: "B+", units: 2, status: "Approved", urgency: "High", 
          notes: "Donors notified. Please wait for confirmation."
        },
        { 
          id: 98, date: "2024-11-10", hospital: "Sterling Hospital", 
          bloodType: "B+", units: 1, status: "Fulfilled", urgency: "Routine", 
          notes: "Transfusion completed successfully."
        }
      );
    }

    setRequests(formattedRequests);
    setLoading(false);
  }, []);

  // Helper for Status Colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Fulfilled': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-200';
      case 'Pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Request History 🩸</h1>
            <p className="text-gray-500 text-sm mt-1">Track the status of your current and past blood requisitions.</p>
          </div>
          <Link to="/dashboard/recipient" className="text-gray-600 hover:text-gray-900 font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  
                  {/* Left: ID and Status */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-mono text-gray-400">#{req.id}</span>
                      <span className="text-xs font-medium text-gray-500">{req.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{req.hospital}</h3>
                  </div>

                  {/* Middle: Blood Details */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 uppercase font-bold">Type</div>
                      <div className="text-xl font-black text-red-600">{req.bloodType}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 uppercase font-bold">Units</div>
                      <div className="text-xl font-bold text-gray-800">{req.units}</div>
                    </div>
                  </div>

                  {/* Right: Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                       {req.status}
                     </span>
                     <span className={`text-xs font-bold ${req.urgency === 'Critical' ? 'text-red-600' : 'text-gray-500'}`}>
                       {req.urgency} Urgency
                     </span>
                  </div>
                </div>

                {/* Footer: Notes */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">ℹ️</span>
                  <p className="text-sm text-gray-600 italic">
                    {req.notes}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">You haven't made any requests yet.</p>
            <Link to="/request-blood" className="text-red-600 font-bold hover:underline mt-2 inline-block">
              Make your first request
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyRequests;