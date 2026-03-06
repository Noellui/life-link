import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DonationCamps = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [camps, setCamps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [registeredCampIds, setRegisteredCampIds] = useState([]); 
  const [loading, setLoading] = useState(true);

  // --- 1. LOAD LIVE DATA FROM BACKEND ---
  useEffect(() => {
    const fetchCamps = async () => {
      try {
        // Fetching from your event_list view in Django
        const response = await fetch('http://127.0.0.1:8000/api/events/');
        if (response.ok) {
          const data = await response.json();
          // Map backend EventTbl fields to frontend keys
          const formattedCamps = data.map(event => ({
            id: event.id,
            title: event.title,
            hospitalName: event.hospitalName,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            seats: event.seats,
            // Default coordinates for directions button
            lat: 22.3072, 
            lng: 73.1812 
          }));
          setCamps(formattedCamps);
        }
      } catch (error) {
        console.error("Error fetching camps:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCamps();
  }, []);

  // --- HANDLERS ---
  const toggleDatePicker = () => setShowDatePicker(!showDatePicker);
  
  const clearDates = (e) => {
    e.stopPropagation();
    setDateRange({ start: '', end: '' });
  };

  // --- 2. HANDLE REGISTRATION (Updates Django Database) ---
  const handleRegister = async (campId) => {
    const storedUser = JSON.parse(localStorage.getItem('lifeLinkUser'));
    if (!storedUser) {
      alert("Please login to register for camps.");
      return navigate('/login');
    }

    if(!window.confirm("Confirm registration for this blood drive?")) return;

    try {
      // POST to your backend to update AppointmentTbl and EventTbl
      const response = await fetch('http://127.0.0.1:8000/api/donor/register-event/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: storedUser.email,
          eventId: campId
        })
      });

      if (response.ok) {
        // Optimistic UI Update after DB success
        setCamps(prevCamps => prevCamps.map(camp => {
          if (camp.id === campId) {
            return { ...camp, seats: camp.seats - 1 };
          }
          return camp;
        }));
        setRegisteredCampIds([...registeredCampIds, campId]);
        alert("✅ Registration Successful! Updated in database.");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const handleDirections = (lat, lng) => {
    window.open(`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  const getProcessedCamps = () => {
    let processed = camps.filter(camp =>
      (camp.location && camp.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (camp.hospitalName && camp.hospitalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (camp.title && camp.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (dateRange.start && dateRange.end) {
      processed = processed.filter(camp => camp.date >= dateRange.start && camp.date <= dateRange.end);
    } else if (dateRange.start) {
      processed = processed.filter(camp => camp.date >= dateRange.start);
    }
    return processed;
  };

  const displayedCamps = getProcessedCamps();
  const isDateFilterActive = dateRange.start || dateRange.end;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading camps...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nearby Donation Camps ⛺</h1>
          <p className="text-gray-600 mt-2">Find and register for blood donation drives happening around you.</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center z-20 relative">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, location or organizer..."
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 sm:text-sm border p-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative">
              <button 
                onClick={toggleDatePicker}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isDateFilterActive ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dateRange.start ? `${dateRange.start} ➔ ${dateRange.end || '...'}` : 'Filter by Date'}
                {isDateFilterActive && <span onClick={clearDates} className="ml-1 text-xs text-red-400 hover:text-red-700 font-bold px-1 cursor-pointer">✕</span>}
              </button>

              {showDatePicker && (
                <div className="absolute top-12 right-0 z-50 bg-white shadow-xl border border-gray-100 rounded-lg p-4 w-72 animate-fade-in-up">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                      <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="w-full border-gray-300 rounded-md text-sm p-1.5 border" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                      <input type="date" value={dateRange.end} min={dateRange.start} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="w-full border-gray-300 rounded-md text-sm p-1.5 border" />
                    </div>
                    <button onClick={() => setShowDatePicker(false)} className="w-full bg-red-600 text-white text-xs font-bold py-2 rounded mt-2 hover:bg-red-700">Apply Filter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* ADDED: Empty state handling for Donation Camps */}
          {displayedCamps.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed text-center text-gray-500">
              <p className="text-lg font-medium">No donation camps scheduled.</p>
              <p className="text-sm">Please check back later for upcoming blood drives in your area.</p>
            </div>
          ) : (
            displayedCamps.map((camp) => {
              const isRegistered = registeredCampIds.includes(camp.id);
              const isFull = camp.seats <= 0;

              return (
                <div key={camp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between hover:shadow-md transition duration-200 z-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{camp.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {isFull ? 'Full' : 'Open'}
                      </span>
                    </div>
                    <p className="text-red-600 font-medium text-sm mb-4">Organized by {camp.hospitalName}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><span>📅</span> {camp.date}</div>
                      <div className="flex items-center gap-2"><span>⏰</span> {camp.startTime} - {camp.endTime}</div>
                      <div className="flex items-center gap-2"><span>📍</span> {camp.location}</div>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-center justify-center gap-3 min-w-[140px]">
                    <div className="text-center">
                      <span className={`block text-2xl font-bold ${isFull ? 'text-red-600' : 'text-gray-800'}`}>
                        {camp.seats}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Slots Left</span>
                    </div>
                    {isRegistered ? (
                      <button disabled className="w-full bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-lg font-bold cursor-default">
                        ✓ Registered
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleRegister(camp.id)}
                        disabled={isFull}
                        className={`w-full px-4 py-2 rounded-lg font-medium transition shadow-sm mb-2 ${
                          isFull 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {isFull ? 'Full' : 'Register Now'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleDirections(camp.lat, camp.lng)}
                      className="w-full text-gray-600 hover:text-red-600 text-sm font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <span>🗺️</span> Directions
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationCamps;