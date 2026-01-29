import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DonationCamps = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [camps, setCamps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Track registered IDs to prevent double booking in this session
  const [registeredCampIds, setRegisteredCampIds] = useState([]); 

  // --- 1. LOAD DATA (Hybrid: Live + Defaults) ---
  useEffect(() => {
    // A. Fetch Live Events created by Hospitals
    const liveEvents = JSON.parse(localStorage.getItem('hospital_events') || '[]');
    
    // B. Default Mock Data (So the page isn't empty if no hospital events exist)
    const defaultCamps = [
      {
        id: 101,
        title: "Mega City Blood Drive",
        hospitalName: "Indu Blood Bank",
        date: "2026-02-20",
        startTime: "10:00",
        endTime: "17:00",
        location: "Vinraj Plaza, Vadodara",
        lat: 22.3008, lng: 73.1905,
        seats: 45,
        donorsRegistered: 12
      },
      {
        id: 102,
        title: "Red Cross Weekend Camp",
        hospitalName: "Indian Red Cross Society",
        date: "2026-02-25",
        startTime: "09:00",
        endTime: "14:00",
        location: "Siddhivinayak Complex, Alkapuri",
        lat: 22.3114, lng: 73.1666,
        seats: 12,
        donorsRegistered: 5
      }
    ];

    // C. Merge Live + Default
    // We map 'liveEvents' to ensure data consistency
    const formattedLiveEvents = liveEvents.map(e => ({
      ...e,
      hospitalName: e.hospitalName || "City General Hospital",
      seats: parseInt(e.seats) || 0,
      donorsRegistered: parseInt(e.donorsRegistered) || 0
    }));

    setCamps([...formattedLiveEvents, ...defaultCamps]);
  }, []);

  // --- HANDLERS ---
  const toggleDatePicker = () => setShowDatePicker(!showDatePicker);
  
  const clearDates = (e) => {
    e.stopPropagation();
    setDateRange({ start: '', end: '' });
  };

  // --- 2. HANDLE REGISTRATION (Updates Database) ---
  const handleRegister = (campId) => {
    if(!window.confirm("Confirm registration for this blood drive?")) return;

    // A. Update Local State UI (Optimistic UI Update)
    const updatedCamps = camps.map(camp => {
      if (camp.id === campId) {
        if (camp.seats <= 0) {
          alert("Sorry, this camp is fully booked.");
          return camp;
        }
        return { 
          ...camp, 
          seats: camp.seats - 1, 
          donorsRegistered: camp.donorsRegistered + 1 
        };
      }
      return camp;
    });

    setCamps(updatedCamps);
    setRegisteredCampIds([...registeredCampIds, campId]); // Mark as registered locally

    // B. Update Global Storage (So Hospital sees the change)
    // Note: We only update the 'live' events in local storage
    const liveEvents = JSON.parse(localStorage.getItem('hospital_events') || '[]');
    const eventIndex = liveEvents.findIndex(e => e.id === campId);
    
    if (eventIndex !== -1) {
      liveEvents[eventIndex].seats = parseInt(liveEvents[eventIndex].seats) - 1;
      liveEvents[eventIndex].donorsRegistered = parseInt(liveEvents[eventIndex].donorsRegistered) + 1;
      localStorage.setItem('hospital_events', JSON.stringify(liveEvents));
    }

    alert("✅ Registration Successful! See you there.");
  };

  const handleDirections = (lat, lng) => {
    //window.open(`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`, '_blank');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  };

  // --- FILTERING LOGIC ---
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nearby Donation Camps ⛺</h1>
          <p className="text-gray-600 mt-2">Find and register for blood donation drives happening around you.</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center z-20 relative">
          
          {/* Search */}
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

          {/* Date Filter */}
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

        {/* Camps List */}
        <div className="grid gap-6">
          {displayedCamps.map((camp) => {
            const isRegistered = registeredCampIds.includes(camp.id);
            const isFull = camp.seats <= 0;

            return (
              <div key={camp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between hover:shadow-md transition duration-200 z-0">
                
                {/* Left: Info */}
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

                {/* Right: Actions */}
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
          })}

          {displayedCamps.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No donation camps found matching your filters.</p>
              <button 
                onClick={() => { setSearchTerm(''); setDateRange({start:'', end:''}); }}
                className="mt-4 text-red-600 font-medium hover:underline"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DonationCamps;