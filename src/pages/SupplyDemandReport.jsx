import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfFooter } from '../utils/pdfFooter';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const SD_STATUSES = ['All', 'Deficit', 'Balanced', 'Surplus'];
const REQ_STATUSES = ['All', 'Pending', 'Approved', 'Awaiting Payment', 'Fulfilled', 'Rejected'];

const Pill = ({ label, active, onClick, color = 'gray' }) => {
  const colors = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    yellow: active ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${colors[color]}`}>
      {label}
    </button>
  );
};

const SupplyDemandReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [sdStatusFilter, setSdStatusFilter] = useState('All');
  const [reqStatusFilter, setReqStatusFilter] = useState('All');
  const [hospitalSearch, setHospitalSearch] = useState('');

  const [data, setData] = useState({
    supplyDemand: [], requestStatuses: [],
    totalRequests: 0, fulfillmentRate: 0,
    topHospitals: [], monthlyTrend: [], donationTrend: [],
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = new URL('http://127.0.0.1:8000/api/admin/supply-demand-report/');
      if (startDate && endDate) {
        url.searchParams.append('start_date', startDate);
        url.searchParams.append('end_date', endDate);
      }
      if (bloodGroupFilter !== 'All') url.searchParams.append('blood_group', bloodGroupFilter);
      if (reqStatusFilter !== 'All') url.searchParams.append('req_status', reqStatusFilter);
      if (hospitalSearch) url.searchParams.append('hospital', hospitalSearch);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch supply/demand data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Unable to load Supply & Demand report. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloodGroupFilter, reqStatusFilter, hospitalSearch]);

  const handleFilter = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert('Please provide both a Start Date and an End Date.');
      return;
    }
    fetchData();
  };

  const handleClear = () => {
    setStartDate(''); setEndDate('');
    setBloodGroupFilter('All');
    setSdStatusFilter('All');
    setReqStatusFilter('All');
    setHospitalSearch('');
    // handled implicitly by useEffect
  };

  // ── Derived filtered data ──────────────────────────────────────────────────
  // Local filtering is only maintained for sdStatusFilter since it derives from global demand/supply
  const filteredSupplyDemand = data.supplyDemand.filter(s => {
    const matchStatus = sdStatusFilter === 'All' || s.status === sdStatusFilter;
    return matchStatus;
  });

  const filteredReqStatuses = data.requestStatuses;
  const filteredTopHospitals = data.topHospitals;

  const filteredTotal = filteredReqStatuses.reduce((s, r) => s + r.count, 0);
  const filteredFulfilled = filteredReqStatuses.filter(s => ['Fulfilled', 'Awaiting Payment'].includes(s.status)).reduce((s, r) => s + r.count, 0);
  const filteredFulfillRate = filteredTotal > 0 ? Math.round((filteredFulfilled / filteredTotal) * 100) : 0;

  const hasActiveFilters = bloodGroupFilter !== 'All' || sdStatusFilter !== 'All' || reqStatusFilter !== 'All' || hospitalSearch || startDate;

  const getStatusColor = (status) => {
    if (status === 'Surplus') return 'text-green-600 bg-green-50';
    if (status === 'Deficit') return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getGapColor = (gap) => {
    if (gap > 0) return 'text-green-600';
    if (gap < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const reqStatusColor = (status) => {
    if (status === 'Fulfilled' || status === 'Awaiting Payment') return 'bg-green-100 text-green-700';
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'Approved') return 'bg-blue-100 text-blue-700';
    if (status === 'Rejected') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(22); doc.setTextColor(220, 38, 38);
    doc.text('LifeLink Supply & Demand Dynamics', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 30);
    doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Period: All Time', 14, 36);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Requests (filtered)', filteredTotal],
        ['Fulfillment Rate', `${filteredFulfillRate}%`],
        ['Deficit Blood Groups', filteredSupplyDemand.filter(s => s.status === 'Deficit').length],
        ['Surplus Blood Groups', filteredSupplyDemand.filter(s => s.status === 'Surplus').length],
      ],
      theme: 'striped', headStyles: { fillColor: [31, 41, 55] },
    });

    doc.setFontSize(14); doc.setTextColor(31, 41, 55);
    doc.text('Supply vs Demand', 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Blood Group', 'Supply', 'Demand', 'Gap', 'Status']],
      body: filteredSupplyDemand.map(s => [s.bloodGroup, s.supply, s.demand, s.gap, s.status]),
      theme: 'striped', headStyles: { fillColor: [185, 28, 28] },
    });

    doc.text('Top Requesting Hospitals', 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Hospital', 'Requests', 'Units']],
      body: filteredTopHospitals.map(h => [h.hospitalName, h.requestCount, h.totalUnits]),
      theme: 'striped', headStyles: { fillColor: [75, 85, 99] },
    });

    addPdfFooter(doc, 'Supply & Demand Dynamics');
    doc.save(`LifeLink_SupplyDemand_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Supply & Demand Dynamics</h1>
            <p className="text-gray-500 mt-1">Analyze blood supply gaps, fulfillment rates, and hospital demand.</p>
          </div>
          <button onClick={handleDownloadPDF} disabled={loading || !!error}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md">
            <span>📄</span> Export Report
          </button>
        </div>

        {/* ── FILTER PANEL ── */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Filters</p>

          {/* Date row */}
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

          {/* Blood group pills */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Blood Group</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <Pill key={bg} label={bg} active={bloodGroupFilter === bg}
                  onClick={() => setBloodGroupFilter(bg)} color="red" />
              ))}
            </div>
          </div>

          {/* Supply/Demand status */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Supply/Demand Status</label>
            <div className="flex flex-wrap gap-2">
              {SD_STATUSES.map(s => (
                <Pill key={s} label={s} active={sdStatusFilter === s}
                  onClick={() => setSdStatusFilter(s)}
                  color={s === 'Deficit' ? 'red' : s === 'Surplus' ? 'green' : s === 'Balanced' ? 'blue' : 'gray'} />
              ))}
            </div>
          </div>

          {/* Request status */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Request Status</label>
            <div className="flex flex-wrap gap-2">
              {REQ_STATUSES.map(s => (
                <Pill key={s} label={s} active={reqStatusFilter === s}
                  onClick={() => setReqStatusFilter(s)}
                  color={s === 'Fulfilled' ? 'green' : s === 'Rejected' ? 'red' : s === 'Pending' ? 'yellow' : s === 'Approved' ? 'blue' : s === 'Awaiting Payment' ? 'orange' : 'gray'} />
              ))}
            </div>
          </div>

          {/* Hospital search */}
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

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-bold self-center">Active:</span>
              {bloodGroupFilter !== 'All' && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  🩸 {bloodGroupFilter}
                  <button onClick={() => setBloodGroupFilter('All')} className="ml-1 hover:text-red-900">✕</button>
                </span>
              )}
              {sdStatusFilter !== 'All' && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  SD: {sdStatusFilter}
                  <button onClick={() => setSdStatusFilter('All')} className="ml-1 hover:text-green-900">✕</button>
                </span>
              )}
              {reqStatusFilter !== 'All' && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  Status: {reqStatusFilter}
                  <button onClick={() => setReqStatusFilter('All')} className="ml-1 hover:text-blue-900">✕</button>
                </span>
              )}
              {hospitalSearch && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  🏥 "{hospitalSearch}"
                  <button onClick={() => setHospitalSearch('')} className="ml-1 hover:text-purple-900">✕</button>
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
          <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Supply & Demand Data...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold">{error}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-800">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {reqStatusFilter !== 'All' ? `${reqStatusFilter} Requests` : 'Total Requests'}
                </p>
                <p className="text-4xl font-black text-gray-800 mt-2">{filteredTotal || data.totalRequests}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Fulfillment Rate</p>
                <p className={`text-4xl font-black mt-2 ${filteredFulfillRate >= 70 ? 'text-green-600' : filteredFulfillRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {reqStatusFilter !== 'All' ? filteredFulfillRate : data.fulfillmentRate}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {sdStatusFilter === 'All' ? 'In Deficit' : `${sdStatusFilter} Groups`}
                </p>
                <p className="text-4xl font-black text-red-600 mt-2">
                  {sdStatusFilter === 'All'
                    ? filteredSupplyDemand.filter(s => s.status === 'Deficit').length
                    : filteredSupplyDemand.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">In Surplus</p>
                <p className="text-4xl font-black text-blue-600 mt-2">
                  {filteredSupplyDemand.filter(s => s.status === 'Surplus').length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Supply vs Demand Table */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Supply vs Demand</h3>
                  <span className="text-xs text-gray-500">{filteredSupplyDemand.length} groups shown</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Group</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Supply</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Demand</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Gap</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSupplyDemand.map((s, idx) => (
                        <tr key={idx}
                          onClick={() => setBloodGroupFilter(s.bloodGroup === bloodGroupFilter ? 'All' : s.bloodGroup)}
                          className="hover:bg-gray-50 transition cursor-pointer">
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{s.bloodGroup}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">{s.supply}</td>
                          <td className="px-6 py-4 text-sm font-bold text-orange-600 text-right">{s.demand}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-right ${getGapColor(s.gap)}`}>
                            {s.gap > 0 ? `+${s.gap}` : s.gap}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredSupplyDemand.length === 0 && (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-400">No data matches the selected filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Request Status Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Request Statuses</h3>
                  {reqStatusFilter !== 'All' && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${reqStatusColor(reqStatusFilter)}`}>
                      {reqStatusFilter}
                    </span>
                  )}
                </div>
                <div className="p-6 space-y-3">
                  {filteredReqStatuses.map((s, idx) => {
                    const base = reqStatusFilter !== 'All' ? filteredTotal : data.totalRequests;
                    const pct = base > 0 ? Math.round((s.count / base) * 100) : 0;
                    const barColor =
                      s.status === 'Fulfilled' || s.status === 'Awaiting Payment' ? 'bg-green-500' :
                        s.status === 'Pending' ? 'bg-yellow-500' :
                          s.status === 'Approved' ? 'bg-blue-500' :
                            s.status === 'Rejected' ? 'bg-red-500' : 'bg-gray-400';
                    return (
                      <div key={idx}
                        onClick={() => setReqStatusFilter(s.status === reqStatusFilter ? 'All' : s.status)}
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{s.status}</span>
                          <span className="font-bold text-gray-900">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {filteredReqStatuses.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No data for selected status.</p>
                  )}
                </div>
              </div>

              {/* Top Hospitals */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Top Requesting Hospitals</h3>
                  {hospitalSearch && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-full">
                      {filteredTopHospitals.length} shown
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Requests</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTopHospitals.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{h.hospitalName}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">{h.requestCount}</td>
                          <td className="px-6 py-4 text-sm font-bold text-orange-600 text-right">{h.totalUnits}</td>
                        </tr>
                      ))}
                      {filteredTopHospitals.length === 0 && (
                        <tr><td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-400">No hospitals match search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Trends */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Monthly Trends (6M)</h3>
                </div>
                <div className="p-6 space-y-3">
                  {data.monthlyTrend.map((m, idx) => {
                    const donEntry = data.donationTrend.find(d => d.month === m.month);
                    const donations = donEntry ? donEntry.donations : 0;
                    return (
                      <div key={idx} className="border-b border-dashed border-gray-100 pb-3 last:border-0 last:pb-0">
                        <p className="text-xs font-bold text-gray-400 uppercase">{m.month}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-sm text-orange-600 font-bold">📥 {m.requests} Req ({m.units} units)</span>
                          <span className="text-sm text-green-600 font-bold">📤 {donations}</span>
                        </div>
                      </div>
                    );
                  })}
                  {data.monthlyTrend.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No trend data available.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplyDemandReport;