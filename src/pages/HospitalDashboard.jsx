import React, { useState } from 'react';

const HospitalDashboard = () => {
  // --- MOCK DATA STATE ---
  
  // 1. Blood Inventory Data (The core asset)
  const [inventory, setInventory] = useState([
    { type: 'A+', units: 12, status: 'Good' },
    { type: 'A-', units: 2, status: 'Critical' },
    { type: 'B+', units: 8, status: 'Moderate' },
    { type: 'B-', units: 0, status: 'Empty' },
    { type: 'AB+', units: 5, status: 'Moderate' },
    { type: 'AB-', units: 1, status: 'Critical' },
    { type: 'O+', units: 15, status: 'Good' },
    { type: 'O-', units: 3, status: 'Low' },
  ]);

  // 2. Recent Patient Requests (Incoming demand)
  const [requests, setRequests] = useState([
    { id: 101, patient: "Sarah Jenkins", bloodType: "A-", units: 2, doctor: "Dr. Smith", urgency: "High", status: "Pending" },
    { id: 102, patient: "Mike Ross", bloodType: "O+", units: 1, doctor: "Dr. Zane", urgency: "Routine", status: "Pending" },
    { id: 103, patient: "Harvey Specter", bloodType: "AB+", units: 3, doctor: "Dr. Paulsen", urgency: "Critical", status: "Approved" },
  ]);

  // --- HANDLER FUNCTIONS ---

  const handleStockUpdate = (index, change) => {
    const newInventory = [...inventory];
    // Prevent negative stock
    if (newInventory[index].units + change >= 0) {
      newInventory[index].units += change;
      
      // Auto-update status based on new units (Simple Logic)
      const count = newInventory[index].units;
      if (count === 0) newInventory[index].status = 'Empty';
      else if (count < 3) newInventory[index].status = 'Critical';
      else if (count < 8) newInventory[index].status = 'Low';
      else newInventory[index].status = 'Good';
      
      setInventory(newInventory);
    }
  };

  const handleRequestAction = (id, action) => {
    // In a real app, this would send an API call to Python/MySQL
    console.log(`Request ${id} was ${action}`);
    
    // Update UI locally
    const updatedRequests = requests.map(req => 
      req.id === id ? { ...req, status: action === 'Approve' ? 'Approved' : 'Rejected' } : req
    );
    setRequests(updatedRequests);
  };

  // Calculate Stats
  const totalUnits = inventory.reduce((acc, curr) => acc + curr.units, 0);
  const criticalTypes = inventory.filter(i => i.status === 'Critical' || i.status === 'Empty').length;
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* 1. Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">City General Hospital 🏥</h1>
            <p className="text-gray-500 text-sm mt-1">Dashboard & Inventory Management</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
            <span>+</span> New Requisition
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* 2. Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Total Stock */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Blood Units</p>
              <p className="text-3xl font-bold text-gray-900">{totalUnits} <span className="text-sm font-normal text-gray-400">bags</span></p>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-brand-red text-xl">🩸</div>
          </div>

          {/* Card 2: Alerts */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{criticalTypes}</p>
              <p className="text-xs text-red-500 mt-1">Blood types running low</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full text-red-600 text-xl">⚠️</div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-3xl font-bold text-blue-600">{pendingRequests}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600 text-xl">📋</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. Inventory Management (Left Column - 2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Live Blood Inventory</h3>
              <span className="text-xs text-gray-500">Last updated: Just now</span>
            </div>
            
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {inventory.map((item, index) => (
                <div key={item.type} className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  item.status === 'Critical' || item.status === 'Empty' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'
                }`}>
                  {/* Badge for Critical Stock */}
                  {(item.status === 'Critical' || item.status === 'Empty') && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                  
                  <h4 className="text-2xl font-black text-gray-800 mb-1">{item.type}</h4>
                  <p className={`text-sm font-medium mb-3 ${
                    item.status === 'Good' ? 'text-green-600' : 'text-red-600'
                  }`}>{item.status}</p>
                  
                  {/* Stock Controls */}
                  <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => handleStockUpdate(index, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-red-600 font-bold transition"
                    >-</button>
                    <span className="font-bold text-gray-800 min-w-[20px] text-center">{item.units}</span>
                    <button 
                      onClick={() => handleStockUpdate(index, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-green-600 font-bold transition"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Recent Requests (Right Column - 1/3 width) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Recent Requests</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {requests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{req.patient}</p>
                      <p className="text-xs text-gray-500">Ref: #{req.id} • {req.doctor}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      req.bloodType === 'AB-' || req.bloodType === 'O-' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {req.bloodType}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                     <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                       req.urgency === 'Critical' ? 'bg-red-100 text-red-700' : 
                       req.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                     }`}>
                       {req.urgency}
                     </span>
                     
                     {req.status === 'Pending' ? (
                       <div className="flex space-x-2">
                         <button 
                           onClick={() => handleRequestAction(req.id, 'Reject')}
                           className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 border border-gray-200 rounded hover:bg-white transition"
                         >Reject</button>
                         <button 
                           onClick={() => handleRequestAction(req.id, 'Approve')}
                           className="text-xs bg-blue-600 text-white font-medium px-3 py-1 rounded hover:bg-blue-700 shadow-sm transition"
                         >Approve</button>
                       </div>
                     ) : (
                       <span className="text-xs font-bold text-green-600">✅ Approved</span>
                     )}
                  </div>
                </div>
              ))}
              <div className="p-4 text-center">
                 <button className="text-sm text-blue-600 font-medium hover:underline">View All Requests →</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;