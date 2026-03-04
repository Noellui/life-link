import React, { useState, useEffect } from 'react';

// ============================================================
// FEATURE 1: Real PDF Certificate Generation
// Uses jsPDF (already a project dependency) to produce a
// properly formatted donation certificate that downloads as a file.
// The backend endpoint /api/donor/certificate/<id>/ provides
// verified data; we fall back to local data if unavailable.
// ============================================================

const DonorHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalDonations: 0, lastDonation: 'N/A', livesSaved: 0 });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user_data'));
      const email = storedUser?.email;
      if (!email) { setLoading(false); return; }

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/donor/history/?email=${email}`);
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map(record => ({
            id: record.id,
            date: record.date,
            location: record.location,
            type: 'Whole Blood',
            units: record.units || '1',
            status: record.status,
            certificateId: `LL-${record.id.toString().padStart(5, '0')}`,
          }));
          setHistory(formatted);

          const fulfilledCount = formatted.filter(r => r.status?.toLowerCase().trim() === 'fulfilled').length;
          setStats({
            totalDonations: fulfilledCount,
            livesSaved: fulfilledCount * 3,
            lastDonation: formatted[0]?.date || 'N/A',
          });
        }
      } catch (error) {
        console.error('Failed to fetch donation history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // ============================================================
  // Certificate PDF Generator
  // ============================================================
  const generateCertificate = async (record) => {
    setDownloadingId(record.id);

    // Try backend for verified data first
    let certData = null;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/donor/certificate/${record.id}/`);
      if (res.ok) certData = await res.json();
    } catch { /* fall through to local data */ }

    // Fallback: use local record data
    const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!certData) {
      certData = {
        donor_name: storedUser.name || 'Donor',
        blood_type: storedUser.bloodType || '—',
        appointment_date: record.date,
        hospital_name: record.location,
        appointment_id: record.id,
      };
    }

    // Dynamic import of jsPDF — already installed in the project
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const W = 297; // A4 landscape width mm
      const H = 210;

      // ── Background ──────────────────────────────────────
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, W, H, 'F');

      // Dark red decorative border (outer)
      doc.setDrawColor(180, 20, 20);
      doc.setLineWidth(3);
      doc.rect(8, 8, W - 16, H - 16);

      // Thin inner border
      doc.setLineWidth(0.5);
      doc.setDrawColor(220, 60, 60);
      doc.rect(12, 12, W - 24, H - 24);

      // ── Header Band ──────────────────────────────────────
      doc.setFillColor(180, 20, 20);
      doc.rect(8, 8, W - 16, 28, 'F');

      // Logo / Title in header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('🩸 LifeLink — Blood Donation Certificate', W / 2, 26, { align: 'center' });

      // ── Certificate Title ────────────────────────────────
      doc.setTextColor(180, 20, 20);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF APPRECIATION', W / 2, 60, { align: 'center' });

      doc.setFontSize(13);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('This is to certify that', W / 2, 74, { align: 'center' });

      // ── Donor Name ───────────────────────────────────────
      doc.setFontSize(30);
      doc.setFont('times', 'bolditalic');
      doc.setTextColor(20, 20, 20);
      doc.text(certData.donor_name, W / 2, 92, { align: 'center' });

      // Underline beneath name
      const nameWidth = doc.getTextWidth(certData.donor_name);
      const nameX = (W - nameWidth) / 2;
      doc.setDrawColor(180, 20, 20);
      doc.setLineWidth(0.7);
      doc.line(nameX, 95, nameX + nameWidth, 95);

      // ── Body Text ────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(
        `voluntarily donated ${certData.blood_type || '—'} blood on ${certData.appointment_date || record.date}`,
        W / 2, 107, { align: 'center' }
      );
      doc.text(`at ${certData.hospital_name || record.location}.`, W / 2, 115, { align: 'center' });
      doc.text(
        'Your selfless act of kindness has the potential to save up to 3 lives.',
        W / 2, 128, { align: 'center' }
      );

      // ── Decorative Divider ───────────────────────────────
      doc.setDrawColor(220, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(40, 135, W - 40, 135);

      // ── Signature & Stamp Area ───────────────────────────
      // Left: Issue Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Issue Date', 60, 150, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), 60, 157, { align: 'center' });

      // Center: Seal placeholder
      doc.setFillColor(180, 20, 20);
      doc.circle(W / 2, 153, 14, 'S');
      doc.setFontSize(8);
      doc.setTextColor(180, 20, 20);
      doc.text('OFFICIAL', W / 2, 150, { align: 'center' });
      doc.text('SEAL', W / 2, 156, { align: 'center' });

      // Right: Authorized by
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Authorized by', W - 60, 150, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.text('LifeLink Blood Bank Authority', W - 60, 157, { align: 'center' });

      // ── Footer ───────────────────────────────────────────
      doc.setFillColor(240, 240, 240);
      doc.rect(8, H - 22, W - 16, 14, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Certificate ID: ${record.certificateId}  |  Appointment #${certData.appointment_id || record.id}  |  lifelink-project.org`,
        W / 2, H - 13, { align: 'center' }
      );

      doc.save(`LifeLink_Certificate_${record.certificateId}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate certificate. Please ensure jsPDF is installed: npm install jspdf');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase().trim();
    if (s === 'fulfilled')  return 'bg-green-100 text-green-800';
    if (s === 'pending')    return 'bg-yellow-100 text-yellow-800';
    if (s === 'confirmed')  return 'bg-blue-100 text-blue-800';
    if (s === 'canceled')   return 'bg-gray-100 text-gray-800';
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

        {/* Stats */}
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
            <p className="text-sm font-bold text-gray-500 uppercase">Last Record</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.lastDonation}</p>
          </div>
        </div>

        {/* Certificate info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-500 text-xl mt-0.5">📄</span>
          <div>
            <p className="font-bold text-blue-900 text-sm">Download Your Certificate</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Certificates are available for <strong>Fulfilled</strong> donations only. Click "Download PDF" to generate a personalized certificate using your verified donation data.
            </p>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 text-lg">Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Location', 'Type', 'Status', 'Certificate'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length > 0 ? history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.type} ({record.units} Unit)</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.status?.toLowerCase().trim() === 'fulfilled' ? (
                        <button
                          onClick={() => generateCertificate(record)}
                          disabled={downloadingId === record.id}
                          className={`flex items-center gap-1 text-sm font-medium transition px-3 py-1 rounded-lg ${
                            downloadingId === record.id
                              ? 'text-gray-400 bg-gray-100 cursor-wait'
                              : 'text-red-600 hover:bg-red-50 hover:text-red-800'
                          }`}
                        >
                          {downloadingId === record.id ? (
                            <>
                              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                              Generating...
                            </>
                          ) : (
                            <>📄 Download PDF</>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                  </tr>
                )) : (
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