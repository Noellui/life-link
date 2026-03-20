import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = 'http://127.0.0.1:8000';

const STATUS_STYLES = {
  'Pending'          : 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Approved'         : 'bg-blue-100 text-blue-700 border-blue-200',
  'Processing'       : 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Awaiting Payment' : 'bg-orange-100 text-orange-700 border-orange-200',
  'Fulfilled'        : 'bg-green-100 text-green-700 border-green-200',
  'Transfusion Done' : 'bg-green-100 text-green-700 border-green-200',
  'Rejected'         : 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_NOTES = {
  'Pending'          : 'Your request has been submitted. Waiting for hospital approval.',
  'Approved'         : 'Donors notified. Please wait for confirmation.',
  'Processing'       : 'A donor has been matched and is undergoing screening.',
  'Awaiting Payment' : 'Transfusion completed successfully. Please pay your bill.',
  'Fulfilled'        : 'Transfusion completed successfully.',
  'Transfusion Done' : 'Transfusion completed successfully.',
  'Rejected'         : 'This request was not fulfilled. Please contact the hospital.',
};

// ---------------------------------------------------------------------------
// Nearby Stock Alert Banner
// ---------------------------------------------------------------------------
const NearbyStockBanner = ({ requestId, bloodGroup, donorInterestCount, requestDate }) => {
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Only bother calling if there's no donor interest at all
    if (donorInterestCount > 0) return;

    fetch(`${BASE_URL}/api/recipient/nearby-stock/?requestId=${requestId}`)
      .then(r => r.json())
      .then(data => setResult(data))
      .catch(() => {});
  }, [requestId, donorInterestCount]);

  if (!result?.eligible) return null;

  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 animate-pulse-slow">
      <div className="flex items-start gap-3">
        <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="font-bold text-amber-800 text-sm">
            No donors have responded to your {result.bloodGroup} request yet.
          </p>
          <p className="text-xs text-amber-700 mt-1 mb-3">
            Units of <strong>{result.bloodGroup}</strong> are currently available at the following hospitals —
            consider creating a new request directly targeting one of them:
          </p>
          <div className="space-y-2">
            {result.hospitals.length > 0 ? result.hospitals.map(h => (
              <div
                key={h.hospitalId}
                className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏥</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{h.hospitalName}</p>
                    <p className="text-xs text-gray-500">{h.city}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  {h.unitsAvailable} unit{h.unitsAvailable !== 1 ? 's' : ''} available
                </span>
              </div>
            )) : (
              <p className="text-xs text-amber-700 italic">
                No other hospital currently has {result.bloodGroup} units in stock.
              </p>
            )}
          </div>
          <Link
            to="/request-blood"
            className="inline-block mt-3 text-xs font-bold text-amber-700 underline hover:text-amber-900"
          >
            + Create a new targeted request →
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exhausted Options Banner — shown after 24h with zero interest & zero stock
// ---------------------------------------------------------------------------
const ExhaustedBanner = ({ requestId, bloodGroup }) => {
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/recipient/check-exhausted/?requestId=${requestId}`)
      .then(r => r.json())
      .then(data => setExhausted(data.exhausted === true))
      .catch(() => {});
  }, [requestId]);

  if (!exhausted) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-gray-400 text-xl mt-0.5">💙</span>
        <div>
          <p className="font-bold text-gray-700 text-sm">We sincerely apologize</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            We currently have no matching donors or available stock for{' '}
            <strong>{bloodGroup}</strong> blood. Your request remains{' '}
            <strong>active</strong> — we will notify you immediately the moment
            a match is found. Please consult your doctor for alternative sources
            in the meantime.
          </p>
          <p className="text-xs text-gray-400 mt-2 italic">
            🔔 You will receive an alert as soon as a donor or stock becomes available.
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Escalation Banner — prompts recipient to broadcast a stalled hospital-targeted request
// ---------------------------------------------------------------------------
const EscalationBanner = ({ requestId, hospitalName, onEscalated }) => {
  const [result,       setResult]       = useState(null);
  const [escalating,   setEscalating]   = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/recipient/check-escalation/?requestId=${requestId}`)
      .then(r => r.json())
      .then(data => setResult(data))
      .catch(() => {});
  }, [requestId]);

  if (!result?.eligible) return null;

  const handleEscalate = async () => {
    if (!window.confirm(
      `Broadcast this request to ALL eligible donors in ${result.city || 'your city'}?\n\nThis will remove the hospital-specific target and notify every matching donor in the area.`
    )) return;

    const stored = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    setEscalating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/recipient/escalate-broadcast/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, email: stored?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Escalation failed');
      alert('📢 ' + data.message);
      onEscalated();   // reload parent list
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-orange-500 text-xl mt-0.5">📢</span>
        <div className="flex-1">
          <p className="font-bold text-orange-800 text-sm">
            {result.hospitalName || hospitalName} has not responded to your request.
          </p>
          <p className="text-xs text-orange-700 mt-1 mb-3">
            No donors have been matched yet. Would you like to broadcast this request to{' '}
            <strong>all eligible donors in {result.city || 'your city'}</strong>?
          </p>
          <button
            onClick={handleEscalate}
            disabled={escalating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition ${
              escalating
                ? 'bg-orange-200 text-orange-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {escalating ? 'Broadcasting…' : '📡 Broadcast to All Donors'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchRequests = useCallback(async () => {
    const stored = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    const email  = stored?.email;

    if (!email) {
      setError('Not logged in.');
      setLoading(false);
      return;
    }

    try {
      const res  = await fetch(`${BASE_URL}/api/recipient/requests/?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const DONE = new Set(['Fulfilled', 'Transfusion Done', 'Awaiting Payment', 'Rejected']);
        setRequests(data.sort((a, b) => (DONE.has(a.status) ? 1 : 0) - (DONE.has(b.status) ? 1 : 0)));
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

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

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading your requests…</div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}

        {/* Requests List */}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((req) => {
              const statusStyle     = STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600 border-gray-200';
              const note            = STATUS_NOTES[req.status]  || 'Status updated.';
              const displayStatus   = req.status === 'Transfusion Done' ? 'Fulfilled' : req.status;
              const isActive        = req.status === 'Pending' || req.status === 'Approved';
              const noInterest      = req.donorInterestCount === 0;
              const showFallback    = req.status === 'Approved' && noInterest;
              const showEscalation  = isActive && !req.isGlobal && noInterest;

              return (
                <div key={req.requestId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                      {/* Left: ID, date, hospital */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-mono text-gray-400">#{req.requestId}</span>
                          <span className="text-xs font-medium text-gray-500">{req.requestDate}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {req.hospitalName || 'Open Request'}
                          {req.isGlobal && (
                            <span className="ml-2 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              🌍 City-Wide
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">{req.hospitalCity}</p>
                      </div>

                      {/* Middle: blood type + units */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 uppercase font-bold">Type</div>
                          <div className="text-xl font-black text-red-600">{req.bloodGroup}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 uppercase font-bold">Units</div>
                          <div className="text-xl font-bold text-gray-800">{req.units}</div>
                        </div>
                      </div>

                      {/* Right: status + urgency */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusStyle}`}>
                          {displayStatus}
                        </span>
                        <span className={`text-xs font-bold ${req.urgency === 'Critical' ? 'text-red-600' : 'text-gray-500'}`}>
                          {req.urgency} Urgency
                        </span>
                        {req.donorInterestCount > 0 && (
                          <span className="text-xs text-green-600 font-semibold">
                            🙋 {req.donorInterestCount} donor{req.donorInterestCount > 1 ? 's' : ''} interested
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: note */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">ℹ️</span>
                      <p className="text-sm text-gray-600 italic">{note}</p>
                    </div>

                    {/* Close-by Banks Fallback Banner (Flow 4) */}
                    {showFallback && (
                      <NearbyStockBanner
                        requestId={req.requestId}
                        bloodGroup={req.bloodGroup}
                        donorInterestCount={req.donorInterestCount}
                        requestDate={req.requestDate}
                      />
                    )}

                    {/* Global Broadcast Escalation Banner (Flow 5) */}
                    {showEscalation && (
                      <EscalationBanner
                        requestId={req.requestId}
                        hospitalName={req.hospitalName}
                        onEscalated={fetchRequests}
                      />
                    )}

                    {/* Exhausted Options Apology (Flow 6) */}
                    {req.isGlobal && req.donorInterestCount === 0 && (
                      <ExhaustedBanner
                        requestId={req.requestId}
                        bloodGroup={req.bloodGroup}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && requests.length === 0 && (
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