import React, { useState } from 'react';

const RecipientDashboard = () => {
  // --- MOCK DATA STATE ---

  // 1. Search State
  const [searchFilters, setSearchFilters] = useState({
    bloodType: '',
    location: ''
  });

  // 2. Mock Search Results (What shows up when they hit search)
  const [searchResults, setSearchResults] = useState([
    { id: 1, hospital: "City General Hospital", location: "Downtown", bloodType: "A+", units: 12, contact: "079-12345678" },
    { id: 2, hospital: "Red Cross Center", location: "West Zone", bloodType: "A+", units: 5, contact: "079-87654321" },
    { id: 3, hospital: "St. Mary's Clinic", location: "North Side", bloodType: "O-", units: 2, contact: "079-11223344" },
  ]);

  // 3. User's Request History (Matches DFD Process 3.0 & 7.0)
  const [myRequests, setMyRequests] = useState([
    { id: 101, date: "2023-10-20", bloodType: "A+", units: 2, hospital: "City General Hospital", status: "Approved", payment: "Paid" },
    { id: 102, date: "2023-09-15", bloodType: "O-", units: 1, hospital: "Red Cross Center", status: "Fulfilled", payment: "Paid" },
    { id: 103, date: "2023-10-24", bloodType: "A+", units: 1, hospital: "St. Mary's Clinic", status: "Pending", payment: "Unpaid" },
  ]);

  // --- HANDLERS ---
  
  const handleSearchChange = (e) => {
    setSearchFilters({ ...searchFilters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // In a real app, this would query your Python Backend/MySQL
    alert(`Searching for ${searchFilters.bloodType} blood in ${searchFilters.location}...`);
  };

  const handleNewRequest = (hospitalName) => {
    // Logic to add a new request
    const newReq = {
      id: Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      bloodType: searchFilters.bloodType || "A+", // Default for demo
      units: 1,
      hospital: hospitalName,
      status: "Pending",
      payment: "Unpaid"
    };
    setMyRequests([newReq, ...myRequests]);
    alert("Request submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* 1. Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Find Blood Availability 🔍</h1>
          <p className="text-gray-500 text-sm mt-1">Search real-time inventory and manage your requests.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* 2. Search Section (The most important part) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {/* Blood Type Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type Needed</label>
              <select 
                name="bloodType"
                className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:ring-brand-red focus:border-brand-red border"
                onChange={handleSearchChange}
              >
                <option value="">Select Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Location Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / City</label>
              <input 
                type="text" 
                name="location"
                placeholder="e.g. Ahmedabad, Maninagar..." 
                className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:ring-brand-red focus:border-brand-red border"
                onChange={handleSearchChange}
              />
            </div>

            {/* Search Button */}
            <div className="md:col-span-1">
              <button 
                type="submit"
                className="w-full bg-brand-red text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-700 transition flex justify-center items-center gap-2"
              >
                <span>🔍</span> Search
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. Search Results (Left Column) */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Available Stock <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{searchResults.length} results</span>
            </h3>
            
            <div className="grid gap-4">
              {searchResults.map((result) => (
                <div key={result.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center hover:border-brand-red transition group">
                  
                  {/* Hospital Info */}
                  <div className="flex items-start gap-4 mb-4 sm:mb-0">
                    <div className="bg-red-50 p-3 rounded-lg text-brand-red font-bold text-xl">
                      {result.bloodType}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-brand-red transition">{result.hospital}</h4>
                      <p className="text-sm text-gray-500">📍 {result.location}</p>
                      <p className="text-xs text-green-600 font-medium mt-1">Available: {result.units} Units</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full border border-gray-200">
                      📞
                    </button>
                    <button 
                      onClick={() => handleNewRequest(result.hospital)}
                      className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                    >
                      Request Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Request History (Right Sidebar) */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">My Requests</h3>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {myRequests.map((req) => (
                  <div key={req.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{req.hospital}</p>
                        <p className="text-xs text-gray-500">{req.date} • {req.units} Unit(s)</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    
                    {/* Payment Status Indicator (Matches DFD Process 7.0) */}
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-400">Payment:</span>
                      {req.payment === 'Unpaid' ? (
                        <button className="text-xs bg-brand-red text-white px-3 py-1 rounded hover:bg-red-700 transition">
                          Pay Now
                        </button>
                      ) : (
                         <span className="text-xs font-medium text-green-600">✓ Paid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                <button className="text-xs text-gray-600 font-medium hover:text-brand-red">View Full History</button>
              </div>
            </div>

            {/* Quick Tip Box */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-blue-800 font-bold text-sm mb-1">Did you know?</h4>
              <p className="text-blue-600 text-xs">
                Once your request is approved, you must complete the payment within 24 hours to reserve the units.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RecipientDashboard;