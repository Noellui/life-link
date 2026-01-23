import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Note: Ensure 'onLogout' is passed from your App.js or parent component
const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();

  // --- LOGOUT LOGIC ---
  const handleLogoutClick = () => {
    // Execute the logout prop function if it exists
    if (onLogout) {
        onLogout();
    }
    // Redirect to login page
    navigate('/login');
  };

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'events'

  // Mock Data: System Statistics
  const [stats] = useState({
    totalDonors: 1240,
    totalRecipients: 350,
    totalDonations: 4500, // Total units collected
    activeRequests: 12,
  });

  // Mock Data: User List
  const [users, setUsers] = useState([
    { id: 1, name: "Rahul Sharma", role: "Donor", email: "rahul@test.com", status: "Active" },
    { id: 2, name: "City General Hospital", role: "Hospital", email: "city@hospital.com", status: "Active" },
    { id: 3, name: "Amit Patel", role: "Recipient", email: "amit@test.com", status: "Active" },
    { id: 4, name: "John Doe", role: "Donor", email: "john@baduser.com", status: "Reported" },
  ]);

  // Mock Data: Events
  const [events, setEvents] = useState([
    { id: 1, title: "Mega Blood Drive 2023", date: "2023-11-15", location: "Town Hall" },
    { id: 2, title: "World Health Day Camp", date: "2023-12-01", location: "City Center" },
  ]);

  // --- HANDLERS ---
  const handleDeleteUser = (id) => {
    if (window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
      setUsers(users.filter(user => user.id !== id));
      alert("User removed successfully.");
    }
  };

  const handlePostEvent = (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const date = e.target.date.value;
    const location = e.target.location.value;
    
    const newEvent = { id: Date.now(), title, date, location };
    setEvents([...events, newEvent]);
    alert("Event posted successfully!");
    e.target.reset(); 
  };

  // --- RENDER HELPERS ---

  // 1. Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Donors</p>
          <p className="text-3xl font-bold text-red-600">{stats.totalDonors}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Recipients</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalRecipients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Units Collected</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalDonations}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Active Requests</p>
          <p className="text-3xl font-bold text-orange-500">{stats.activeRequests}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Recent System Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            <p className="text-gray-600">New Donor <strong>Sarah Jenkins</strong> registered.</p>
            <span className="ml-auto text-gray-400">2 mins ago</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <p className="text-gray-600">Hospital <strong>City General</strong> updated inventory.</p>
            <span className="ml-auto text-gray-400">15 mins ago</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
            <p className="text-gray-600">Urgent request created for <strong>O- Blood</strong>.</p>
            <span className="ml-auto text-gray-400">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. User Management Tab
  const renderUsers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Disable</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 3. Event Management Tab
  const renderEvents = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Event Management</h2>
      
      {/* Add New Event Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Post New Event</h3>
        <form onSubmit={handlePostEvent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Event Title</label>
            <input name="title" type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 sm:text-sm border p-2" placeholder="e.g. Blood Donation Camp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input name="date" type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 sm:text-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input name="location" type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 sm:text-sm border p-2" placeholder="City Hall" />
          </div>
          <button type="submit" className="md:col-span-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition">Post Event</button>
        </form>
      </div>

      {/* List Existing Events */}
      <div className="grid gap-4">
        {events.map(event => (
          <div key={event.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-lg">{event.title}</h4>
              <p className="text-gray-500 text-sm">📅 {event.date} • 📍 {event.location}</p>
            </div>
            <button className="text-red-600 text-sm hover:underline">Cancel Event</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-wider">ADMIN 🛡️</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'overview' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'events' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            Events & Notices
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 transition">
            Settings
          </button>
          <button onClick={handleLogoutClick} className="w-full text-left px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 transition">Log Out</button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'events' && renderEvents()}
      </main>

    </div>
  );
};

export default AdminDashboard;