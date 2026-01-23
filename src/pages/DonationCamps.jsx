import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DonationCamps = () => {
  const navigate = useNavigate();

  // --- STATES ---
  // Mock Data (Lat/Lng kept only for "Get Directions" link)
  const [camps] = useState([
    {
      id: 1,
      name: "Mega City Blood Drive",
      organizer: "Indu Blood Bank",
      date: "2023-11-20",
      time: "10:00 AM - 05:00 PM",
      location: "Vinraj Plaza, Kothi Rd, Anandpura",
      lat: 22.3008, lng: 73.1905,
      status: "Open",
      slots: 45
    },
    {
      id: 2,
      name: "Red Cross Weekend Camp",
      organizer: "Indian Red Cross Society",
      date: "2023-11-22",
      time: "09:00 AM - 02:00 PM",
      location: "Siddhivinayak Complex, Alkapuri",
      lat: 22.3114, lng: 73.1666,
      status: "Open",
      slots: 12
    },
    {
      id: 3,
      name: "Emergency Plasma Drive",
      organizer: "Dhwani Blood Centre",
      date: "2023-11-25",
      time: "24 Hours",
      location: "City Center, Bhimnath Bridge, Sayajiganj",
      lat: 22.3056, lng: 73.1834,
      status: "Filling Fast",
      slots: 5
    },
    {
      id: 4,
      name: "Community Health Camp",
      organizer: "Happy Faces Vadodara",
      date: "2023-12-01",
      time: "10:00 AM - 03:00 PM",
      location: "Vinayak Commercial Complex, Manjalpur",
      lat: 22.2750, lng: 73.1930,
      status: "Upcoming",
      slots: 120
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- HANDLERS ---
  const toggleDatePicker = () => setShowDatePicker(!showDatePicker);
  
  const clearDates = (e) => {
    e.stopPropagation();
    setDateRange({ start: '', end: '' });
  };

  const handleRegister = (camp) => {
    // Navigate to Schedule page with pre-selected camp data
    navigate('/schedule', { 
      state: { 
        preSelectedCampId: camp.id,
        preSelectedCampName: camp.name
      } 
    });
  };

  const handleDirections = (lat, lng) => {
    // Opens Google Maps with the destination coordinates
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // --- FILTERING LOGIC ---
  const getProcessedCamps = () => {
    // Search Filter
    let processed = camps.filter(camp =>
      camp.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Date Range Filter
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
          
          {/* Search Input */}
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

          {/* Action Buttons */}
          <div className="flex gap-2 w-full md:w-auto">
            
            {/* Filter by Date Range Button */}
            <div className="relative">
              <button 
                onClick={toggleDatePicker}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isDateFilterActive 
                  ? 'bg-red-50 text-red-600 border-red-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dateRange.start ? `${dateRange.start} ➔ ${dateRange.end || '...'}` : 'Filter by Date'}
                {isDateFilterActive && <span onClick={clearDates} className="ml-1 text-xs text-red-400 hover:text-red-700 font-bold px-1 cursor-pointer">✕</span>}
              </button>

              {/* Pop-up Range Picker */}
              {showDatePicker && (
                <div className="absolute top-12 right-0 z-50 bg-white shadow-xl border border-gray-100 rounded-lg p-4 w-72">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="w-full border-gray-300 rounded-md text-sm p-1.5 border focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        min={dateRange.start} 
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="w-full border-gray-300 rounded-md text-sm p-1.5 border focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <button onClick={() => setShowDatePicker(false)} className="w-full bg-red-600 text-white text-xs font-bold py-2 rounded mt-2 hover:bg-red-700">Apply Filter</button>
                  </div>
                </div>
              )}
            </div>

            {/* REMOVED: Sort by Distance Button */}
            
          </div>
        </div>

        {/* Camps List */}
        <div className="grid gap-6">
          {displayedCamps.map((camp) => (
            <div key={camp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between hover:shadow-md transition duration-200 z-0">
              
              {/* Left: Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{camp.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    camp.status === 'Open' ? 'bg-green-100 text-green-800' :
                    camp.status === 'Filling Fast' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {camp.status}
                  </span>
                </div>
                
                <p className="text-red-600 font-medium text-sm mb-4">Organized by {camp.organizer}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><span>📅</span> {camp.date}</div>
                  <div className="flex items-center gap-2"><span>⏰</span> {camp.time}</div>
                  <div className="flex items-center gap-2"><span>📍</span> {camp.location}</div>
                  {/* REMOVED: Distance display */}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-center justify-center gap-3 min-w-[140px]">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-gray-800">{camp.slots}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Slots Left</span>
                </div>
                
                <button 
                  onClick={() => handleRegister(camp)}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition shadow-sm mb-2"
                >
                  Register
                </button>
                
                <button 
                  onClick={() => handleDirections(camp.lat, camp.lng)}
                  className="w-full text-gray-600 hover:text-red-600 text-sm font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
                >
                  Get Directions
                </button>
              </div>

            </div>
          ))}

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