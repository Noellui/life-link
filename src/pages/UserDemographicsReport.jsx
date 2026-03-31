import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = ['All', 'Male', 'Female', 'Other', 'Not Specified'];
const ROLES = ['All', 'Donor', 'Recipient', 'Hospital'];

const Pill = ({ label, active, onClick, color = 'gray' }) => {
  const colors = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    purple: active ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${colors[color]}`}>
      {label}
    </button>
  );
};

const UserDemographicsReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // New filters
  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [citySearch, setCitySearch] = useState('');

  const [demoData, setDemoData] = useState({
    summary: { totalDonors: 0, totalRecipients: 0, totalHospitals: 0 },
    roles: [], gender: [], city: [], age: [], blood: [],
  });

  const fetchDemographics = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = new URL('http://127.0.0.1:8000/api/admin/demographics-report/');
      if (startDate && endDate) {
        url.searchParams.append('start_date', startDate);
        url.searchParams.append('end_date', endDate);
      }
      if (bloodGroupFilter !== 'All') url.searchParams.append('blood_group', bloodGroupFilter);
      if (genderFilter !== 'All') url.searchParams.append('gender', genderFilter);
      if (roleFilter !== 'All') url.searchParams.append('role', roleFilter);
      if (citySearch) url.searchParams.append('city', citySearch);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch demographics');
      const data = await response.json();
      setDemoData(data);
    } catch (err) {
      setError('Unable to load demographics. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDemographics();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloodGroupFilter, genderFilter, roleFilter, citySearch]);

  const handleApplyFilters = () => {
    if (startDate && endDate && endDate < startDate) {
      setError('Validation Error: End Date cannot be earlier than Start Date.');
      return;
    }
    fetchDemographics();
  };

  const handleClearFilters = () => {
    setStartDate(''); setEndDate('');
    setBloodGroupFilter('All');
    setGenderFilter('All');
    setRoleFilter('All');
    setCitySearch('');
    // The useEffect will trigger fetch automatically because state changes
  };

  // ── Derived filtered data ──────────────────────────────────────────────────
  const filteredCity = demoData.city || [];
  const filteredGender = demoData.gender || [];
  const filteredBlood = demoData.blood || [];
  const filteredRoles = demoData.roles || [];

  // Filtered summary
  const filteredSummary = {
    totalDonors: roleFilter === 'All' || roleFilter === 'Donor' ? demoData.summary.totalDonors : '—',
    totalRecipients: roleFilter === 'All' || roleFilter === 'Recipient' ? demoData.summary.totalRecipients : '—',
    totalHospitals: roleFilter === 'All' || roleFilter === 'Hospital' ? demoData.summary.totalHospitals : '—',
  };

  const hasActiveFilters = bloodGroupFilter !== 'All' || genderFilter !== 'All' || roleFilter !== 'All' || citySearch || startDate;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(22); doc.setTextColor(220, 38, 38);
    doc.text('LifeLink User & Demographic Analytics', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 30);
    doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Period: All Time', 14, 36);

    autoTable(doc, {
      startY: 44,
      head: [['User Category', 'Total']],
      body: [
        ['Active Donors', demoData.summary.totalDonors],
        ['Registered Recipients', demoData.summary.totalRecipients],
        ['Partner Hospitals', demoData.summary.totalHospitals],
      ],
      theme: 'striped', headStyles: { fillColor: [31, 41, 55] },
    });

    doc.setFontSize(14); doc.setTextColor(31, 41, 55);
    doc.text('Donor Profile (Gender & Age)', 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Metric', 'Category', 'Count']],
      body: [
        ...filteredGender.map(g => ['Gender', g.gender, g.count]),
        ...demoData.age.map(a => ['Age Group', a.ageGroup, a.count]),
      ],
      theme: 'striped', headStyles: { fillColor: [185, 28, 28] },
    });

    doc.text('Geographic Distribution', 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['City', 'Donors']],
      body: filteredCity.map(c => [c.city, c.count]),
      theme: 'striped', headStyles: { fillColor: [75, 85, 99] },
    });

    doc.save(`LifeLink_Demographics_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  if (loading) return <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Demographics...</div>;
  if (error) return <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold m-8">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">User & Demographic Analytics</h1>
            <p className="text-gray-500 mt-1">Live snapshot of platform adoption, donor profiles, and geographic reach.</p>
          </div>
          <button onClick={handleDownloadPDF}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
            <span>📄</span> Export PDF
          </button>
        </div>

        {/* ── FILTER PANEL ── */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Filters</p>

          {/* Date row */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 w-44" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 w-44" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleApplyFilters} className="bg-red-600 text-white px-5 py-2 rounded font-bold hover:bg-red-700 transition text-sm">Apply Date</button>
              <button onClick={handleClearFilters} className="text-gray-600 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-bold transition text-sm">Reset All</button>
            </div>
          </div>

          {/* Role filter */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">User Role</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <Pill key={r} label={r} active={roleFilter === r}
                  onClick={() => setRoleFilter(r)}
                  color={r === 'Donor' ? 'red' : r === 'Recipient' ? 'blue' : r === 'Hospital' ? 'green' : 'gray'} />
              ))}
            </div>
          </div>

          {/* Blood group filter */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Blood Group</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <Pill key={bg} label={bg} active={bloodGroupFilter === bg}
                  onClick={() => setBloodGroupFilter(bg)} color="red" />
              ))}
            </div>
          </div>

          {/* Gender filter */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gender</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map(g => (
                <Pill key={g} label={g} active={genderFilter === g}
                  onClick={() => setGenderFilter(g)} color="purple" />
              ))}
            </div>
          </div>

          {/* City search */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">City Search</label>
            <div className="relative w-72">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">🔍</span>
              <input type="text" placeholder="Filter by city..." value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              {citySearch && (
                <button onClick={() => setCitySearch('')}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-bold self-center">Active:</span>
              {roleFilter !== 'All' && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  Role: {roleFilter}
                  <button onClick={() => setRoleFilter('All')} className="ml-1 hover:text-green-900">✕</button>
                </span>
              )}
              {bloodGroupFilter !== 'All' && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  🩸 {bloodGroupFilter}
                  <button onClick={() => setBloodGroupFilter('All')} className="ml-1 hover:text-red-900">✕</button>
                </span>
              )}
              {genderFilter !== 'All' && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  Gender: {genderFilter}
                  <button onClick={() => setGenderFilter('All')} className="ml-1 hover:text-purple-900">✕</button>
                </span>
              )}
              {citySearch && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  📍 "{citySearch}"
                  <button onClick={() => setCitySearch('')} className="ml-1 hover:text-blue-900">✕</button>
                </span>
              )}
              {startDate && endDate && (
                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                  📅 {startDate} → {endDate}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${roleFilter === 'Recipient' || roleFilter === 'Hospital' ? 'border-gray-200 opacity-50' : 'border-red-500'}`}>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Donors</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{filteredSummary.totalDonors}</p>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${roleFilter === 'Donor' || roleFilter === 'Hospital' ? 'border-gray-200 opacity-50' : 'border-blue-500'}`}>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Recipients</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{filteredSummary.totalRecipients}</p>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${roleFilter === 'Donor' || roleFilter === 'Recipient' ? 'border-gray-200 opacity-50' : 'border-purple-500'}`}>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Partner Hospitals</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{filteredSummary.totalHospitals}</p>
          </div>
        </div>

        {/* Demographics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* City Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">📍 Geographic Reach</h3>
              {citySearch && (
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-full">
                  {filteredCity.length} cities shown
                </span>
              )}
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City / Region</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Registered Donors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCity.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setCitySearch(c.city)}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.city}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{c.count}</td>
                  </tr>
                ))}
                {filteredCity.length === 0 && (
                  <tr><td colSpan="2" className="px-6 py-8 text-center text-sm text-gray-400">No cities match "{citySearch}".</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Gender */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Gender Split</h3>
              {genderFilter !== 'All' && (
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-full">
                  {genderFilter}
                </span>
              )}
            </div>
            <div className="p-6 space-y-3">
              {filteredGender.map((g, idx) => (
                <div key={idx}
                  onClick={() => setGenderFilter(g.gender === genderFilter ? 'All' : g.gender)}
                  className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition ${genderFilter === g.gender ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'}`}>
                  <span className="text-sm font-medium text-gray-600">{g.gender}</span>
                  <span className="text-sm font-bold bg-gray-100 text-gray-800 px-3 py-1 rounded-full">{g.count}</span>
                </div>
              ))}
              {filteredGender.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No data for selected gender.</p>
              )}
            </div>
          </div>

          {/* Age */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-1">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Age Demographics</h3>
            </div>
            <div className="p-6 space-y-4">
              {demoData.age.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-dashed border-gray-100 pb-2 last:border-0">
                  <span className="text-sm font-bold text-gray-500">{a.ageGroup} Yrs</span>
                  <span className="text-sm font-bold text-gray-900">{a.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blood Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Blood Type Distribution</h3>
              {bloodGroupFilter !== 'All' && (
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full">
                  Showing: {bloodGroupFilter}
                </span>
              )}
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {filteredBlood.map((b, idx) => (
                <div key={idx}
                  onClick={() => setBloodGroupFilter(b.bloodGroup === bloodGroupFilter ? 'All' : b.bloodGroup)}
                  className={`p-4 border rounded-lg text-center cursor-pointer transition hover:shadow-md ${bloodGroupFilter === b.bloodGroup ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-gray-50/50'
                    }`}>
                  <div className="text-sm font-bold text-red-600 mb-1">{b.bloodGroup}</div>
                  <div className="text-2xl font-black text-gray-800">{b.count}</div>
                </div>
              ))}
              {filteredBlood.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-4">No donors for {bloodGroupFilter}.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDemographicsReport;