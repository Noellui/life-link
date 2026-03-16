import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();

  // --- 1. STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Data States
  const [events, setEvents] = useState([]);
  const [inventoryStats, setInventoryStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard Card Stats
  const [dashboardStats, setDashboardStats] = useState({
    donors: 0,
    recipients: 0,
    total_units: 0,
    hospitals: 0,
    pending_requests: 0
  });

  // --- 2. API SERVICE ---
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await fetch('http://127.0.0.1:8000/api/admin/stats/');
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setInventoryStats(data.inventory || []);
        setDashboardStats(data.stats || { donors: 0, recipients: 0, hospitals: 0, total_units: 0, pending_requests: 0 });
      }

      const usersResponse = await fetch('http://127.0.0.1:8000/api/admin/users/');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.map(u => ({
          id: u.user_id,
          name: u.full_name,
          role: u.user_role,
          email: u.email,
          city: "Vadodara",
          status: u.status || "Active"
        })));
      }

      const eventsResponse = await fetch('http://127.0.0.1:8000/api/admin/events/');
      if (eventsResponse.ok) {
        setEvents(await eventsResponse.json());
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  // --- 3. HANDLERS ---
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to disable/ban this user?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/`, { method: 'DELETE' });
        if (response.ok) {
          setUsers(users.map(user => user.id === id ? { ...user, status: 'Banned' } : user));
          alert("User has been disabled successfully.");
        }
      } catch (error) { console.error("Error banning user:", error); }
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to cancel this event?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/events/${id}/`, { method: 'DELETE' });
        if (response.ok) {
          setEvents(events.filter(e => e.id !== id));
          alert("Event cancelled successfully.");
        }
      } catch (error) { console.error("Error deleting event:", error); }
    }
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Donors', val: dashboardStats.donors, color: 'border-red-600' },
          { label: 'Hospitals', val: dashboardStats.hospitals, color: 'border-purple-600' },
          { label: 'Recipients', val: dashboardStats.recipients, color: 'border-blue-600' },
          { label: 'Units Stored', val: dashboardStats.total_units, color: 'border-green-600' },
          { label: 'Pending', val: dashboardStats.pending_requests, color: 'border-orange-500' }
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${stat.color}`}>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black text-gray-800 mt-2">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⚠️ Critical System Alerts</h3>

        {inventoryStats.length === 0 ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <strong>Notice:</strong> No blood inventory data is currently available in the system.
          </div>
        ) : (
          <ul className="space-y-3">
            {inventoryStats.some(i => i.status === 'Critical') ? (
              <li className="flex items-start bg-red-50 p-4 rounded-lg border border-red-100">
                <span className="text-red-500 mr-3 text-lg">●</span>
                <span className="text-sm text-red-800">
                  <strong>Critical Stock Alert:</strong> Empty groups:
                  {inventoryStats.filter(i => i.status === 'Critical').map(i => ` ${i.type}`)}.
                </span>
              </li>
            ) : (
              <li className="flex items-start bg-green-50 p-4 rounded-lg border border-green-100">
                <span className="text-green-500 mr-3 text-lg">●</span>
                <span className="text-sm text-green-800"><strong>System Healthy:</strong> Blood stock levels are stable.</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );

  const renderUsers = () => {
    const filteredUsers = users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="border rounded-lg px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Role', 'City', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 transition ${user.status === 'Banned' ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'Donor' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.city}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span></td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {user.status !== 'Banned' ? (
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 font-bold hover:bg-red-50 px-3 py-1 rounded">Ban</button>
                    ) : <span className="text-gray-400 italic text-xs">Disabled</span>}
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
      <h2 className="text-2xl font-bold text-gray-800">Event Oversight</h2>
      {events.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed text-center text-gray-500">No active events found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between">
              <div>
                <h4 className="font-bold text-lg text-gray-900">{event.title}</h4>
                <p className="text-xs text-blue-600 font-bold uppercase mb-2">{event.hospitalName}</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>📅 {event.date} | ⏰ {event.startTime}</p>
                  <p>📍 {event.location} | 🎟️ {event.seats} Seats</p>
                </div>
              </div>
              <button onClick={() => handleDeleteEvent(event.id)} className="self-start bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-lg">Cancel</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-gray-900 text-white min-h-screen fixed z-10 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-black text-red-500">🛡️ ADMIN</h1>
          </div>

          <nav className="mt-6 px-4 space-y-2">

            {/* Overview */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'overview' ? 'bg-red-600' : 'hover:bg-gray-800'}`}
            >
              📊 Overview
            </button>

            {/* Reports Dropdown */}
            <div className="relative group">
              <div className="w-full flex justify-between items-center px-4 py-3 rounded-xl transition hover:bg-gray-800 cursor-default text-gray-300 group-hover:text-white">
                <span>📈 Reports</span>
                <span className="text-xs opacity-50 group-hover:rotate-180 transition-transform duration-200">▼</span>
              </div>

              {/* Flyout Sub-menu (Appears on Hover) */}
              <div className="absolute left-0 top-full mt-1 w-[105%] bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden border border-gray-700">
                <a href="/admin/report/finance" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-700 transition">
                  Financial & Revenue
                </a>
                <a href="/admin/report/inventory" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-700 transition">
                  Global Blood Inventory
                </a>
                <a href="/admin/report/users" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-700 transition">
                  User & Demographic
                </a>
                <a href="/admin/report/supply-demand" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition">
                  Supply & Demand Dynamics
                </a>
              </div>
            </div>

            {/* Users */}
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-red-600' : 'hover:bg-gray-800'}`}
            >
              👥 Users
            </button>

            {/* Events */}
            <button
              onClick={() => setActiveTab('events')}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'events' ? 'bg-red-600' : 'hover:bg-gray-800'}`}
            >
              📅 Events
            </button>

          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogoutClick}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-800 transition flex items-center gap-3 text-gray-300 hover:text-white"
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 ml-64">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'events' && renderEvents()}
      </main>
    </div>
  );
};

export default AdminDashboard;