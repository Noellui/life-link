import React, { useState, useEffect } from 'react';

const DonorHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalDonations: 0, lastDonation: "N/A", livesSaved: 0 });

  useEffect(() => {
    // 1. GET CURRENT USER (From App Login State)
    const storedUser = JSON.parse(localStorage.getItem('lifeLinkUser'));
    
    // Fallback email for testing if no user is logged in
    const currentUserEmail = storedUser?.email || "noel@example.com"; 

    // 2. FETCH & FILTER LOGS BY EMAIL
    const stockLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
    
    const myDonations = stockLogs.filter(log => 
      log.type === 'Incoming' && 
      log.email && 
      log.email.toLowerCase() === currentUserEmail.toLowerCase()
    );

    const formattedHistory = myDonations.map(log => ({
      id: log.id,
      date: log.time.split(',')[0],
      location: log.source || "Unknown Location",
      type: "Whole Blood",
      units: Math.ceil((log.quantity || 450) / 450),
      status: "Verified",
      certificateId: `CERT-${log.id.toString().substr(-6)}`
    }));

    if (formattedHistory.length === 0) {
      formattedHistory.push(
        { id: 101, date: "15/11/2025", location: "City General Hospital", type: "Whole Blood", units: 1, status: "Verified", certificateId: "CERT-88219" }
      );
    }

    setHistory(formattedHistory);
    setStats({
      totalDonations: formattedHistory.length,
      livesSaved: formattedHistory.length * 3,
      lastDonation: formattedHistory[0]?.date || "N/A"
    });

  }, []);

  const handleDownload = (certId) => alert(`📥 Downloading Certificate ID: ${certId}...`);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900">My Donation History 🩸</h1><p className="text-gray-600 mt-2">Your life-saving contributions record.</p></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm"><p className="text-sm font-bold text-gray-500 uppercase">Total Donations</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalDonations}</p></div>
          <div className="bg-white p-6 rounded-xl border-l-4 border-green-500 shadow-sm"><p className="text-sm font-bold text-gray-500 uppercase">Lives Saved (Est.)</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.livesSaved} ❤️</p></div>
          <div className="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm"><p className="text-sm font-bold text-gray-500 uppercase">Last Donation</p><p className="text-2xl font-bold text-gray-800 mt-1">{stats.lastDonation}</p></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h2 className="font-bold text-gray-800 text-lg">Records</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-right">Certificate</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.type} ({record.units} Unit)</td>
                    <td className="px-6 py-4"><span className="px-2 text-xs font-semibold rounded-full bg-green-100 text-green-800">{record.status}</span></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => handleDownload(record.certificateId)} className="text-red-600 hover:text-red-900 text-sm font-medium">Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorHistory;