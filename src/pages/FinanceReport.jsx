import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FinanceReport = () => {
    // --- STATE ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [financeData, setFinanceData] = useState({
        totalRevenue: 0,
        revenueByCategory: [],
        hospitalSubscriptions: []
    });

    // --- API FETCH ---
    const fetchFinanceData = async (start = '', end = '') => {
        setLoading(true);
        setError(null);
        try {
            let url = 'http://127.0.0.1:8000/api/admin/finance/';
            if (start && end) {
                url += `?start_date=${start}&end_date=${end}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch financial data");

            const data = await response.json();
            setFinanceData({
                totalRevenue: data.totalRevenue || 0,
                revenueByCategory: data.revenueByCategory || [],
                hospitalSubscriptions: data.hospitalSubscriptions || []
            });
        } catch (err) {
            console.error(err);
            setError("Unable to load financial reports. Please check your backend connection.");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchFinanceData();
    }, []);

    // --- HANDLERS ---
    const handleFilter = () => {
        if ((startDate && !endDate) || (!startDate && endDate)) {
            alert("Please provide both a Start Date and an End Date.");
            return;
        }
        fetchFinanceData(startDate, endDate);
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
        fetchFinanceData();
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString();

        // Document Header
        doc.setFontSize(22);
        doc.setTextColor(220, 38, 38); // LifeLink Red
        doc.text("LifeLink Financial & Revenue Report", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${dateStr}`, 14, 30);
        if (startDate && endDate) {
            doc.text(`Reporting Period: ${startDate} to ${endDate}`, 14, 36);
        } else {
            doc.text(`Reporting Period: All Time`, 14, 36);
        }

        // 1. Total Revenue Summary
        autoTable(doc, {
            startY: 45,
            head: [['Metric', 'Amount (INR)']],
            body: [
                ['Total Platform Revenue', `Rs. ${financeData.totalRevenue.toLocaleString()}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [31, 41, 55] }
        });

        // 2. Revenue By Category
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text("Revenue Breakdown by Category", 14, doc.lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Revenue Source', 'Total Amount (INR)']],
            body: financeData.revenueByCategory.map(item => [item.type, `Rs. ${item.amount.toLocaleString()}`]),
            theme: 'striped',
            headStyles: { fillColor: [55, 65, 81] }
        });

        // 3. Hospital Subscriptions
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text("Hospital Subscription Status", 14, doc.lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Hospital Name', 'Plan', 'Status', 'Expiry Date', 'Amount Paid']],
            body: financeData.hospitalSubscriptions.map(sub => [
                sub.hospitalName,
                sub.planName,
                sub.status,
                sub.endDate,
                `Rs. ${sub.amountPaid.toLocaleString()}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [75, 85, 99] }
        });

        doc.save(`LifeLink_Finance_Report_${dateStr.replace(/\//g, '-')}.pdf`);
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Financial & Revenue Reports</h1>
                        <p className="text-gray-500 mt-1">Generate and export subscription and revenue analytics.</p>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={loading || error}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                    >
                        <span>📄</span> Download PDF Report
                    </button>
                </div>

                {/* Date Filter Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-48"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleFilter}
                            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-700 transition"
                        >
                            Generate
                        </button>
                        <button
                            onClick={handleClear}
                            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Loading / Error States */}
                {loading ? (
                    <div className="py-20 text-center text-gray-500 font-bold animate-pulse">
                        Fetching Financial Data...
                    </div>
                ) : error ? (
                    <div className="py-10 text-center text-red-600 bg-red-50 rounded-xl border border-red-100 font-bold">
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Total Revenue Overview */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-white flex flex-col items-center justify-center">
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Total Platform Revenue</h3>
                            <p className="text-6xl font-black text-green-400">
                                ₹{financeData.totalRevenue.toLocaleString()}
                            </p>
                            {startDate && endDate ? (
                                <p className="text-sm text-gray-400 mt-3 font-medium">Period: {startDate} to {endDate}</p>
                            ) : (
                                <p className="text-sm text-gray-400 mt-3 font-medium">Period: All Time</p>
                            )}
                        </div>

                        {/* Detailed Tables Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Revenue By Category */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50">
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
                                            <tr>
                                                <td colSpan="2" className="px-6 py-8 text-center text-sm text-gray-500">No category data found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Hospital Subscriptions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Hospital Subscriptions</h3>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                        {financeData.hospitalSubscriptions.length} Active
                                    </span>
                                </div>
                                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-white sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Hospital</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Plan</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Expiry Date</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Amount Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {financeData.hospitalSubscriptions.map((sub, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-gray-900">{sub.hospitalName}</div>
                                                        <div className={`text-xs font-bold mt-1 ${sub.status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>
                                                            {sub.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{sub.planName}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{sub.endDate}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                                                        ₹{(sub.amountPaid || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {financeData.hospitalSubscriptions.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">No subscription data found.</td>
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

export default FinanceReport;
