import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfFooter } from '../utils/pdfFooter';

const InventoryReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [inventoryData, setInventoryData] = useState({
    totalUnits: 0,
    stockByGroup: [],
    expiringSoon: [],
    hospitalStock: [],
    inflow: 0,
    outflow: 0
  });

  const fetchInventoryData = async (start = '', end = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://127.0.0.1:8000/api/admin/inventory-report/';
      if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch inventory data");

      const data = await response.json();
      setInventoryData({
        totalUnits: data.totalUnits || 0,
        stockByGroup: data.stockByGroup || [],
        expiringSoon: data.expiringSoon || [],
        hospitalStock: data.hospitalStock || [],
        inflow: data.inflow || 0,
        outflow: data.outflow || 0
      });
    } catch (err) {
      console.error(err);
      setError("Unable to load inventory reports. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleFilter = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert("Please provide both a Start Date and an End Date.");
      return;
    }
    fetchInventoryData(startDate, endDate);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    fetchInventoryData();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text("LifeLink Global Blood Inventory Report", 14, 22);

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
        ['Total Available Units (City-Wide)', `${inventoryData.totalUnits} Units`],
        ['Units Collected (Inflow)', `${inventoryData.inflow} Units`],
        ['Units Dispensed (Outflow)', `${inventoryData.outflow} Units`],
        ['Critical Expiry Alerts (< 7 Days)', `${inventoryData.expiringSoon.length} Units At Risk`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] }
    });

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Current Stock by Blood Group", 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Blood Group', 'Available Units']],
      body: inventoryData.stockByGroup.map(item => [item.bloodGroup, `${item.units} Units`]),
      theme: 'striped',
      headStyles: { fillColor: [185, 28, 28] }
    });

    doc.text("Stock Distribution by Hospital", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Hospital Name', 'Stored Units']],
      body: inventoryData.hospitalStock.map(h => [h.hospitalName, `${h.units} Units`]),
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] }
    });

    if (inventoryData.expiringSoon.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text("⚠️ Critical Expiry Alerts (Action Required)", 14, 20);

      autoTable(doc, {
        startY: 30,
        head: [['Unit ID', 'Blood Group', 'Location', 'Expiry Date']],
        body: inventoryData.expiringSoon.map(alert => [
          `#${alert.unitId}`,
          alert.bloodGroup,
          alert.hospital,
          alert.expiryDate
        ]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }
      });
    }

    // ── PDF Footer ──────────────────────────────────────────────────────
    addPdfFooter(doc, 'Global Blood Inventory Report');

    doc.save(`LifeLink_Inventory_Report_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Global Inventory & Logistics</h1>
            <p className="text-gray-500 mt-1">Monitor city-wide blood stock, track distribution, and prevent wastage.</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={loading || error}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            <span>📄</span> Download Inventory PDF
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date (For Logistics)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date (For Logistics)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">Filter Logistics</button>
            <button onClick={handleClear} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition">Reset</button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Loading Global Inventory...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl font-bold">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total System Stock</p>
                <p className="text-4xl font-black text-gray-800 mt-2">{inventoryData.totalUnits} <span className="text-lg text-gray-400 font-medium">Units</span></p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Units Collected (Inflow)</p>
                <p className="text-4xl font-black text-green-600 mt-2">+{inventoryData.inflow}</p>
                {startDate && <p className="text-xs text-gray-400 mt-1">Filtered Period</p>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Units Dispensed (Outflow)</p>
                <p className="text-4xl font-black text-orange-600 mt-2">-{inventoryData.outflow}</p>
                {startDate && <p className="text-xs text-gray-400 mt-1">Filtered Period</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              <div className="lg:col-span-2 space-y-8">

                <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                  <div className="p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">⚠️ Expiry Alerts (Next 7 Days)</h3>
                    <span className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full">
                      {inventoryData.expiringSoon.length} At Risk
                    </span>
                  </div>
                  {inventoryData.expiringSoon.length > 0 ? (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-red-100">
                        <thead className="bg-white sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit ID / Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hospital Location</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Expiring On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {inventoryData.expiringSoon.map((alert, idx) => (
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
                    <div className="p-8 text-center text-sm text-gray-500 font-medium">No units are expiring in the next 7 days. Excellent inventory management!</div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Stock By Blood Group</h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {inventoryData.stockByGroup.map((bg, idx) => (
                      <div key={idx} className="p-4 border border-gray-100 rounded-lg text-center hover:border-red-200 hover:shadow-md transition">
                        <div className="text-sm font-bold text-gray-500 mb-1">{bg.bloodGroup}</div>
                        <div className={`text-2xl font-black ${bg.units === 0 ? 'text-red-500' : 'text-gray-900'}`}>{bg.units}</div>
                        <div className="text-xs text-gray-400 mt-1">Units</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Stock Distribution</h3>
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
                      {inventoryData.hospitalStock.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-5 py-4 text-sm font-medium text-gray-800">{h.hospitalName}</td>
                          <td className="px-5 py-4 text-sm font-bold text-blue-600 text-right">{h.units}</td>
                        </tr>
                      ))}
                      {inventoryData.hospitalStock.length === 0 && (
                        <tr>
                          <td colSpan="2" className="px-5 py-8 text-center text-sm text-gray-500">No active hospital inventory found.</td>
                        </tr>
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