import React, { useState, useEffect } from 'react';

const HospitalEvents = () => {
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // --- MOCK DONORS (With Emails for Linking) ---
  const [registeredDonors, setRegisteredDonors] = useState([
    { id: 1, name: "Noel Louis", email: "noel@example.com", bloodGroup: "O+", status: "Registered", donatedAmount: 0 },
    { id: 2, name: "Anjali Gupta", email: "anjali@test.com", bloodGroup: "B+", status: "Registered", donatedAmount: 0 },
    { id: 3, name: "Rahul Verma", email: "rahul@test.com", bloodGroup: "A-", status: "Donated", donatedAmount: 450, time: "10:30 AM" },
  ]);

  // Load events from LocalStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('hospital_events') || '[]');
    setEvents(stored);
  }, []);

  // --- 1. HANDLE CREATE EVENT (Detailed) ---
  const handleCreateEvent = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const newEvent = {
      id: Date.now(),
      hospitalName: "City General Hospital", // In real app, get from Auth
      title: formData.get('title'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      location: formData.get('location'),
      seats: formData.get('seats'),
      lat: formData.get('lat'),
      lng: formData.get('lng'),
      donorsRegistered: 0,
      unitsCollected: 0
    };

    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    localStorage.setItem('hospital_events', JSON.stringify(updatedEvents));
    
    setShowCreateModal(false);
    alert("Event Created Successfully! 📅");
  };

  // --- 2. RECORD DONATION ---
  const handleRecordDonation = (donorId, amount) => {
    const timeNow = new Date().toLocaleString();

    // Update Local UI
    const updatedDonors = registeredDonors.map(d => 
      d.id === donorId ? { ...d, status: 'Donated', donatedAmount: amount, time: timeNow } : d
    );
    setRegisteredDonors(updatedDonors);

    const donor = registeredDonors.find(d => d.id === donorId);

    // Save to Global Logs (Linked by Email)
    const logEntry = {
      id: Date.now(),
      type: 'Incoming',
      source: `Event: ${activeEvent.title}`,
      person: donor.name,
      email: donor.email, 
      bloodGroup: donor.bloodGroup,
      quantity: parseInt(amount),
      time: timeNow
    };

    const currentLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
    localStorage.setItem('stock_logs', JSON.stringify([logEntry, ...currentLogs]));

    alert(`✅ Recorded ${amount}ml from ${donor.name}.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-500">Organize blood drives and collect donations.</p>
        </div>
        {!activeEvent && (
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 shadow-md transition flex items-center gap-2"
          >
            <span>+</span> Create New Event
          </button>
        )}
      </div>

      {/* VIEW 1: EVENT CARDS */}
      {!activeEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">No active events found.</p>
              <button onClick={() => setShowCreateModal(true)} className="text-red-600 font-bold hover:underline">Create your first event</button>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Upcoming</span>
                    <span className="text-xs text-gray-400 font-mono">#{event.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>📅 {event.date} • {event.startTime} - {event.endTime}</p>
                    <p>📍 {event.location}</p>
                    <p className="text-xs text-blue-500">🌍 {event.lat}, {event.lng}</p>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <div className="text-center">
                      <span className="block text-lg font-bold text-gray-900">{event.donorsRegistered || 0}</span>
                      <span className="text-xs text-gray-500 uppercase">Donors</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-lg font-bold text-gray-900">{event.seats || 0}</span>
                      <span className="text-xs text-gray-500 uppercase">Seats Left</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveEvent(event)}
                  className="w-full bg-gray-50 text-gray-700 font-bold py-3 hover:bg-gray-100 transition border-t border-gray-200"
                >
                  Manage & Record Donations →
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: DONATION MANAGEMENT (Same as before) */}
      {activeEvent && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up">
          <div className="bg-gray-900 text-white px-8 py-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{activeEvent.title}</h2>
              <p className="text-gray-400 text-sm mt-1">{activeEvent.date} @ {activeEvent.location}</p>
            </div>
            <button onClick={() => setActiveEvent(null)} className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition">
              ← Back to Events
            </button>
          </div>

          <div className="p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Registered Donors</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                  <tr>
                    <th className="py-3 px-4">Donor Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registeredDonors.map(donor => (
                    <tr key={donor.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">{donor.name}</td>
                      <td className="py-4 px-4 text-gray-500 text-sm">{donor.email}</td>
                      <td className="py-4 px-4"><span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded text-xs">{donor.bloodGroup}</span></td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${donor.status === 'Donated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {donor.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {donor.status === 'Donated' ? (
                          <span className="text-sm text-green-600 font-bold">
                            ✅ {donor.donatedAmount}ml Collected
                          </span>
                        ) : (
                          <form 
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRecordDonation(donor.id, e.target.qty.value);
                            }}
                          >
                            <input name="qty" type="number" defaultValue={450} className="w-24 border border-gray-300 rounded px-2 py-1 text-sm" placeholder="ml" />
                            <button type="submit" className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 transition">
                              Save
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE EVENT MODAL (Detailed Form) --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Post New Blood Drive</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-5">
              
              {/* Event Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                <input name="title" type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Mega Blood Donation Camp" />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                  <input name="startTime" type="time" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                  <input name="endTime" type="time" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>

              {/* Location & Seats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location / Address</label>
                  <input name="location" type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Town Hall, Vadodara" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Seats Available</label>
                  <input name="seats" type="number" required min="1" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. 100" />
                </div>
              </div>

              {/* Coordinates Grid */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Map Coordinates (Required for Directions)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Latitude</label>
                    <input name="lat" type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="22.3072" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Longitude</label>
                    <input name="lng" type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="73.1812" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">* Tip: Right-click on Google Maps to copy Lat/Lng.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md">
                  Publish Event
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalEvents;