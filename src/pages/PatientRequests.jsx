import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PatientRequests = () => {
  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');

  // --- 1. LOAD DATA (Dynamic + Fallback) ---
  useEffect(() => {
    // A. Fetch Live Requests (Created by Patients/Recipients)
    const storedRequests = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');

    // B. Fallback Data (For Demo)
    const defaultRequests = [
      { id: 101, patientName: "Sarah Jenkins", age: 34, gender: "Female", bloodGroup: "A-", units: 2, doctor: "Dr. Smith", urgency: "High", status: "Pending", date: "2026-01-22" },
      { id: 102, patientName: "Mike Ross", age: 28, gender: "Male", bloodGroup: "O+", units: 1, doctor: "Dr. Zane", urgency: "Routine", status: "Pending", date: "2026-01-23" },
    ];

    // C. Merge & Format (Ensuring consistent keys)
    const allRequests = [...storedRequests, ...defaultRequests].map(req => ({
      ...req,
      // Handle legacy keys if they exist
      patient: req.patientName || req.patient, 
      bloodType: req.bloodGroup || req.bloodType,
      age: req.age || 30, // Default if missing
      gender: req.gender || "Unknown",
      doctor: req.doctor || "External Request",
      date: req.date || new Date().toLocaleDateString()
    }));

    // Remove duplicates based on ID
    const uniqueRequests = Array.from(new Map(allRequests.map(item => [item.id, item])).values());
    
    setRequests(uniqueRequests);
  }, []);

  // --- 2. HANDLE ACTIONS (Approve/Reject) ---
  const handleAction = (id, newStatus) => {
    const message = newStatus === 'Pending' 
      ? "Undo this action?" 
      : `Are you sure you want to ${newStatus} this request?`;

    if (window.confirm(message)) {
      
      // A. Update UI Locally
      const updatedList = requests.map(req => 
        req.id === id ? { ...req, status: newStatus } : req
      );
      setRequests(updatedList);

      // B. Update Global Storage (So Patient sees status change)
      // We filter out the default demo IDs (101, 102) to avoid cluttering local storage with them if they weren't there
      const liveToSave = updatedList.filter(r => r.id > 1000); // Assuming live IDs are timestamps (large numbers)
      // Or simply save everything that was originally in local storage + updates
      
      // Better approach: Read current LS, find item, update it
      const currentLS = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');
      const updatedLS = currentLS.map(req => req.id === id ? { ...req, status: newStatus } : req);
      localStorage.setItem('live_blood_requests', JSON.stringify(updatedLS));

      // C. LOG TO STOCK HISTORY (If Approved -> Outgoing Stock)
      if (newStatus === 'Approved') {
        const reqItem = requests.find(r => r.id === id);
        
        const logEntry = {
          id: Date.now(),
          type: 'Outgoing', // Reduces Inventory
          source: `Req #${reqItem.id}: ${reqItem.patient}`,
          person: reqItem.patient,
          email: reqItem.email || "N/A",
          bloodGroup: reqItem.bloodType,
          quantity: parseInt(reqItem.units) * 450, // Convert units to ml (approx)
          time: new Date().toLocaleString()
        };

        const stockLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
        localStorage.setItem('stock_logs', JSON.stringify([logEntry, ...stockLogs]));
        
        alert(`Request Approved! Stock deducted for ${reqItem.bloodType}.`);
      }
    }
  };

  // --- FILTER LOGIC ---
  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'All') return true;
    return req.status === filterStatus;
  });

  // Helper for Urgency Badge Color
  const getUrgencyColor = (level) => {
    switch(level) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Requisitions 📋</h1>
            <p className="text-gray-500 text-sm mt-1">Manage and process blood requests from hospital departments.</p>
          </div>
          <Link to="/dashboard/hospital" className="text-gray-600 hover:text-gray-900 font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-4 flex gap-2 overflow-x-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filterStatus === status 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID / Date</th>
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">Requirement</th>
                  <th className="px-6 py-4">Doctor/Source</th>
                  <th className="px-6 py-4">Urgency</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    
                    {/* ID & Date */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-gray-500">#{req.id.toString().substr(-4)}</span>
                      <div className="text-xs text-gray-400 mt-1">{req.date}</div>
                    </td>

                    {/* Patient */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{req.patient}</div>
                      <div className="text-xs text-gray-500">{req.gender}, {req.age} yrs</div>
                    </td>

                    {/* Requirement */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-red-600">{req.bloodType}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-700">{req.units} Units</span>
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="px-6 py-4">{req.doctor}</td>

                    {/* Urgency */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(req.urgency)}`}>
                        {req.urgency}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                        req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {req.status === 'Approved' && '✅'}
                        {req.status === 'Rejected' && '❌'}
                        {req.status === 'Pending' && '⏳'}
                        {req.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleAction(req.id, 'Approved')}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-green-700 shadow-sm transition"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(req.id, 'Rejected')}
                            className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">Processed</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No requests found with status "{filterStatus}".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRequests;