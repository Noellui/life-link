import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfFooter } from '../utils/pdfFooter';

const SupplyDemandReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    supplyDemand: [],
    requestStatuses: [],
    totalRequests: 0,
    fulfillmentRate: 0,
    topHospitals: [],
    monthlyTrend: [],
    donationTrend: []
  });

  const fetchData = async (start = '', end = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://127.0.0.1:8000/api/admin/supply-demand-report/';
      if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch supply/demand data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Unable to load Supply & Demand report. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFilter = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert("Please provide both a Start Date and an End Date.");
      return;
    }
    fetchData(startDate, endDate);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    fetchData();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text("LifeLink Supply & Demand Dynamics", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 30);
    if (startDate && endDate) {
      doc.text(`Reporting Period: ${startDate} to ${endDate}`, 14, 36);
    } else {
      doc.text(`Reporting Period: All Time`, 14, 36);
    }

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Blood Requests', data.totalRequests],
        ['Fulfillment Rate', `${data.fulfillmentRate}%`],
        ['Blood Groups in Deficit', data.supplyDemand.filter(s => s.status === 'Deficit').length],
        ['Blood Groups in Surplus', data.supplyDemand.filter(s => s.status === 'Surplus').length]
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] }
    });

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Supply vs Demand by Blood Group", 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Blood Group', 'Available Supply', 'Total Demand', 'Gap', 'Status']],
      body: data.supplyDemand.map(s => [s.bloodGroup, s.supply, s.demand, s.gap, s.status]),
      theme: 'striped',
      headStyles: { fillColor: [185, 28, 28] }
    });

    doc.text("Top Requesting Hospitals", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Hospital', 'Requests', 'Units Requested']],
      body: data.topHospitals.map(h => [h.hospitalName, h.requestCount, h.totalUnits]),
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] }
    });

    // ── PDF Footer ──────────────────────────────────────────────────────
    addPdfFooter(doc, 'Supply & Demand Dynamics');

    doc.save(`LifeLink_SupplyDemand_${dateStr.replace(/\//g, '-')}.pdf`);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Supply & Demand Dynamics</h1>
            <p className="text-gray-500 mt-1">Analyze blood supply gaps, fulfillment rates, and hospital demand patterns.</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={loading || error}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            <span>📄</span> Export Report
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">Filter</button>
            <button onClick={handleClear} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition">Reset</button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Supply & Demand Data...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-800">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Requests</p>
                <p className="text-4xl font-black text-gray-800 mt-2">{data.totalRequests}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Fulfillment Rate</p>
                <p className={`text-4xl font-black mt-2 ${data.fulfillmentRate >= 70 ? 'text-green-600' : data.fulfillmentRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.fulfillmentRate}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Groups in Deficit</p>
                <p className="text-4xl font-black text-red-600 mt-2">{data.supplyDemand.filter(s => s.status === 'Deficit').length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Groups in Surplus</p>
                <p className="text-4xl font-black text-blue-600 mt-2">{data.supplyDemand.filter(s => s.status === 'Surplus').length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Supply vs Demand by Blood Group</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Blood Group</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Supply</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Demand</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Gap</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.supplyDemand.map((s, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
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
                      {data.supplyDemand.length === 0 && (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">No data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Request Status Breakdown</h3>
                </div>
                <div className="p-6 space-y-3">
                  {data.requestStatuses.map((s, idx) => {
                    const pct = data.totalRequests > 0 ? Math.round((s.count / data.totalRequests) * 100) : 0;
                    const barColor =
                      s.status === 'Fulfilled' || s.status === 'Awaiting Payment' ? 'bg-green-500' :
                        s.status === 'Pending' ? 'bg-yellow-500' :
                          s.status === 'Approved' ? 'bg-blue-500' :
                            s.status === 'Rejected' ? 'bg-red-500' : 'bg-gray-400';
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{s.status}</span>
                          <span className="font-bold text-gray-900">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {data.requestStatuses.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No request data found.</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Top Requesting Hospitals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Requests</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Units Requested</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topHospitals.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{h.hospitalName}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">{h.requestCount}</td>
                          <td className="px-6 py-4 text-sm font-bold text-orange-600 text-right">{h.totalUnits}</td>
                        </tr>
                      ))}
                      {data.topHospitals.length === 0 && (
                        <tr><td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">No hospital data found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Monthly Trends (6 Months)</h3>
                </div>
                <div className="p-6 space-y-3">
                  {data.monthlyTrend.map((m, idx) => {
                    const donationEntry = data.donationTrend.find(d => d.month === m.month);
                    const donations = donationEntry ? donationEntry.donations : 0;
                    return (
                      <div key={idx} className="border-b border-dashed border-gray-100 pb-3 last:border-0 last:pb-0">
                        <p className="text-xs font-bold text-gray-400 uppercase">{m.month}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-sm text-orange-600 font-bold">📥 {m.requests} Requests ({m.units} units)</span>
                          <span className="text-sm text-green-600 font-bold">📤 {donations} Donations</span>
                        </div>
                      </div>
                    );
                  })}
                  {data.monthlyTrend.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No trend data available.</p>
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