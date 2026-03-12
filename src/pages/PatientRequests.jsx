import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = 'http://127.0.0.1:8000';

const PatientRequests = () => {
  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // --- GET LOGGED-IN HOSPITAL USER ---
  const getUser = () =>
    JSON.parse(localStorage.getItem('user_data') || localStorage.getItem('lifeLinkUser') || 'null');

  // --- FETCH REQUESTS FROM BACKEND ---
  const fetchRequests = useCallback(async () => {
    const user = getUser();
    if (!user?.email) {
      setError('Could not detect logged-in user. Please re-login.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/hospital/requests/?email=${encodeURIComponent(user.email)}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Server error: ${res.status}`);
        return;
      }

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError('Cannot connect to backend. Is Django running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // --- LOG TO LOCAL STOCK (Inventory Sync) ---
  const logStockMovement = (reqItem) => {
    const logEntry = {
      id: Date.now(),
      type: 'Outgoing',
      source: `Req #${String(reqItem.id).slice(-4)}: ${reqItem.patient}`,
      person: reqItem.patient,
      email: reqItem.email || "N/A",
      bloodGroup: reqItem.bloodGroup,
      quantity: parseInt(reqItem.units) * 450,
      time: new Date().toLocaleString()
    };

    const stockLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
    localStorage.setItem('stock_logs', JSON.stringify([logEntry, ...stockLogs]));
  };

  // --- APPROVE / REJECT ---
  const handleAction = async (id, newStatus) => {
    const confirmMsg =
      newStatus === 'Pending'
        ? 'Undo this action and revert to Pending?'
        : `Are you sure you want to mark this request as "${newStatus}"?`;

    if (!window.confirm(confirmMsg)) return;

    const user = getUser();
    const reqItem = requests.find(r => r.id === id);

    // Optimistic UI update
    setRequests(prev =>
      prev.map(req => (req.id === id ? { ...req, status: newStatus } : req))
    );

    try {
      const res = await fetch(`${BASE_URL}/api/requests/${id}/update-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, email: user?.email }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }

      if (newStatus === 'Approved' && reqItem) {
        logStockMovement(reqItem);
        alert(`Request Approved! Stock movement logged for ${reqItem.bloodGroup}.`);
      }
    } catch (err) {
      alert(`Error: ${err.message}. Reverting...`);
      fetchRequests();
    }
  };

  // --- FILTER ---
  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'All') return true;
    return req.status === filterStatus;
  });

  // --- HELPERS ---
  const getUrgencyColor = (level) => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High':     return 'bg-orange-100 text-orange-700 border-orange-200';
      default:         return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return { classes: 'bg-green-50 text-green-700 border-green-200', icon: '✅' };
      case 'Rejected':
        return { classes: 'bg-red-50 text-red-700 border-red-200', icon: '❌' };
      case 'Awaiting Payment':
        return { classes: 'bg-orange-50 text-orange-700 border-orange-200', icon: '💳' };
      case 'Fulfilled':
        return { classes: 'bg-green-600 text-white border-green-600', icon: '🎉' };
      default: // Pending
        return { classes: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '⏳' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Requisitions 📋</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage and process blood requests from hospital departments.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRequests}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
            >
              🔄 Refresh
            </button>
            <Link to="/dashboard/hospital" className="text-gray-600 hover:text-gray-900 font-medium">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-4 flex gap-2 overflow-x-auto">
          {['All', 'Pending', 'Approved', 'Awaiting Payment', 'Fulfilled', 'Rejected'].map(status => (
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
              {status !== 'All' && (
                <span className="ml-1 text-xs opacity-70">
                  ({requests.filter(r => r.status === status).length})
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400 whitespace-nowrap pr-1">
            {requests.length} total requests
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Loading requests from database…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4">ID / Date</th>
                    <th className="px-6 py-4">Patient Details</th>
                    <th className="px-6 py-4">Requirement</th>
                    <th className="px-6 py-4">Doctor / Source</th>
                    <th className="px-6 py-4">Urgency</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 transition">

                        <td className="px-6 py-4">
                          <span className="font-mono text-gray-500">
                            #{String(req.id).slice(-4)}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">{req.date}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{req.patient}</div>
                          <div className="text-xs text-gray-500">
                            {req.gender !== 'N/A' && req.gender ? `${req.gender}, ` : ''}
                            {req.age !== 'N/A' && req.age ? `${req.age} yrs` : 'Age N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-red-600">
                              {req.bloodGroup}
                            </span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-700">
                              {req.units} Unit{req.units > 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">{req.doctor || "N/A"}</td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(req.urgency)}`}
                          >
                            {req.urgency}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badge.classes}`}
                          >
                            {badge.icon}
                            {req.status}
                          </span>
                        </td>

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
                            <button
                              onClick={() => handleAction(req.id, 'Pending')}
                              className="text-xs text-gray-400 hover:text-blue-600 font-medium italic hover:not-italic transition"
                              title="Undo — revert to Pending"
                            >
                              ↩ Undo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && filteredRequests.length === 0 && (
                <div className="p-10 text-center text-gray-500">
                  <p className="text-lg font-medium">No requests found.</p>
                  <p className="text-sm mt-1 text-gray-400">
                    {requests.length === 0
                      ? "Waiting for new submissions..."
                      : `No requests with status "${filterStatus}".`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRequests;