import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'http://127.0.0.1:8000';

const API = {
  bills: (email) => `${BASE_URL}/api/recipient/bills/?email=${encodeURIComponent(email)}`,
  pay: `${BASE_URL}/api/recipient/bills/pay/`,  // FIXED: was /api/mark-bill-paid/
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function MyBills() {
  const navigate = useNavigate();

  // ── State ───────────────────────────────────────────────────────────────────
  const [user, setUser] = useState({ name: 'Loading...', email: '', id: '...' });
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);

  // Success modal state
  const [payModal, setPayModal] = useState(false);

  // ── Bootstrap User ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('user_data') || localStorage.getItem('lifeLinkUser') || 'null');
    if (!stored) {
      navigate('/login');
      return;
    }
    
    setUser({
      name: stored.name || 'Guest',
      email: stored.email || '',
      id: `PAT-${stored.id || 'N/A'}`,
    });
  }, [navigate]);

  // ── Fetch Bills ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user.email) return;

    const fetchBills = async () => {
      try {
        const res = await fetch(API.bills(user.email));
        const data = await res.json();
        setBills(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch bills:", error);
        setBills([]);
      } finally {
        setBillsLoading(false);
      }
    };

    fetchBills();
  }, [user.email]);

  // ── Payment Handlers ───────────────────────────────────────────────────────
  const handlePayment = async (bill) => {
    const isLoaded = await loadRazorpayScript();
    
    if (!isLoaded) {
      alert('Razorpay SDK failed to load. Please check your connection.');
      return;
    }

    // Include 18% GST in the final amount sent to Razorpay (Razorpay expects paise)
    const amountWithGST = Math.round(bill.amount * 1.18 * 100);

    const options = {
      key: 'rzp_test_SRRzMc4LMgrMEL',
      amount: amountWithGST,
      currency: 'INR',
      name: 'Life Link',
      description: `Payment for Blood Unit (Bill #${bill.billNo})`,
      handler: async function (response) {
        // Optimistic UI — mark paid immediately
        setBills(prev => prev.map(b =>
          b.billNo === bill.billNo
            ? { ...b, paymentStatus: 'Paid', paymentDate: new Date().toISOString().slice(0, 10), paymentId: response.razorpay_payment_id }
            : b
        ));

        window.dispatchEvent(new Event('storage'));
        setPayModal(true);

        try {
          const res = await fetch(API.pay, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              billNo: bill.billNo,
              email: user.email,
              paymentMode: 'Online',
              razorpayPaymentId: response.razorpay_payment_id,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            console.error('Payment backend error:', err);
          }
        } catch (err) {
          console.error('Payment confirmation error on backend:', err);
        }
      },
      prefill: {
        email: user.email,
        contact: bill.mobileNo !== 'N/A' ? bill.mobileNo : '',
      },
      theme: {
        color: '#DC2626',
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const closePayModal = () => {
    setPayModal(false);
    // Refetch bills after closing modal to sync with DB
    if (user.email) {
      setBillsLoading(true);
      fetch(API.bills(user.email))
        .then(r => r.json())
        .then(data => setBills(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setBillsLoading(false));
    }
  };

  // ── Derived Data ───────────────────────────────────────────────────────────
  const unpaidTotal = bills
    .filter(b => b.paymentStatus === 'Unpaid')
    .reduce((s, b) => s + b.amount * 1.18, 0);

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      
      {/* ── HEADER ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.headerTitle}>My Bills & Payments 🧾</h1>
            <p style={styles.headerSub}>
              <span style={styles.badge}>ID: {user.id}</span>
              <span style={styles.badge}>Manage processing fees for fulfilled transfusions</span>
            </p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* ── SUMMARY STATS ── */}
        <div style={{ ...styles.statsGrid, gridTemplateColumns: 'repeat(3,1fr)' }}>
          <StatCard icon="🧾" label="Total Bills" value={bills.length} color="#6B7280" />
          <StatCard icon="⚠️" label="Amount Due" value={fmt(unpaidTotal.toFixed(0))} color={unpaidTotal > 0 ? "#EF4444" : "#10B981"} />
          <StatCard icon="✅" label="Total Paid" value={bills.filter(b => b.paymentStatus === 'Paid').length} color="#10B981" />
        </div>

        {billsLoading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{ color: '#9CA3AF', marginTop: 12 }}>Loading bills…</p>
          </div>
        ) : (
          <>
            {/* ── OUTSTANDING BILLS ── */}
            {bills.filter(b => b.paymentStatus === 'Unpaid').length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h3 style={styles.sectionTitle}>Outstanding Bills</h3>
                <div style={styles.billsGrid}>
                  {bills.filter(b => b.paymentStatus === 'Unpaid').map(bill => (
                    <BillCard key={bill.billNo} bill={bill} onPay={() => handlePayment(bill)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── PAID BILLS ── */}
            {bills.filter(b => b.paymentStatus === 'Paid').length > 0 && (
              <section>
                <h3 style={styles.sectionTitle}>Payment History</h3>
                <div style={styles.billsGrid}>
                  {bills.filter(b => b.paymentStatus === 'Paid').map(bill => (
                    <BillCard key={bill.billNo} bill={bill} />
                  ))}
                </div>
              </section>
            )}

            {bills.length === 0 && (
              <div style={styles.emptyCard}>
                <p style={{ fontSize: 40, margin: '0 0 12px 0' }}>🧾</p>
                <p style={{ color: '#374151', fontSize: 18, fontWeight: 700, margin: 0 }}>
                  No billing records found.
                </p>
                <p style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>
                  When you have fulfilled transfusion requests, your processing bills will appear here.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ══════════════════ SUCCESS MODAL ══════════════════ */}
      {payModal && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && closePayModal()}>
          <div style={styles.modal}>
            <div style={styles.paySuccess}>
              <div style={styles.successIcon}>✓</div>
              <h4 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                Payment Successful!
              </h4>
              <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
                Your payment has been processed and recorded successfully.
              </p>
              <button onClick={closePayModal} style={styles.closeBtn}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        </div>
        <div style={{
          fontSize: 22, background: `${color}18`, borderRadius: '50%',
          width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function BillCard({ bill, onPay }) {
  const paid  = bill.paymentStatus === 'Paid';
  const total = (bill.amount * 1.18).toFixed(0);
  return (
    <div style={{ ...styles.billCard, borderColor: paid ? '#D1FAE5' : '#FEE2E2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280', margin: 0 }}>{bill.billNo}</p>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#111827', margin: '2px 0 0' }}>
            {fmt(total)}
          </p>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: paid ? '#ECFDF5' : '#FEF2F2',
          color:      paid ? '#059669' : '#DC2626',
        }}>
          {paid ? '✓ Paid' : 'Unpaid'}
        </span>
      </div>
      <div style={styles.billDetails}>
        <span>🩸 {bill.bloodType} · {bill.quantity} unit{bill.quantity > 1 ? 's' : ''}</span>
        <span>{bill.appointmentDate}</span>
      </div>
      {paid && bill.paymentDate && (
        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
          Paid on {bill.paymentDate} · Ref: {bill.paymentId || 'N/A'}
        </p>
      )}
      {!paid && onPay && (
        <button onClick={onPay} style={styles.payNowBtn}>💳 Pay Now</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  page: { minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" },
  header: { background: '#fff', borderBottom: '1px solid #E5E7EB', paddingBottom: 24 },
  headerInner: { maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 },
  headerSub: { margin: '8px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 12, background: '#F3F4F6', color: '#374151', padding: '4px 12px', borderRadius: 99, fontWeight: 600 },
  main: { maxWidth: 1200, margin: '0 auto', padding: 24 },
  statsGrid: { display: 'grid', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F3F4F6' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, background: '#fff', borderRadius: 14 },
  spinner: { width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyCard: { background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F3F4F6' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 16 },
  billsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  billCard: { background: '#fff', borderRadius: 14, padding: 20, border: '1px solid', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  billDetails: { fontSize: 13, color: '#6B7280', display: 'flex', justifyContent: 'space-between' },
  payNowBtn: { marginTop: 14, width: '100%', padding: '10px 0', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.28)', transition: 'background 0.2s' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(4px)' },
  modal: { background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  paySuccess: { padding: '40px 24px', textAlign: 'center' },
  successIcon: { width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', color: '#10B981', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 800 },
  closeBtn: { width: '100%', padding: '13px 0', background: '#111827', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};

/* Inject keyframe animations once */
if (typeof document !== 'undefined' && !document.getElementById('bills-keyframes')) {
  const el = document.createElement('style');
  el.id = 'bills-keyframes';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(el);
}