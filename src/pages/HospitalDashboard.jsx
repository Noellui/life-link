import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HospitalDashboard = () => {
  // --- STATE: MODAL CONTROL ---
  const [activeModal, setActiveModal] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  // --- STATE: FORMS ---
  const [newPatient, setNewPatient] = useState({
    name: '', email: '', bloodType: 'O+', age: '', gender: 'Male', contact: '', doctor: 'Dr. House', urgency: 'High', units: 1
  });

  const [newDonor, setNewDonor] = useState({
    name: '', email: '', bloodGroup: 'O+', phone: '', city: 'Vadodara', age: '', gender: 'Male'
  });

  // --- STATE: DATA ---
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ totalUnits: 0, criticalAlerts: 0, pendingCount: 0 });

  // --- STATE: DYNAMIC HOSPITAL NAME ---
  const [hospitalName, setHospitalName] = useState("Loading Hospital...");

  // --- EFFECT: LOAD ALL DATA (Fetched from Backend) ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch live stats, inventory, AND hospital name from backend
        const statsResponse = await fetch('http://localhost:8000/api/admin/stats/?hospital_id=9001');
        if (statsResponse.ok) {
          const data = await statsResponse.json();

          // Set the dynamic hospital name from the database
          if (data.hospital_name) {
            setHospitalName(data.hospital_name);
          }

          const formattedInventory = data.inventory.map(item => ({
            type: item.type,
            units: item.count,
            status: item.status
          }));

          setInventory(formattedInventory);

          setStats({
            totalUnits: data.stats.total_units,
            criticalAlerts: data.inventory.filter(i => i.status === 'Critical').length,
            pendingCount: data.stats.pending_requests
          });
        }

        // 2. Fetch live requests
        const reqResponse = await fetch('http://localhost:8000/api/donor/requests/');
        if (reqResponse.ok) {
          const reqData = await reqResponse.json();
          const formattedRequests = reqData.map(req => ({
            ...req,
            type: req.type || "Online Request"
          }));
          setRequests(formattedRequests);
        }
      } catch (error) {
        console.error("Error connecting to backend:", error);
        setHospitalName("Hospital Dashboard");
      }
    };

    fetchDashboardData();
  }, [activeModal]);

  // --- HANDLERS ---
  const handlePatientChange = (e) => setNewPatient({ ...newPatient, [e.target.name]: e.target.value });
  const handleDonorChange = (e) => setNewDonor({ ...newDonor, [e.target.name]: e.target.value });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 6; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  // 1. SUBMIT PATIENT
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    const tempPassword = generatePassword();

    const registerPayload = {
      fullName: newPatient.name,
      email: newPatient.email,
      password: tempPassword,
      phone: newPatient.contact || '0000000000',
      role: 'Recipient'
    };

    try {
      const regRes = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        alert(`Registration failed: ${err.error}`);
        return;
      }

      const regData = await regRes.json();
      const newUserId = regData.userId;

      const requestPayload = {
        userId: newUserId,
        bloodGroup: newPatient.bloodType,
        units: parseInt(newPatient.units),
        urgency: newPatient.urgency,
        doctorName: newPatient.doctor,
        hospitalId: 9001,
      };

      const reqRes = await fetch('http://localhost:8000/api/recipient/create-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (reqRes.ok) {
        const reqResult = await reqRes.json();

        const newRequest = {
          id: reqResult.requestId,
          patientName: newPatient.name,
          bloodGroup: newPatient.bloodType,
          units: parseInt(newPatient.units),
          doctor: newPatient.doctor,
          urgency: newPatient.urgency,
          status: "Pending",
          type: "Internal Admission",
        };

        setRequests([newRequest, ...requests]);

        setRegistrationSuccess({
          type: 'Patient',
          id: `REQ-${reqResult.requestId}`,
          name: newPatient.name,
          email: newPatient.email,
          password: tempPassword
        });
      } else {
        alert("Patient registered, but failed to create blood request.");
      }

    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  // 2. SUBMIT DONOR
  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    const tempPassword = generatePassword();

    const payload = {
      fullName: newDonor.name,
      email: newDonor.email,
      password: tempPassword,
      phone: newDonor.phone,
      role: 'Donor',
      bloodGroup: newDonor.bloodGroup,
      city: newDonor.city,
      gender: newDonor.gender,
      dob: '2000-01-01',
      weight: 65
    };

    try {
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setRegistrationSuccess({
          type: 'Donor',
          id: 'Pending Verification',
          name: newDonor.name,
          email: newDonor.email,
          password: tempPassword
        });
      } else {
        const err = await response.json();
        alert(`Failed to register donor: ${err.error}`);
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  const closeAndReset = () => {
    setActiveModal(null);
    setRegistrationSuccess(null);
    setNewPatient({ name: '', email: '', bloodType: 'O+', age: '', gender: 'Male', contact: '', doctor: 'Dr. House', urgency: 'High', units: 1 });
    setNewDonor({ name: '', email: '', bloodGroup: 'O+', phone: '', city: 'Vadodara', age: '', gender: 'Male' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">

      {/* 1. Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            {/* DYNAMIC hospital name from database */}
            <h1 className="text-2xl font-bold text-gray-900">{hospitalName} 🏥</h1>
            <p className="text-gray-500 text-sm mt-1">Dashboard & Inventory Management</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveModal('patient')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
            >
              <span>👤</span> New Patient
            </button>

            <button
              onClick={() => setActiveModal('donor')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition shadow-sm flex items-center gap-2"
            >
              <span>🩸</span> New Donor
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* 2. Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Blood Units</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUnits} <span className="text-sm font-normal text-gray-400">bags</span></p>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600 text-xl">🩸</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{stats.criticalAlerts}</p>
              <p className="text-xs text-red-500 mt-1">Blood types running low</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full text-red-600 text-xl">⚠️</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-3xl font-bold text-blue-600">{stats.pendingCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600 text-xl">📋</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 3. Inventory Overview */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Live Blood Inventory</h3>
              <span className="text-xs text-gray-500">Synced with Database</span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {inventory.length === 0 ? (
                <div className="col-span-4 text-center py-8 text-gray-400">
                  <p className="text-lg">No inventory data found.</p>
                  <p className="text-sm mt-1">Make sure blood types are inserted in the database and restart Django.</p>
                </div>
              ) : (
                inventory.map((item) => (
                  <div key={item.type} className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                    item.status === 'Critical' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'
                  }`}>
                    <h4 className="text-2xl font-black text-gray-800 mb-1">{item.type}</h4>
                    <p className={`text-sm font-medium mb-2 ${
                      item.status === 'Stable' || item.status === 'Good' ? 'text-green-600' : 'text-red-600'
                    }`}>{item.status}</p>
                    <div className="bg-gray-100 rounded-lg px-3 py-1">
                      <span className="font-bold text-gray-800 text-lg">{item.units}</span>
                      <span className="text-xs text-gray-500 ml-1">Units</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 pb-4">
              <Link to="/manage-stock" className="text-sm text-blue-600 font-medium hover:underline">Manage Inventory Details →</Link>
            </div>
          </div>

          {/* 4. Recent Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Recent Requests</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{req.patientName || req.patient}</p>
                      <p className="text-xs text-gray-500">#{req.id} • {req.doctor || 'Emergency Dept'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      req.bloodGroup === 'AB-' || req.bloodGroup === 'O-' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>{req.bloodGroup}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      req.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
                      req.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>{req.urgency}</span>

                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      req.type === 'Internal Admission'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {req.type === 'Internal Admission' ? 'Internal' : 'Online'}
                    </span>
                  </div>
                </div>
              ))}
              <div className="p-4 text-center">
                <Link to="/patient-requests" className="text-sm text-blue-600 font-medium hover:underline">Process All Requests →</Link>
              </div>
              <Link 
        to="/hospital-profile" 
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition shadow-md"
      >
        <span>⚙️</span> Update Profile
      </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- SHARED REGISTRATION MODAL --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">

            <div className={`${activeModal === 'patient' ? 'bg-blue-600' : 'bg-green-600'} px-6 py-4 flex justify-between items-center text-white`}>
              <h3 className="text-lg font-bold">
                {registrationSuccess
                  ? `${registrationSuccess.type} Registered ✅`
                  : activeModal === 'patient' ? "Register New Patient" : "Register New Donor"}
              </h3>
              <button onClick={closeAndReset} className="text-2xl leading-none hover:text-gray-200">&times;</button>
            </div>

            {!registrationSuccess ? (
              <div className="p-6">

                {/* PATIENT FORM */}
                {activeModal === 'patient' && (
                  <form onSubmit={handlePatientSubmit} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                      <strong>Note:</strong> Creates a Recipient Account and auto-generates a blood request.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                        <input required type="text" name="name" value={newPatient.name} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="Full Name"/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login ID)</label>
                        <input required type="email" name="email" value={newPatient.email} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="patient@example.com"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                        <select name="bloodType" value={newPatient.bloodType} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2 bg-white">
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Units Needed</label>
                        <input required type="number" min="1" max="10" name="units" value={newPatient.units} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input required type="number" name="age" value={newPatient.age} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                        <select name="urgency" value={newPatient.urgency} onChange={handlePatientChange} className="w-full border border-gray-300 rounded-lg p-2 bg-white">
                          <option value="Routine">Routine</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition shadow-md mt-4">
                      Register Patient
                    </button>
                  </form>
                )}

                {/* DONOR FORM */}
                {activeModal === 'donor' && (
                  <form onSubmit={handleDonorSubmit} className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800 mb-4">
                      <strong>Note:</strong> Creates a Donor Account for walk-ins. They will receive alerts for future requests.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
                        <input required type="text" name="name" value={newDonor.name} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="Full Name"/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login ID)</label>
                        <input required type="email" name="email" value={newDonor.email} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="donor@example.com"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                        <select name="bloodGroup" value={newDonor.bloodGroup} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2 bg-white">
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input required name="phone" value={newDonor.phone} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="98765..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input name="age" value={newDonor.age} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input name="city" value={newDonor.city} onChange={handleDonorChange} className="w-full border border-gray-300 rounded-lg p-2" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 transition shadow-md mt-4">
                      Register Donor
                    </button>
                  </form>
                )}
              </div>
            ) : (
              // CREDENTIALS VIEW
              <div className="p-8 text-center space-y-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl ${
                  registrationSuccess.type === 'Patient' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>✓</div>

                <div>
                  <h4 className="text-xl font-bold text-gray-900">Account Created Successfully</h4>
                  <p className="text-gray-500 text-sm mt-2">
                    Please share these details with the {registrationSuccess.type}.
                  </p>
                </div>

                <div className="bg-gray-100 p-6 rounded-xl border border-gray-300 text-left space-y-3">
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase">{registrationSuccess.type} Name</span>
                    <span className="text-lg font-bold text-gray-900">{registrationSuccess.name}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <span className="block text-xs font-bold text-gray-500 uppercase">Login ID (Email)</span>
                    <span className="text-lg font-mono text-gray-900">{registrationSuccess.email}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <span className="block text-xs font-bold text-gray-500 uppercase">One-Time Password</span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-black text-gray-800 tracking-widest">
                        {registrationSuccess.password}
                      </span>
                      <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">Auto-Generated</span>
                    </div>
                  </div>
                </div>

                <button onClick={closeAndReset} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition shadow-lg">
                  Done (Details Shared)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalDashboard;