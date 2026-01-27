import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const RecipientDashboard = () => {
  // --- STATE ---
  const [user, setUser] = useState({ name: "Guest", bloodGroup: "Unknown", id: "N/A" });
  const [myRequests, setMyRequests] = useState([]);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [activeRequestForPayment, setActiveRequestForPayment] = useState(null);

  // --- 1. LOAD USER & DATA ---
  useEffect(() => {
    // A. Load Logged-In User
    const storedUser = JSON.parse(localStorage.getItem('lifeLinkUser'));
    if (storedUser) {
      setUser({
        name: storedUser.name,
        bloodGroup: storedUser.bloodGroup || "B+",
        id: `PAT-${storedUser.id || '8821'}`,
        city: storedUser.city || "Vadodara"
      });
    }

    // B. Load Live Requests
    const storedRequests = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');
    
    // C. Filter for THIS User
    const userNameToMatch = storedUser?.name || "Anjali Gupta"; // Fallback for demo
    
    const userRequests = storedRequests.filter(req => 
      req.patientName && req.patientName.toLowerCase() === userNameToMatch.toLowerCase()
    );

    // D. Add Default Mock Data if empty (for demo)
    if (userRequests.length === 0) {
      userRequests.push(
        { 
          id: 101, hospital: "City General Hospital", units: 2, urgency: "High", 
          status: "Approved", paymentStatus: "Pending", date: "2025-01-24", donorsFound: 3 
        },
        { 
          id: 98, hospital: "Sterling Hospital", units: 1, urgency: "Routine", 
          status: "Fulfilled", paymentStatus: "Paid", date: "2024-11-10", donorsFound: 1 
        }
      );
    }

    // Sort: Pending/Approved first
    const sortedRequests = userRequests.sort((a, b) => (a.status === 'Fulfilled' ? 1 : -1));
    setMyRequests(sortedRequests);

  }, []);

  // --- PAYMENT HANDLERS ---
  const handlePaymentClick = (req) => { 
    setActiveRequestForPayment(req);
    setShowPaymentModal(true); 
  };

  const confirmPayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setPaymentComplete(true);
      
      // Update UI Status
      const updatedList = myRequests.map(req => 
        req.id === activeRequestForPayment.id 
          ? { ...req, paymentStatus: 'Paid', status: 'Processing' } 
          : req
      );
      setMyRequests(updatedList);

      // Ideally, update LocalStorage here too so it persists
    }, 2000);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentComplete(false);
    setActiveRequestForPayment(null);
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Processing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Fulfilled': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine the active (top-most) request for the big card
  const activeReq = myRequests.find(r => r.status !== 'Fulfilled' && r.status !== 'Rejected');

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hello, {user.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">
              Recipient ID: <span className="font-mono text-gray-700">{user.id}</span> • Blood Group: <span className="font-black text-red-600">{user.bloodGroup}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Active Requests</p><p className="text-3xl font-bold text-blue-600">{myRequests.filter(r => r.status !== 'Fulfilled' && r.status !== 'Rejected').length}</p></div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600 text-xl">⏳</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Total Transfusions</p><p className="text-3xl font-bold text-green-600">{myRequests.filter(r => r.status === 'Fulfilled').length}</p></div>
            <div className="p-3 bg-green-50 rounded-full text-green-600 text-xl">❤️</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Donors Matched</p><p className="text-3xl font-bold text-gray-900">{myRequests.reduce((acc, curr) => acc + (curr.donorsFound || 0), 0)}</p></div>
            <div className="p-3 bg-gray-100 rounded-full text-gray-600 text-xl">🤝</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: LIVE TRACKER (Shows the most urgent active request) */}
          <div className="lg:col-span-2">
            {activeReq ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                  <h3 className="font-bold text-lg">Active Request #{activeReq.id}</h3>
                  <span className="bg-blue-500 bg-opacity-30 px-3 py-1 rounded text-sm font-medium">{activeReq.date}</span>
                </div>
                
                <div className="p-8">
                  {/* Progress Bar */}
                  <div className="relative flex items-center justify-between mb-8 max-w-2xl mx-auto">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 -z-10 transition-all duration-1000" 
                         style={{ width: activeReq.paymentStatus === 'Paid' ? '90%' : activeReq.status === 'Approved' ? '60%' : '10%' }}></div>

                    <div className="flex flex-col items-center bg-white px-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">✓</div>
                      <span className="text-xs font-bold text-gray-600 mt-2">Submitted</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${activeReq.status === 'Approved' || activeReq.status === 'Processing' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                      <span className="text-xs font-bold text-gray-600 mt-2">Approved</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${activeReq.paymentStatus === 'Paid' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                      <span className="text-xs font-bold text-gray-600 mt-2">Processing</span>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 rounded-lg p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase">Hospital</p>
                      <p className="font-bold text-gray-900">{activeReq.hospital || activeReq.hospitalName || "Matching..."}</p>
                    </div>
                    
                    {activeReq.status === 'Approved' && activeReq.paymentStatus !== 'Paid' && (
                      <div className="flex items-center gap-4">
                        <button onClick={() => handlePaymentClick(activeReq)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex items-center gap-2 animate-bounce-slow">
                          <span>💳</span> Pay Fee (₹{activeReq.units * 500})
                        </button>
                      </div>
                    )}
                    
                    {activeReq.paymentStatus === 'Paid' && (
                      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold border border-green-200 flex items-center gap-2">
                        <span>✅</span> Paid. Dispatching.
                      </div>
                    )}
                    
                    {activeReq.status === 'Pending' && (
                      <div className="text-sm text-gray-500 italic">Waiting for hospital approval...</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center mb-8">
                <p className="text-gray-500">No active requests at the moment.</p>
                <Link to="/request-blood" className="text-red-600 font-bold hover:underline mt-2 inline-block">Start a new request</Link>
              </div>
            )}
          </div>

          {/* RIGHT: HISTORY LIST */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Request History</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {myRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-900 text-sm">{req.hospital || "General Request"}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusStyle(req.status)}`}>{req.status}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{req.date}</span>
                    <span>{req.units} Units</span>
                  </div>
                </div>
              ))}
              <div className="p-4 text-center">
                 <Link to="/my-requests" className="text-sm text-blue-600 font-medium hover:underline">View All History →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PAYMENT MODAL --- */}
      {showPaymentModal && activeRequestForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold">Secure Payment</h3>
              <button onClick={closePaymentModal} className="text-2xl leading-none hover:text-gray-400">&times;</button>
            </div>
            {!paymentComplete ? (
              <div className="p-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Order Summary</h4>
                  <div className="flex justify-between text-sm mb-1"><span>Processing Fee ({activeRequestForPayment.units} Units)</span><span className="font-bold">₹{activeRequestForPayment.units * 500}</span></div>
                  <div className="flex justify-between text-sm mb-1"><span>GST (18%)</span><span className="font-bold">₹{(activeRequestForPayment.units * 500 * 0.18).toFixed(0)}</span></div>
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-black text-lg text-gray-900"><span>Total</span><span>₹{(activeRequestForPayment.units * 500 * 1.18).toFixed(0)}</span></div>
                </div>
                <button onClick={confirmPayment} disabled={isPaying} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition shadow-lg mt-6 flex justify-center items-center gap-2">
                  {isPaying ? <>Processing...</> : <>Pay Now</>}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                <h4 className="text-xl font-bold text-gray-900">Payment Successful!</h4>
                <button onClick={closePaymentModal} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default RecipientDashboard;