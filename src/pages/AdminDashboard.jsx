import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();

  // --- 1. STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false); // To handle "API" loading state

  // Data States (Initialized empty, populated via "API")
  const [events, setEvents] = useState([]);
  const [inventoryStats, setInventoryStats] = useState([]);
  const [monthlyActivity, setMonthlyActivity] = useState([]);
  const [users, setUsers] = useState([]);

  // --- 2. MOCK API SERVICE (The Bridge) ---
  // When Backend is ready, you ONLY change code inside this function.
  const fetchDashboardData = async () => {
    setLoading(true);
    
    // SIMULATE NETWORK DELAY (Remove this line when backend is ready)
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      // A. FETCH EVENTS (Currently from LocalStorage)
      const storedEvents = JSON.parse(localStorage.getItem('hospital_events') || '[]');
      setEvents(storedEvents);

      // B. FETCH INVENTORY REPORT (Calculated from Stock Logs)
      // *Backend Note:* Your backend would run this query: "SELECT SUM(qty) FROM logs GROUP BY bloodGroup"
      const logs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      
      const calculatedInventory = bloodGroups.map(bg => {
        // Calculate total incoming - total outgoing
        const incoming = logs.filter(l => l.bloodGroup === bg && l.type === 'Incoming').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const outgoing = logs.filter(l => l.bloodGroup === bg && l.type === 'Outgoing').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        
        // Convert to units (450ml = 1 Unit)
        const currentUnits = Math.floor((incoming - outgoing) / 450);
        const finalCount = currentUnits > 0 ? currentUnits : 0; // Prevent negatives

        // Logic for status label
        let status = 'Good';
        if (finalCount === 0) status = 'Critical';
        else if (finalCount < 5) status = 'Low';

        return { type: bg, count: finalCount, capacity: 50, status };
      });
      setInventoryStats(calculatedInventory);

      // C. FETCH MONTHLY ACTIVITY (Mocked for now)
      // *Backend Note:* Replace this array with response.data.monthlyStats
      setMonthlyActivity([
        { month: 'Jan 2026', donations: 120, requests: 95, outcome: '+25' },
        { month: 'Dec 2025', donations: 150, requests: 140, outcome: '+10' },
        { month: 'Nov 2025', donations: 90, requests: 110, outcome: '-20' },
        { month: 'Oct 2025', donations: 110, requests: 80, outcome: '+30' },
        { month: 'Sep 2025', donations: 105, requests: 100, outcome: '+5' },
      ]);

      // D. FETCH USERS (Mocked for now)
      // *Backend Note:* Replace with axios.get('/api/users')
      setUsers([
        { id: 1, name: "Rahul Sharma", role: "Donor", email: "rahul@test.com", city: "Vadodara", status: "Active" },
        { id: 2, name: "City General Hospital", role: "Hospital", email: "city@hospital.com", city: "Vadodara", status: "Active" },
        { id: 3, name: "Amit Patel", role: "Recipient", email: "amit@test.com", city: "Ahmedabad", status: "Active" },
        { id: 4, name: "John Doe", role: "Donor", email: "john@baduser.com", city: "Mumbai", status: "Reported" },
        { id: 5, name: "Sterling Hospital", role: "Hospital", email: "sterling@test.com", city: "Vadodara", status: "Active" },
        { id: 6, name: "Suspicious User", role: "Recipient", email: "fake@test.com", city: "Delhi", status: "Reported" },
      ]);

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. USE EFFECT HOOK ---
  // This triggers the data fetch when the component mounts or tab changes
  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  // --- HANDLERS ---
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handleDeleteUser = (id) => {
    if (window.confirm("Are you sure you want to ban this user?")) {
      // *Backend Note:* await axios.delete(`/api/users/${id}`)
      setUsers(users.filter(user => user.id !== id));
    }
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm("Are you sure you want to cancel this event?")) {
      // *Backend Note:* await axios.delete(`/api/events/${id}`)
      const updatedEvents = events.filter(e => e.id !== id);
      setEvents(updatedEvents);
      localStorage.setItem('hospital_events', JSON.stringify(updatedEvents));
    }
  };

  const handleDownloadReport = () => {
    alert("📥 Downloading Detailed Report (PDF)...");
  };

  const getProgressColor = (count, capacity) => {
    const percentage = (count / capacity) * 100;
    if (percentage < 20) return 'bg-red-600'; 
    if (percentage < 40) return 'bg-yellow-500'; 
    return 'bg-green-600'; 
  };

  // --- 4. RENDERERS ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-500 animate-pulse">Loading Dashboard Data...</div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-600">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Donors</p>
          <p className="text-3xl font-black text-gray-800 mt-2">1,240</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Recipients</p>
          <p className="text-3xl font-black text-gray-800 mt-2">350</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Successful Transfusions</p>
          <p className="text-3xl font-black text-gray-800 mt-2">4,500</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Requests</p>
          <p className="text-3xl font-black text-gray-800 mt-2">12</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          ⚠️ Critical System Alerts
        </h3>
        <ul className="space-y-3">
          {/* Dynamic Alert based on Inventory */}
          {inventoryStats.some(i => i.status === 'Critical') ? (
             <li className="flex items-start bg-red-50 p-4 rounded-lg border border-red-100">
               <span className="text-red-500 mr-3 text-lg">●</span>
               <span className="text-sm text-red-800">
                 <strong>Critical Stock Alert:</strong> The following blood groups are empty: 
                 {inventoryStats.filter(i => i.status === 'Critical').map(i => ` ${i.type}`)}.
               </span>
             </li>
          ) : (
            <li className="flex items-start bg-green-50 p-4 rounded-lg border border-green-100">
              <span className="text-green-500 mr-3 text-lg">●</span>
              <span className="text-sm text-green-800"><strong>System Healthy:</strong> Blood stock levels are stable.</span>
            </li>
          )}
          
          <li className="flex items-start bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <span className="text-yellow-600 mr-3 text-lg">●</span>
            <span className="text-sm text-yellow-800"><strong>User Report:</strong> 3 accounts flagged for review.</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">System Analytics & Reports</h2>
        <button onClick={handleDownloadReport} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-700">
          Export as PDF
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg text-gray-800 mb-6">🩸 Live Blood Inventory (Calculated from Logs)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {inventoryStats.map((item) => (
            <div key={item.type}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-gray-700">{item.type} Blood</span>
                <span className={`font-bold ${item.status === 'Critical' ? 'text-red-600' : item.status === 'Low' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {item.count} Units ({item.status})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full ${getProgressColor(item.count, item.capacity)}`} style={{ width: `${(item.count / item.capacity) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-800">📅 Monthly Activity Report</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Month</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Donations</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Requests</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Net Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {monthlyActivity.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.month}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">+{row.donations}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{row.requests}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${row.outcome.startsWith('-') ? 'text-red-600' : 'text-gray-900'}`}>
                  {row.outcome} Units
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsers = () => {
    // SORTING LOGIC: Reported Users First
    const sortedUsers = [...users].sort((a, b) => {
      if (a.status === 'Reported' && b.status !== 'Reported') return -1;
      if (a.status !== 'Reported' && b.status === 'Reported') return 1;
      return 0;
    });

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <div className="flex gap-2">
             <input placeholder="Search users..." className="border rounded-lg px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-red-500 outline-none" />
             <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold">Search</button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 transition ${user.status === 'Reported' ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === 'Donor' ? 'bg-red-50 text-red-700' : 
                      user.role === 'Hospital' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 font-bold hover:bg-red-50 px-3 py-1 rounded">
                      Ban User
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEvents = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Event Oversight</h2>
        <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-bold">
          View Only Mode
        </span>
      </div>
      
      {events.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
          <p className="text-lg">No active events found.</p>
          <p className="text-sm">Events created by Hospitals will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{event.title}</h4>
                  <p className="text-xs text-blue-600 font-bold uppercase mb-2">{event.hospitalName || "City General Hospital"}</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 {event.date}</p>
                    <p>⏰ {event.startTime} - {event.endTime}</p>
                    <p>📍 {event.location}</p>
                    <p>🎟️ {event.seats} Seats</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteEvent(event.id)} 
                  className="bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-100 transition border border-red-100"
                >
                  Cancel Event
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <aside className="w-64 bg-gray-900 text-white min-h-screen hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-10">
        <div className="p-6 border-b border-gray-800"><h1 className="text-2xl font-black text-red-500">🛡️ ADMIN</h1></div>
        <nav className="mt-6 px-4 space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'overview' ? 'bg-red-600' : 'hover:bg-gray-800'}`}>📊 Dashboard</button>
          <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'reports' ? 'bg-red-600' : 'hover:bg-gray-800'}`}>📈 Reports</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-red-600' : 'hover:bg-gray-800'}`}>👥 Users</button>
          <button onClick={() => setActiveTab('events')} className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'events' ? 'bg-red-600' : 'hover:bg-gray-800'}`}>📅 Events</button>
        </nav>
        <div className="p-4 border-t border-gray-800"><button onClick={handleLogoutClick} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-800">🚪 Log Out</button></div>
      </aside>

      <main className="flex-1 p-8 md:ml-64">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'events' && renderEvents()}
      </main>
    </div>
  );
};

export default AdminDashboard;