import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REVENUE_TYPES = ['All', 'Subscription', 'Patient Platform Fees', 'Sponsorship', 'Other'];
const SUB_STATUSES = ['All', 'Active', 'Expired'];

const Pill = ({ label, active, onClick, color = 'gray' }) => {
    const colors = {
        gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
        red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
        yellow: active ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
        blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    };
    return (
        <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${colors[color]}`}>
            {label}
        </button>
    );
};

const FinanceReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hospitalSearch, setHospitalSearch] = useState('');
    const [subStatusFilter, setSubStatusFilter] = useState('All');

    const [financeData, setFinanceData] = useState({
        totalRevenue: 0,
        revenueByCategory: [],
        hospitalSubscriptions: [],
    });

    const fetchFinanceData = async (start = '', end = '') => {
        setLoading(true);
        setError(null);
        try {
            let url = 'http://127.0.0.1:8000/api/admin/finance/';
            if (start && end) url += `?start_date=${start}&end_date=${end}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch financial data');
            const data = await response.json();
            setFinanceData({
                totalRevenue: data.totalRevenue || 0,
                revenueByCategory: data.revenueByCategory || [],
                hospitalSubscriptions: data.hospitalSubscriptions || [],
            });
        } catch (err) {
            setError('Unable to load financial reports. Please check your backend connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFinanceData(); }, []);

    const handleFilter = () => {
        if ((startDate && !endDate) || (!startDate && endDate)) {
            alert('Please provide both a Start Date and an End Date.');
            return;
        }
        fetchFinanceData(startDate, endDate);
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
        setHospitalSearch('');
        setSubStatusFilter('All');
        fetchFinanceData();
    };

    // ── Derived filtered data ──────────────────────────────────────────────────
    const filteredSubs = financeData.hospitalSubscriptions.filter(sub => {
        const matchesSearch = !hospitalSearch || sub.hospitalName.toLowerCase().includes(hospitalSearch.toLowerCase());
        const matchesStatus = subStatusFilter === 'All' || sub.status === subStatusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString();

        doc.setFontSize(22);
        doc.setTextColor(220, 38, 38);
        doc.text('LifeLink Financial & Revenue Report', 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${dateStr}`, 14, 30);
        doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Period: All Time', 14, 36);

        // Active filter summary line
        const filterParts = [];
        if (subStatusFilter !== 'All') filterParts.push(`Subscription Status: ${subStatusFilter}`);
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
            head: [['Metric', 'Amount (INR)']],
            body: [['Total Platform Revenue', `Rs. ${financeData.totalRevenue.toLocaleString()}`]],
            theme: 'striped',
            headStyles: { fillColor: [31, 41, 55] },
        });

        doc.setFontSize(14); doc.setTextColor(31, 41, 55);
        doc.text('Revenue Breakdown', 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Revenue Source', 'Amount (INR)']],
            body: financeData.revenueByCategory.map(i => [i.type, `Rs. ${i.amount.toLocaleString()}`]),
            theme: 'striped',
            headStyles: { fillColor: [55, 65, 81] },
        });

        const subsCountNote = filteredSubs.length !== financeData.hospitalSubscriptions.length
            ? ` (${filteredSubs.length} of ${financeData.hospitalSubscriptions.length} shown)`
            : ` (${filteredSubs.length} total)`;
        doc.text(`Hospital Subscriptions${subsCountNote}`, 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Hospital', 'Plan', 'Status', 'Expiry', 'Amount Paid']],
            body: filteredSubs.map(s => [
                s.hospitalName,
                s.planName || 'Standard',
                s.status,
                s.endDate,
                `Rs. ${(s.amountPaid || 0).toLocaleString()}`,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [75, 85, 99] },
        });

        doc.save(`LifeLink_Finance_${dateStr.replace(/\//g, '-')}.pdf`);
    };

    const statusColor = (status) => {
        if (status === 'Active') return 'bg-green-100 text-green-700';
        if (status === 'Expired') return 'bg-red-100 text-red-700';
        return 'bg-yellow-100 text-yellow-700';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Financial & Revenue Reports</h1>
                        <p className="text-gray-500 mt-1">Subscription and revenue analytics with advanced filtering.</p>
                    </div>
                    <button onClick={handleDownloadPDF} disabled={loading || !!error}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md">
                        <span>📄</span> Download PDF
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
                            <button onClick={handleFilter} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-700">Apply Date</button>
                            <button onClick={handleClear} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Reset All</button>
                        </div>
                    </div>

                    {/* Subscription Status filter */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subscription Status</label>
                        <div className="flex flex-wrap gap-2">
                            {SUB_STATUSES.map(s => (
                                <Pill key={s} label={s}
                                    active={subStatusFilter === s}
                                    onClick={() => setSubStatusFilter(s)}
                                    color={s === 'Active' ? 'green' : s === 'Expired' ? 'red' : s === 'Pending' ? 'yellow' : 'gray'} />
                            ))}
                        </div>
                    </div>

                    {/* Hospital search */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hospital Name Search</label>
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
                    {(subStatusFilter !== 'All' || hospitalSearch || startDate) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-400 font-bold self-center">Active:</span>
                            {startDate && endDate && (
                                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                                    📅 {startDate} → {endDate}
                                </span>
                            )}
                            {subStatusFilter !== 'All' && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    Status: {subStatusFilter}
                                    <button onClick={() => setSubStatusFilter('All')} className="hover:text-green-900 ml-1">✕</button>
                                </span>
                            )}
                            {hospitalSearch && (
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    Hospital: "{hospitalSearch}"
                                    <button onClick={() => setHospitalSearch('')} className="hover:text-purple-900 ml-1">✕</button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-20 text-center text-gray-500 font-bold animate-pulse">Fetching Financial Data...</div>
                ) : error ? (
                    <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl border border-red-100 font-bold">{error}</div>
                ) : (
                    <>
                        {/* Total Revenue */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-xl shadow-lg text-white flex flex-col items-center">
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Total Platform Revenue</h3>
                            <p className="text-6xl font-black text-green-400">₹{financeData.totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-gray-400 mt-3 font-medium">
                                {startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Period: All Time'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue By Category */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Revenue by Category</h3>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Source</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {financeData.revenueByCategory.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{item.type}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">₹{item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {financeData.revenueByCategory.length === 0 && (
                                            <tr><td colSpan="2" className="px-6 py-8 text-center text-sm text-gray-400">No category data found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Hospital Subscriptions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Hospital Subscriptions</h3>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                        {filteredSubs.length} shown
                                    </span>
                                </div>
                                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-white sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredSubs.map((sub, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{sub.hospitalName}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(sub.status)}`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{sub.endDate}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                                                        ₹{(sub.amountPaid || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredSubs.length === 0 && (
                                                <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-400">No subscriptions match the current filters.</td></tr>
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

export default FinanceReport;