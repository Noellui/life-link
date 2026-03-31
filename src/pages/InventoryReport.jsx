import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const EXPIRY_WINDOWS = [
  { label: 'All', days: null },
  { label: '≤ 7 days', days: 7 },
  { label: '≤ 14 days', days: 14 },
  { label: '≤ 30 days', days: 30 },
];

const Pill = ({ label, active, onClick, color = 'gray' }) => {
  const colors = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    amber: active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${colors[color]}`}>
      {label}
    </button>
  );
};

const InventoryReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [expiryWindow, setExpiryWindow] = useState(null);
  const [expiryWindowLabel, setExpiryWindowLabel] = useState('All');

  const [inventoryData, setInventoryData] = useState({
    totalUnits: 0,
    stockByGroup: [],
    expiringSoon: [],
    hospitalStock: [],
    inflow: 0,
    outflow: 0,
  });

  const fetchInventoryData = async (start = '', end = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://127.0.0.1:8000/api/admin/inventory-report/';
      if (start && end) url += `?start_date=${start}&end_date=${end}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      const data = await response.json();
      setInventoryData({
        totalUnits: data.totalUnits || 0,
        stockByGroup: data.stockByGroup || [],
        expiringSoon: data.expiringSoon || [],
        hospitalStock: data.hospitalStock || [],
        inflow: data.inflow || 0,
        outflow: data.outflow || 0,
      });
    } catch (err) {
      setError('Unable to load inventory reports. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventoryData(); }, []);

  const handleFilter = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert('Please provide both a Start Date and an End Date.');
      return;
    }
    fetchInventoryData(startDate, endDate);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setBloodGroupFilter('All');
    setHospitalSearch('');
    setExpiryWindow(null);
    setExpiryWindowLabel('All');
    fetchInventoryData();
  };

  // ── Derived filtered data ──────────────────────────────────────────────────
  const filteredStockByGroup = inventoryData.stockByGroup.filter(item =>
    bloodGroupFilter === 'All' || item.bloodGroup === bloodGroupFilter
  );

  const filteredHospitalStock = inventoryData.hospitalStock
    .map(h => {
      if (bloodGroupFilter === 'All') return h;
      return { ...h, units: h.breakdown?.[bloodGroupFilter] || 0 };
    })
    .filter(h => {
      const matchesSearch = !hospitalSearch || h.hospitalName.toLowerCase().includes(hospitalSearch.toLowerCase());
      const hasStock = bloodGroupFilter === 'All' ? true : h.units > 0;
      return matchesSearch && hasStock;
    })
    .sort((a, b) => b.units - a.units);

  const filteredExpiringSoon = inventoryData.expiringSoon.filter(item => {
    const matchesBlood = bloodGroupFilter === 'All' || item.bloodGroup === bloodGroupFilter;
    const matchesHospital = !hospitalSearch || item.hospital.toLowerCase().includes(hospitalSearch.toLowerCase());
    const matchesWindow = expiryWindow === null || (() => {
      const today = new Date();
      const expiry = new Date(item.expiryDate);
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      return diffDays <= expiryWindow;
    })();
    return matchesBlood && matchesHospital && matchesWindow;
  });

  const filteredTotalUnits = bloodGroupFilter === 'All'
    ? inventoryData.totalUnits
    : (filteredStockByGroup[0]?.units || 0);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(22); doc.setTextColor(220, 38, 38);
    doc.text('LifeLink Global Blood Inventory Report', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 30);
    doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Period: All Time', 14, 36);

    // Active filter summary line
    const filterParts = [];
    if (bloodGroupFilter !== 'All') filterParts.push(`Blood Group: ${bloodGroupFilter}`);
    if (expiryWindowLabel !== 'All') filterParts.push(`Expiry Window: ${expiryWindowLabel}`);
    if (hospitalSearch) filterParts.push(`Hospital: "${hospitalSearch}"`);
    let tableStartY = 45;
    if (filterParts.length > 0) {
      doc.setTextColor(80, 80, 80);
      doc.text(`Active Filters — ${filterParts.join(' | ')}`, 14, 42);
      doc.setTextColor(100);
      tableStartY = 50;
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [['Metric', 'Value']],
      body: [
        [bloodGroupFilter !== 'All' ? `${bloodGroupFilter} Stock` : 'Total Available Units', `${filteredTotalUnits} Units`],
        ['Inflow (Donations)', `${inventoryData.inflow} Units`],
        ['Outflow (Fulfilled Requests)', `${inventoryData.outflow} Units`],
        [`Expiry Alerts${expiryWindowLabel !== 'All' ? ` (${expiryWindowLabel})` : ' (Next 7 days)'}`, `${filteredExpiringSoon.length} units at risk`],
      ],
      theme: 'striped', headStyles: { fillColor: [31, 41, 55] },
    });

    doc.setFontSize(14); doc.setTextColor(31, 41, 55);
    doc.text(
      `Stock by Blood Group${bloodGroupFilter !== 'All' ? ` — ${bloodGroupFilter} only` : ''}`,
      14, doc.lastAutoTable.finalY + 15
    );
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Blood Group', 'Units Available']],
      body: filteredStockByGroup.map(i => [i.bloodGroup, `${i.units} Units`]),
      theme: 'striped', headStyles: { fillColor: [185, 28, 28] },
    });

    doc.text(
      `Hospital Stock Distribution${hospitalSearch ? ` (filtered: "${hospitalSearch}")` : ''}${bloodGroupFilter !== 'All' ? ` — ${bloodGroupFilter}` : ''}`,
      14, doc.lastAutoTable.finalY + 15
    );
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Hospital', 'Units']],
      body: filteredHospitalStock.map(h => [h.hospitalName, `${h.units} Units`]),
      theme: 'grid', headStyles: { fillColor: [55, 65, 81] },
    });

    if (filteredExpiringSoon.length > 0) {
      doc.addPage();
      doc.setFontSize(16); doc.setTextColor(220, 38, 38);
      doc.text(
        `Critical Expiry Alerts${expiryWindowLabel !== 'All' ? ` — ${expiryWindowLabel}` : ''}${bloodGroupFilter !== 'All' ? ` — ${bloodGroupFilter}` : ''}`,
        14, 20
      );
      autoTable(doc, {
        startY: 30,
        head: [['Unit ID', 'Blood Group', 'Hospital', 'Expiry Date']],
        body: filteredExpiringSoon.map(a => [`#${a.unitId}`, a.bloodGroup, a.hospital, a.expiryDate]),
        theme: 'striped', headStyles: { fillColor: [220, 38, 38] },
      });
    }

    doc.save(`LifeLink_Inventory_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  const hasActiveFilters = bloodGroupFilter !== 'All' || hospitalSearch || expiryWindow !== null || startDate;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Global Inventory & Logistics</h1>
            <p className="text-gray-500 mt-1">Monitor blood stock, track distribution, and prevent wastage.</p>
          </div>
          <button onClick={handleDownloadPDF} disabled={loading || !!error}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md">
            <span>📄</span> Download PDF
          </button>
        </div>

        {/* ── FILTER PANEL ── */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Filters</p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-44" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-44" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleFilter} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Apply Date</button>
              <button onClick={handleClear} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Reset All</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Blood Group</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <Pill key={bg} label={bg} active={bloodGroupFilter === bg}
                  onClick={() => setBloodGroupFilter(bg)} color="red" />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Risk Window</label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_WINDOWS.map(w => (
                <Pill key={w.label} label={w.label} active={expiryWindowLabel === w.label}
                  onClick={() => { setExpiryWindow(w.days); setExpiryWindowLabel(w.label); }}
                  color="amber" />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hospital Search</label>
            <div className="relative w-72">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">🔍</span>
              <input type="text" placeholder="Search hospital..." value={hospitalSearch}
                onChange={e => setHospitalSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              {hospitalSearch && (
                <button onClick={() => setHospitalSearch('')}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-bold self-center">Active:</span>
              {bloodGroupFilter !== 'All' && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  🩸 {bloodGroupFilter}
                  <button onClick={() => setBloodGroupFilter('All')} className="ml-1 hover:text-red-900">✕</button>
                </span>
              )}
              {expiryWindow !== null && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  ⏰ Expiry: {expiryWindowLabel}
                  <button onClick={() => { setExpiryWindow(null); setExpiryWindowLabel('All'); }} className="ml-1 hover:text-amber-900">✕</button>
                </span>
              )}
              {hospitalSearch && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  🏥 "{hospitalSearch}"
                  <button onClick={() => setHospitalSearch('')} className="ml-1 hover:text-blue-900">✕</button>
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

        {loading ? (
          <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Global Inventory...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold">{error}</div>
        ) : (
          <>
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {bloodGroupFilter !== 'All' ? `${bloodGroupFilter} Stock` : 'Total System Stock'}
                </p>
                <p className="text-4xl font-black text-gray-800 mt-2">
                  {filteredTotalUnits} <span className="text-lg text-gray-400 font-medium">Units</span>
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Units Collected</p>
                <p className="text-4xl font-black text-green-600 mt-2">+{inventoryData.inflow}</p>
                {startDate && <p className="text-xs text-gray-400 mt-1">Filtered Period</p>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Expiry Alerts</p>
                <p className={`text-4xl font-black mt-2 ${filteredExpiringSoon.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {filteredExpiringSoon.length}
                </p>
                <p className="text-xs text-gray-400 mt-1">{expiryWindowLabel !== 'All' ? expiryWindowLabel : 'Next 7 days'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Expiry Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                  <div className="p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">⚠️ Expiry Alerts</h3>
                    <span className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full">
                      {filteredExpiringSoon.length} At Risk
                    </span>
                  </div>
                  {filteredExpiringSoon.length > 0 ? (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-red-100">
                        <thead className="bg-white sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit / Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Expiring On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredExpiringSoon.map((alert, idx) => (
                            <tr key={idx} className="hover:bg-red-50/50">
                              <td className="px-6 py-3">
                                <span className="font-mono text-gray-500 text-xs">#{alert.unitId}</span>
                                <span className="ml-2 font-bold text-red-600">{alert.bloodGroup}</span>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-700">{alert.hospital}</td>
                              <td className="px-6 py-3 text-sm font-bold text-red-600 text-right">{alert.expiryDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-500">
                      No units at risk for the selected filters.
                    </div>
                  )}
                </div>

                {/* Stock by Blood Group */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Stock By Blood Group</h3>
                    {bloodGroupFilter !== 'All' && (
                      <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full">
                        Showing: {bloodGroupFilter}
                      </span>
                    )}
                  </div>
                  <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {filteredStockByGroup.map((bg, idx) => (
                      <div key={idx}
                        onClick={() => setBloodGroupFilter(bg.bloodGroup === bloodGroupFilter ? 'All' : bg.bloodGroup)}
                        className={`p-4 border rounded-lg text-center cursor-pointer transition hover:shadow-md ${bloodGroupFilter === bg.bloodGroup ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}>
                        <div className="text-sm font-bold text-gray-500 mb-1">{bg.bloodGroup}</div>
                        <div className={`text-2xl font-black ${bg.units === 0 ? 'text-red-500' : 'text-gray-900'}`}>{bg.units}</div>
                        <div className="text-xs text-gray-400 mt-1">Units</div>
                      </div>
                    ))}
                    {filteredStockByGroup.length === 0 && (
                      <p className="col-span-4 text-center text-gray-400 py-4">No stock for selected blood group.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Hospital breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">By Hospital</h3>
                  <span className="text-xs text-gray-500">{filteredHospitalStock.length} hospitals</span>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white sticky top-0">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredHospitalStock.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-5 py-4 text-sm font-medium text-gray-800">{h.hospitalName}</td>
                          <td className="px-5 py-4 text-sm font-bold text-blue-600 text-right">{h.units}</td>
                        </tr>
                      ))}
                      {filteredHospitalStock.length === 0 && (
                        <tr><td colSpan="2" className="px-5 py-8 text-center text-sm text-gray-400">No hospitals match search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryReport;