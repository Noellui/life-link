import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

const DonorHistory = () => {
  const [history, setHistory] = useState([]);
  const [donorName, setDonorName] = useState('');
  const [stats, setStats] = useState({ totalDonations: 0, lastDonation: "N/A", livesSaved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user_data'));
      const email = storedUser?.email;
      const name = storedUser?.name || 'Valued Donor';
      setDonorName(name);

      if (!email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/donor/history/?email=${email}`);

        if (response.ok) {
          const data = await response.json();

          const formattedHistory = data.map(record => ({
            id: record.id,
            date: record.date,
            location: record.location,
            // FIX: Use donationType from backend (which now includes blood group when available)
            // Fallback to "Whole Blood" only if backend didn't supply it
            type: record.donationType || "Whole Blood",
            units: record.units || "1",
            status: record.status,
            certificateId: `CERT-${record.id.toString().padStart(5, '0')}`
          }));

          setHistory(formattedHistory);

          const fulfilledCount = formattedHistory.filter(r =>
            r.status?.toLowerCase().trim() === 'fulfilled'
          ).length;

          setStats({
            totalDonations: fulfilledCount,
            livesSaved: fulfilledCount * 3,
            lastDonation: formattedHistory.find(r => r.status?.toLowerCase().trim() === 'fulfilled')?.date || "N/A"
          });
        }
      } catch (error) {
        console.error("Failed to fetch donation history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  /**
   * FIX: Certificate download now generates a real styled PDF using jsPDF
   * instead of just triggering a JavaScript alert().
   */
  const handleDownload = (record) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // --- Background border decoration ---
    doc.setDrawColor(185, 28, 28); // red-700
    doc.setLineWidth(4);
    doc.rect(8, 8, pageW - 16, pageH - 16);
    doc.setLineWidth(1);
    doc.setDrawColor(220, 38, 38); // red-600
    doc.rect(12, 12, pageW - 24, pageH - 24);

    // --- Header: LifeLink logo text ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28);
    doc.text('🩸 LifeLink', pageW / 2, 30, { align: 'center' });

    // --- Title ---
    doc.setFontSize(28);
    doc.setTextColor(30, 30, 30);
    doc.text('Certificate of Donation', pageW / 2, 50, { align: 'center' });

    // --- Subtitle ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('This certifies that the following individual has made a voluntary blood donation', pageW / 2, 62, { align: 'center' });

    // --- Divider ---
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(40, 68, pageW - 40, 68);

    // --- Donor name (main focus) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text(donorName, pageW / 2, 84, { align: 'center' });

    // --- Body details ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);

    const detailsY = 98;
    const col1X = pageW / 2 - 70;
    const col2X = pageW / 2 + 10;
    const lineH = 10;

    // Left column labels
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Date of Donation:', col1X, detailsY);
    doc.text('Donation Center:', col1X, detailsY + lineH);
    doc.text('Blood Type / Type:', col1X, detailsY + lineH * 2);
    doc.text('Units Donated:', col1X, detailsY + lineH * 3);
    doc.text('Certificate ID:', col1X, detailsY + lineH * 4);

    // Right column values
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(record.date, col2X, detailsY);
    doc.text(record.location, col2X, detailsY + lineH);
    doc.text(record.type, col2X, detailsY + lineH * 2);
    doc.text(`${record.units} Unit(s)`, col2X, detailsY + lineH * 3);
    doc.text(record.certificateId, col2X, detailsY + lineH * 4);

    // --- Divider ---
    doc.setDrawColor(220, 38, 38);
    doc.line(40, detailsY + lineH * 5 + 4, pageW - 40, detailsY + lineH * 5 + 4);

    // --- Footer message ---
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(
      '"Every drop counts. Thank you for saving lives."',
      pageW / 2, detailsY + lineH * 5 + 14,
      { align: 'center' }
    );

    // --- Issued by ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const issuedDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Issued by LifeLink on ${issuedDate}`, pageW / 2, pageH - 16, { align: 'center' });

    // --- Save ---
    doc.save(`${record.certificateId}_${donorName.replace(/\s+/g, '_')}.pdf`);
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase().trim();
    if (s === 'fulfilled') return 'bg-green-100 text-green-800';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (s === 'confirmed') return 'bg-blue-100 text-blue-800';
    if (s === 'canceled') return 'bg-gray-100 text-gray-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Donation History 🩸</h1>
          <p className="text-gray-600 mt-2">Your life-saving contributions record.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm">
            <p className="text-sm font-bold text-gray-500 uppercase">Successful Donations</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalDonations}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
            <p className="text-sm font-bold text-gray-500 uppercase">Lives Saved (Est.)</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.livesSaved} ❤️</p>
          </div>
          <div className="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm">
            <p className="text-sm font-bold text-gray-500 uppercase">Last Donation</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.lastDonation}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 text-lg">Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                  {/* FIX: Column header updated to match dynamic content */}
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length > 0 ? (
                  history.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.location}</td>
                      {/* FIX: Shows blood group-enriched type from backend */}
                      <td className="px-6 py-4 text-sm text-gray-600">{record.type} ({record.units} Unit)</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {record.status?.toLowerCase().trim() === 'fulfilled' ? (
                          // FIX: Now generates and downloads a real PDF certificate
                          <button
                            onClick={() => handleDownload(record)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium flex items-center gap-1 ml-auto"
                          >
                            <span>⬇</span> Download
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                      No donation records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorHistory;