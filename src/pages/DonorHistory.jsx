import React, { useState, useEffect } from 'react';

// ============================================================
// HTML/CSS Print Certificate Function
// ============================================================
const printCertificate = (record, userName) => {
  if (!record || !record.id) {
    alert('Invalid donation record');
    return;
  }

  const donorName = userName || 'Valued Donor';
  const donationDate = record.date || 'N/A';
  const hospital = record.location || 'LifeLink Center';
  const certId = `LL-${String(record.id).padStart(5, '0')}`;
  const issueDate = new Date().toLocaleDateString('en-GB');

  const printWindow = window.open('', '_blank');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>LifeLink Certificate - ${donorName}</title>
        <style>
            @page { size: A4 landscape; margin: 0; }
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: 'Helvetica', Arial, sans-serif;
                background-color: #fff;
            }
            :root {
                --brand-red: #8c0000;
                --text-dark: #282828;
                --text-gray: #646464;
                --border-light: #969696;
            }
            .certificate { width: 297mm; height: 210mm; background: white; position: relative; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; }
            /* The header-bar class has been removed */
            
            .frame { margin: 5mm; flex-grow: 1; border: 2mm solid var(--brand-red); position: relative; display: flex; flex-direction: column; align-items: center; padding: 10mm; box-sizing: border-box; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: 900; color: rgba(0,0,0,0.03); z-index: 0; white-space: nowrap; pointer-events: none; }
            
            /* Added margin-top to content to balance the vertical spacing */
            .content { z-index: 1; text-align: center; width: 100%; margin-top: 15mm; }
            
            h1 { font-family: 'Times New Roman', serif; font-size: 36pt; margin: 10mm 0 5mm 0; color: var(--text-dark); }
            .subtitle { font-size: 16pt; color: var(--text-gray); margin-bottom: 8mm; }
            .donor-name { font-family: 'Times New Roman', serif; font-style: italic; font-size: 52pt; color: var(--brand-red); margin-bottom: 8mm; border-bottom: 1px solid var(--brand-red); display: inline-block; padding: 0 20mm; }
            .details { font-size: 14pt; line-height: 1.6; color: var(--text-gray); }
            .bottom-row { margin-top: auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; padding-bottom: 10mm; }
            .meta-data { text-align: left; font-size: 10pt; color: var(--text-gray); }
            
            /* New class for discreet lifelink branding */
            .discreet-branding { font-size: 9pt; font-style: italic; color: var(--border-light); margin-top: 4mm; }
            
            .seal { display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .seal-circle { width: 30mm; height: 30mm; border: 0.5mm solid var(--brand-red); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: var(--brand-red); }
            .signature { text-align: center; }
            .sig-line { border-top: 0.5mm solid var(--border-light); margin-bottom: 2mm; width: 60mm; margin-left: auto; margin-right: auto; }
            .sig-text { font-size: 10pt; font-weight: bold; }
            .sig-subtext { font-size: 9pt; font-style: italic; color: var(--text-gray); }
            .footer-note { font-size: 8pt; color: var(--border-light); position: absolute; bottom: 2mm; width: 100%; text-align: center; }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="frame">
                <div class="watermark">LIFELINK</div>
                <div class="content">
                    <h1>CERTIFICATE OF APPRECIATION</h1>
                    <p class="subtitle">This record of honor is proudly presented to</p>
                    <div class="donor-name">${donorName}</div>
                    <div class="details">For the heroic act of donating — Blood on ${donationDate}.<br>Recorded at ${hospital}.</div>
                </div>
                <div class="bottom-row">
                    <div class="meta-data">
                        Issued: ${issueDate}<br>
                        Cert ID: ${certId}
                        <div class="discreet-branding">Issued by LifeLink</div>
                    </div>
                    <div class="seal"><div class="seal-circle"><span>OFFICIAL</span><span>VERIFIED</span></div></div>
                    <div class="signature">
                        <div class="sig-line"></div>
                        <div class="sig-text">Director of Operations</div>
                        <div class="sig-subtext">LifeLink Authority</div>
                    </div>
                </div>
            </div>
            <div class="footer-note">This is a computer-generated document. No physical signature is required for validity.</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// ============================================================
// Main Component
// ============================================================
const DonorHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalDonations: 0, lastDonation: 'N/A', livesSaved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
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

  const getStatusColor = (status) => {
    const s = status?.toLowerCase().trim();
    if (s === 'fulfilled')        return 'bg-green-100 text-green-800';
    if (s === 'pending')          return 'bg-yellow-100 text-yellow-800';
    if (s === 'confirmed')        return 'bg-blue-100 text-blue-800';
    if (s === 'canceled')         return 'bg-gray-100 text-gray-800';
    if (s === 'screening failed') return 'bg-orange-100 text-orange-800';
    if (s === 'screening passed') return 'bg-teal-100 text-teal-800';
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
              Certificates are available for <strong>Fulfilled</strong> donations only. Click "Print Certificate" to generate a personalized certificate using your verified donation data.
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
                  <React.Fragment key={record.id}>
                    <tr className="hover:bg-gray-50">
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
                            onClick={() => {
                              const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
                              printCertificate(record, storedUser.name);
                            }}
                            className="flex items-center gap-1 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-800 transition px-3 py-1 rounded-lg"
                          >
                            🖨️ Print
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Not Available</span>
                        )}
                      </td>
                    </tr>
                    {record.status?.toLowerCase().trim() === 'screening failed' && (
                      <tr>
                        <td colSpan="5" className="px-6 pb-4 pt-0">
                          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                            <span className="text-orange-500 mt-0.5">⏳</span>
                            <div>
                              <p className="text-sm font-bold text-orange-800">Donation Deferred — 14 Day Wait</p>
                              <p className="text-xs text-orange-700 mt-0.5">
                                You did not meet the screening criteria at this visit. Please wait 14 days before attempting to donate again. Thank you for your willingness to help — your effort matters!
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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