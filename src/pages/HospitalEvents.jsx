import React, { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'http://127.0.0.1:8000';

const HospitalEvents = () => {
  // --- STATE ---
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventDonors, setEventDonors] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  // --- RESOLVE LOGGED-IN USER ---
  const getHospitalEmail = () => {
    const stored =
      JSON.parse(localStorage.getItem('user_data') || 'null') ||
      JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    return stored?.email || '';
  };

  // --- FETCH EVENTS ---
  const fetchEvents = useCallback(async () => {
    const email = getHospitalEmail();
    if (!email) {
      setLoading(false);
      setError('Please log in to manage events.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/hospital/events/?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Could not load events. Is the Django server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- FETCH DONORS FOR SPECIFIC EVENT ---
  const fetchEventDonors = async (eventId) => {
    setDonorsLoading(true);
    setEventDonors([]);
    try {
      const res = await fetch(`${BASE_URL}/api/hospital/events/${eventId}/donors/`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setEventDonors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch event donors:', err);
      setEventDonors([]);
    } finally {
      setDonorsLoading(false);
    }
  };

  const handleOpenEvent = (event) => {
    setActiveEvent(event);
    fetchEventDonors(event.id);
  };

  // --- CREATE NEW EVENT ---
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setModalError('');
    const email = getHospitalEmail();
    if (!email) {
      setModalError('Not logged in.');
      return;
    }

    const formData = new FormData(e.target);
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');

    if (startTime >= endTime) {
      setModalError('Start time must be before End time.');
      return;
    }

    setCreating(true);

    const payload = {
      email,
      title: (formData.get('title') || '').trim(),
      date: formData.get('date'),
      startTime,
      endTime,
      location: (formData.get('location') || '').trim(),
      seats: parseInt(formData.get('seats')) || 100,
      description: (formData.get('description') || '').trim(),
    };

    try {
      const res = await fetch(`${BASE_URL}/api/hospital/events/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Create failed');
      }
      setShowCreateModal(false);
      e.target.reset();
      await fetchEvents();
      alert('Event Created Successfully! 📅');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // --- RECORD DONATION (Fulfill) ---
  const handleRecordDonation = async (appointmentId, donorName) => {
    if (!window.confirm(`Confirm donation from ${donorName}?`)) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/hospital/appointments/${appointmentId}/fulfill/`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) throw new Error('Fulfill failed');

      // Update local state to show fulfillment
      setEventDonors((prev) =>
        prev.map((d) =>
          d.appointmentId === appointmentId ? { ...d, status: 'Fulfilled' } : d
        )
      );
      alert(`✅ Recorded donation from ${donorName}.`);
    } catch (err) {
      alert('Failed to record donation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg animate-pulse">Loading events…</div>
      </div>
    );
  }

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
            onClick={() => { setModalError(''); setShowCreateModal(true); }}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 shadow-md transition flex items-center gap-2"
          >
            <span>+</span> Create New Event
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* VIEW 1: EVENT LISTING CARDS */}
      {!activeEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">No active events found.</p>
              <button
                onClick={() => { setModalError(''); setShowCreateModal(true); }}
                className="text-red-600 font-bold hover:underline"
              >
                Create your first event
              </button>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                      Upcoming
                    </span>
                    <span className="text-xs text-gray-400 font-mono">#{event.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>📅 {event.date} • {event.startTime} - {event.endTime}</p>
                    <p>📍 {event.location}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <div className="text-center">
                      <span className="block text-lg font-bold text-gray-900">
                        {event.registeredCount || 0}
                      </span>
                      <span className="text-xs text-gray-500 uppercase">Donors</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-lg font-bold text-gray-900">
                        {event.seats || 0}
                      </span>
                      <span className="text-xs text-gray-500 uppercase">Capacity</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEvent(event)}
                  className="w-full bg-gray-50 text-gray-700 font-bold py-3 hover:bg-gray-100 transition border-t border-gray-200"
                >
                  Manage & Record Donations →
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: DONOR LIST FOR SPECIFIC EVENT */}
      {activeEvent && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-8 py-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{activeEvent.title}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {activeEvent.date} @ {activeEvent.location}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveEvent(null);
                setEventDonors([]);
              }}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
            >
              ← Back to Events
            </button>
          </div>

          <div className="p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Registered Donors</h3>

            {donorsLoading ? (
              <div className="text-center py-12 text-gray-400 animate-pulse">
                Loading registered donors…
              </div>
            ) : (
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
                    {eventDonors.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-10 text-center text-gray-400">
                          No donors have registered for this event yet.
                        </td>
                      </tr>
                    ) : (
                      eventDonors.map((donor) => (
                        <tr key={donor.appointmentId} className="hover:bg-gray-50">
                          <td className="py-4 px-4 font-medium text-gray-900">{donor.donorName}</td>
                          <td className="py-4 px-4 text-gray-500 text-sm">{donor.donorEmail}</td>
                          <td className="py-4 px-4">
                            <span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded text-xs">
                              {donor.bloodType || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              donor.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 
                              donor.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 
                              'bg-yellow-100 text-yellow-700'}`}>
                              {donor.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {donor.status === 'Fulfilled' ? (
                              <span className="text-sm text-green-600 font-bold">✅ Done</span>
                            ) : (
                              <button
                                onClick={() => handleRecordDonation(donor.appointmentId, donor.donorName)}
                                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 transition"
                              >
                                🩸 Mark Donated
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Post New Blood Drive</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-5">
              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
                  ⚠️ {modalError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. Mega Blood Donation Camp"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" min={new Date().toISOString().split('T')[0]} required className="w-full border border-gray-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                  <input name="startTime" type="time" required className="w-full border border-gray-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                  <input name="endTime" type="time" required className="w-full border border-gray-300 rounded-lg p-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input name="location" type="text" required className="w-full border border-gray-300 rounded-lg p-2.5" placeholder="Town Hall" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Seats</label>
                  <input name="seats" type="number" min="1" required className="w-full border border-gray-300 rounded-lg p-2.5" placeholder="100" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea name="description" rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none resize-none" placeholder="Info for donors..." />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex-1 text-white font-bold py-3 rounded-lg transition ${creating ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {creating ? 'Publishing...' : 'Publish Event'}
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