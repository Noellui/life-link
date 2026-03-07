import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = 'http://127.0.0.1:8000';

const getHospitalEmail = () => {
  const stored =
    JSON.parse(localStorage.getItem('user_data') || 'null') ||
    JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
  return stored?.email || '';
};

const BloodTransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    const email = getHospitalEmail();
    if (!email) {
      setError('Please log in to view stock history.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/hospital/stock-log/?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch stock log:', err);
      setError('Could not load stock log. Is the Django server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredData = transactions.filter(item => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg animate-pulse">Loading stock log…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Audit Log 📉</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time ledger of all blood units entering and leaving inventory.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/manage-stock" className="text-blue-600 font-bold text-sm hover:underline">
              Manage Stock
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/dashboard/hospital" className="text-gray-600 hover:text-gray-900 font-medium ml-4">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-4 flex gap-2">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>All Transactions</button>
          <button onClick={() => setFilter('IN')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === 'IN' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}>⬇ Stock In</button>
          <button onClick={() => setFilter('OUT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === 'OUT' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>⬆ Stock Out</button>
        </div>

        {/* Transaction Table */}
        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Date / Time</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Entity (Donor/Patient)</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4 text-center">Qty (Units)</th>
                  <th className="px-6 py-4">Source / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.date}</div>
                      <div className="text-xs text-gray-500">{item.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.type === 'IN' ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold border border-green-200">⬇ IN</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold border border-red-200">⬆ OUT</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.entity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${item.type === 'IN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {item.bloodGroup}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`text-lg font-bold ${item.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-400 border-t border-gray-100">
                <p className="text-lg">No records found.</p>
                <p className="text-sm">Start by recording donations in Events or processing Patient Requests.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BloodTransactionHistory;