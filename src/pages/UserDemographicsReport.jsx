import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const UserDemographicsReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [demoData, setDemoData] = useState({
    summary: { totalDonors: 0, totalRecipients: 0, totalHospitals: 0 },
    roles: [],
    gender: [],
    city: [],
    age: [],
    blood: []
  });

  const fetchDemographics = async (start = '', end = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://127.0.0.1:8000/api/admin/demographics-report/';
      if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch demographics");
      const data = await response.json();
      setDemoData(data);
    } catch (err) {
      setError("Unable to load demographics. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    if (startDate && endDate && endDate < startDate) {
      setError("Validation Error: End Date cannot be earlier than Start Date.");
      return;
    }
    fetchDemographics(startDate, endDate);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    fetchDemographics('', '');
  };

  useEffect(() => {
    fetchDemographics();
  }, []);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text("LifeLink User & Demographic Analytics", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr} | Snapshot: Live System Data`, 14, 30);

    // Summary 
    autoTable(doc, {
      startY: 40,
      head: [['User Category', 'Total Registered']],
      body: [
        ['Active Donors', demoData.summary.totalDonors],
        ['Registered Recipients', demoData.summary.totalRecipients],
        ['Partner Hospitals', demoData.summary.totalHospitals]
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] }
    });

    // Gender & Age
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Donor Profile Breakdown (Gender & Age)", 14, doc.lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Metric', 'Category', 'Count']],
      body: [
        ...demoData.gender.map(g => ['Gender', g.gender, g.count]),
        ...demoData.age.map(a => ['Age Group', a.ageGroup, a.count])
      ],
      theme: 'striped',
      headStyles: { fillColor: [185, 28, 28] }
    });

    // Geographic Distribution
    doc.text("Geographic Distribution (Top Cities)", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['City/Region', 'Registered Donors']],
      body: demoData.city.map(c => [c.city, c.count]),
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] }
    });

    doc.save(`LifeLink_Demographics_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  if (loading) return <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Demographics...</div>;
  if (error) return <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold m-8">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">User & Demographic Analytics</h1>
            <p className="text-gray-500 mt-1">Live snapshot of platform adoption, donor profiles, and geographic reach.</p>
          </div>
          <button 
            onClick={handleDownloadPDF} 
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition flex items-center gap-2 shadow-md"
          >
            <span>📄</span> Export Demographics
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button 
            onClick={handleApplyFilters} 
            className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition"
          >
            Apply
          </button>
          <button 
            onClick={handleClearFilters} 
            className="text-gray-600 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-bold transition"
          >
            Clear Filters
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Donors</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{demoData.summary.totalDonors}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Recipients</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{demoData.summary.totalRecipients}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Partner Hospitals</p>
            <p className="text-4xl font-black text-gray-800 mt-2">{demoData.summary.totalHospitals}</p>
          </div>
        </div>

        {/* Demographics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Geographic Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">📍 Geographic Reach (Donor Cities)</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City / Region</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Registered Donors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demoData.city.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.city}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gender Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Donor Gender Split</h3>
            </div>
            <div className="p-6 space-y-4">
              {demoData.gender.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{g.gender}</span>
                  <span className="text-sm font-bold bg-gray-100 text-gray-800 px-3 py-1 rounded-full">{g.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-1">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Donor Age Demographics</h3>
            </div>
            <div className="p-6 space-y-4">
              {demoData.age.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-bold text-gray-500">{a.ageGroup} Yrs</span>
                  <span className="text-sm font-bold text-gray-900">{a.count} Users</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blood Type Adoption */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Donor Blood Type Distribution</h3>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {demoData.blood.map((b, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-lg text-center bg-gray-50/50">
                  <div className="text-sm font-bold text-red-600 mb-1">{b.bloodGroup}</div>
                  <div className="text-2xl font-black text-gray-800">{b.count}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserDemographicsReport;
