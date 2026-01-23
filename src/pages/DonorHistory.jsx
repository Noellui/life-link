import React, { useState } from 'react';

const DonorHistory = () => {
  // Mock Data: Past Donation Records
  const [history] = useState([
    {
      id: 1,
      date: "2025-11-15",
      location: "City General Hospital",
      type: "Whole Blood",
      units: 1,
      status: "Completed",
      certificateId: "CERT-001"
    },
    {
      id: 2,
      date: "2023-06-10",
      location: "Red Cross Camp - Town Hall",
      type: "Whole Blood",
      units: 1,
      status: "Completed",
      certificateId: "CERT-002"
    },
    {
      id: 3,
      date: "2022-12-05",
      location: "Community Health Center",
      type: "Platelets",
      units: 2,
      status: "Verified",
      certificateId: "CERT-003"
    },
    {
      id: 4,
      date: "2022-12-05",
      location: "Community Health Center",
      type: "Platelets",
      units: 2,
      status: "Verified",
      certificateId: "CERT-003"
    },
    {
      id: 5,
      date: "2022-12-05",
      location: "Community Health Center",
      type: "Platelets",
      units: 2,
      status: "Verified",
      certificateId: "CERT-003"
    },
  ]);

  // Mock Data: Impact Stats
  const stats = {
    totalDonations: history.length,
    lastDonation: history[0]?.date || "N/A",
    livesSaved: history.length * 3 // Approx 3 lives per donation
  };

  const handleDownload = (certId) => {
    alert(`Downloading Certificate ID: ${certId}...`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Donation History 🩸</h1>
          <p className="text-gray-600 mt-2">Thank you for being a hero! Here is a record of your life-saving contributions.</p>
        </div>

        {/* Impact Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-gray-500 text-sm font-medium uppercase">Total Donations</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalDonations}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-sm font-medium uppercase">Lives Saved (Est.)</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.livesSaved} ❤️</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm font-medium uppercase">Last Donation</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.lastDonation}</p>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 text-lg">Donation Records</h2>
            <button className="text-sm text-red-600 font-medium hover:underline">Export to PDF</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.type} <span className="text-xs text-gray-400">({record.units} Unit)</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDownload(record.certificateId)}
                        className="text-red-600 hover:text-red-900 flex items-center justify-end gap-1 ml-auto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {history.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              You haven't made any donations yet. Schedule your first one today!
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DonorHistory;