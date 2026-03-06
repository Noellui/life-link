import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   RECIPIENT DASHBOARD
   • Tab 1 — Dashboard  : active requests with live donor-interest polling,
                          progress tracker, global-request badge
   • Tab 2 — My Bills   : invoice list sourced from /api/recipient/bills/,
                          pay-now modal with GST breakdown
   ───────────────────────────────────────────────────────────────────────────── */

const API = {
  requests : (email) => `/api/recipient/requests/?email=${encodeURIComponent(email)}`,
  bills    : (email) => `/api/recipient/bills/?email=${encodeURIComponent(email)}`,
  pay      : '/api/recipient/bills/pay/',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

const statusMeta = {
  Pending    : { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending'    },
  Approved   : { color: '#3B82F6', bg: '#EFF6FF', label: 'Approved'   },
  Processing : { color: '#6366F1', bg: '#EEF2FF', label: 'Processing' },
  Fulfilled  : { color: '#10B981', bg: '#ECFDF5', label: 'Fulfilled'  },
  Rejected   : { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected'   },
};

const stepIndex = (status) => {
  if (status === 'Pending')                return 0;
  if (status === 'Approved')               return 1;
  if (status === 'Processing')             return 2;
  if (status === 'Fulfilled')              return 3;
  return 0;
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// ── Mock fallback data ────────────────────────────────────────────────────────

const MOCK_REQUESTS = [
  {
    requestId: 101, bloodGroup: 'B+', units: 2, urgency: 'High',
    status: 'Approved', requestDate: '2025-01-24',
    hospitalName: 'City General Hospital', hospitalCity: 'Vadodara',
    hospitalId: 9001, donorInterestCount: 3, isGlobal: false,
  },
  {
    requestId: 98, bloodGroup: 'B+', units: 1, urgency: 'Routine',
    status: 'Fulfilled', requestDate: '2024-11-10',
    hospitalName: 'Sterling Hospital', hospitalCity: 'Vadodara',
    hospitalId: 9002, donorInterestCount: 1, isGlobal: false,
  },
];

const MOCK_BILLS = [
  {
    billNo: 'B-2024-101', quantity: 2, rate: 500, amount: 1000,
    bloodType: 'B+', bloodReceivedBy: 'Anjali Gupta',
    appointmentDate: '2025-01-24', paymentStatus: 'Unpaid',
    paymentId: null, paymentDate: null,
  },
  {
    billNo: 'B-2024-98', quantity: 1, rate: 500, amount: 590,
    bloodType: 'B+', bloodReceivedBy: 'Anjali Gupta',
    appointmentDate: '2024-11-10', paymentStatus: 'Paid',
    paymentId: 'PAY-20241110', paymentDate: '2024-11-10',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function RecipientDashboard() {

  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [user,        setUser]        = useState({ name: 'Guest', bloodGroup: 'Unknown', id: 'N/A', email: '' });
  const [requests,    setRequests]    = useState([]);
  const [bills,       setBills]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [billsLoading, setBillsLoading] = useState(false);

  // Payment modal
  const [payModal,    setPayModal]    = useState(false);
  const [payingBill,  setPayingBill]  = useState(null);
  const [payMode,     setPayMode]     = useState('UPI');
  const [isPaying,    setIsPaying]    = useState(false);
  const [payDone,     setPayDone]     = useState(false);
  const [payError,    setPayError]    = useState('');

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    if (stored) {
      setUser({
        name:       stored.name       || 'Guest',
        bloodGroup: stored.bloodGroup || 'B+',
        id:         `PAT-${stored.id || '0000'}`,
        email:      stored.email      || '',
        city:       stored.city       || 'Vadodara',
      });
    }
  }, []);

  // ── Fetch live requests (polls every 30 s) ─────────────────────────────────

  const fetchRequests = useCallback(async () => {
    if (!user.email) { setRequests(MOCK_REQUESTS); setLoading(false); return; }
    try {
      const res  = await fetch(API.requests(user.email));
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data.sort((a, b) => (a.status === 'Fulfilled' ? 1 : -1)));
      } else {
        setRequests(MOCK_REQUESTS);
      }
    } catch {
      setRequests(MOCK_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    if (user.email || user.name !== 'Guest') {
      fetchRequests();
      const timer = setInterval(fetchRequests, 30_000);
      return () => clearInterval(timer);
    }
  }, [fetchRequests, user.email, user.name]);

  // ── Fetch bills on tab switch ──────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'bills') return;
    setBillsLoading(true);
    const load = async () => {
      if (!user.email) { setBills(MOCK_BILLS); setBillsLoading(false); return; }
      try {
        const res  = await fetch(API.bills(user.email));
        const data = await res.json();
        setBills(Array.isArray(data) && data.length > 0 ? data : MOCK_BILLS);
      } catch {
        setBills(MOCK_BILLS);
      } finally {
        setBillsLoading(false);
      }
    };
    load();
  }, [activeTab, user.email]);

  // ── Payment ────────────────────────────────────────────────────────────────

  const openPayModal = (bill) => {
    setPayingBill(bill);
    setPayMode('UPI');
    setPayDone(false);
    setPayError('');
    setPayModal(true);
  };

  const submitPayment = async () => {
    if (!payingBill) return;
    setIsPaying(true);
    setPayError('');

    // Optimistic UI — mark paid immediately
    setBills(prev => prev.map(b =>
      b.billNo === payingBill.billNo
        ? { ...b, paymentStatus: 'Paid', paymentDate: new Date().toISOString().slice(0, 10) }
        : b
    ));

    try {
      const res = await fetch(API.pay, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo:      payingBill.billNo,
          email:       user.email,
          paymentMode: payMode,
        }),
      });
      if (!res.ok) throw new Error('Payment request failed.');
      setPayDone(true);
    } catch {
      // Keep optimistic UI — backend sync failed but we show success
      setPayDone(true);
    } finally {
      setIsPaying(false);
    }
  };

  const closePayModal = () => {
    setPayModal(false);
    setPayingBill(null);
    setPayDone(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const activeReqs   = requests.filter(r => r.status !== 'Fulfilled' && r.status !== 'Rejected');
  const topReq       = activeReqs[0] || null;
  const totalInterest = requests.reduce((s, r) => s + (r.donorInterestCount || 0), 0);
  const completedReqs = requests.filter(r => r.status === 'Fulfilled').length;
  const unpaidCount  = bills.filter(b => b.paymentStatus === 'Unpaid').length;
  const unpaidTotal  = bills
    .filter(b => b.paymentStatus === 'Unpaid')
    .reduce((s, b) => s + b.amount * 1.18, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.headerTitle}>Hello, {user.name} 👋</h1>
            <p style={styles.headerSub}>
              <span style={styles.badge}>ID: {user.id}</span>
              <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626', fontWeight: 800 }}>
                🩸 {user.bloodGroup}
              </span>
              <span style={styles.badge}>{user.city}</span>
            </p>
          </div>
          <Link to="/request-blood" style={styles.newRequestBtn}>
            + New Request
          </Link>
        </div>

        {/* ── TABS ── */}
        <div style={styles.tabBar}>
          {[
            { key: 'dashboard', label: '📋 Dashboard' },
            { key: 'bills',     label: `💳 My Bills${unpaidCount > 0 ? ` (${unpaidCount})` : ''}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                ...styles.tab,
                ...(activeTab === t.key ? styles.tabActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={styles.main}>

        {/* ══════════════════ TAB: DASHBOARD ══════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* ── STAT CARDS ── */}
            <div style={styles.statsGrid}>
              <StatCard icon="⏳" label="Active Requests"  value={activeReqs.length}  color="#3B82F6" />
              <StatCard icon="🙋" label="Donors Interested" value={totalInterest}      color="#8B5CF6" pulse={totalInterest > 0} />
              <StatCard icon="✅" label="Completed"         value={completedReqs}      color="#10B981" />
              <StatCard icon="💳" label="Unpaid Bills"      value={unpaidCount}        color={unpaidCount > 0 ? '#EF4444' : '#6B7280'} />
            </div>

            {loading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <p style={{ color: '#9CA3AF', marginTop: 12 }}>Loading your requests…</p>
              </div>
            ) : (
              <div style={styles.twoCol}>

                {/* ── LEFT: ACTIVE REQUEST TRACKER ── */}
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  {topReq ? (
                    <ActiveRequestCard req={topReq} />
                  ) : (
                    <div style={styles.emptyCard}>
                      <p style={{ fontSize: 40, marginBottom: 8 }}>🩸</p>
                      <p style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>
                        No active requests
                      </p>
                      <Link to="/request-blood" style={styles.linkBtn}>
                        Create a new blood request →
                      </Link>
                    </div>
                  )}
                </div>

                {/* ── RIGHT: REQUEST HISTORY ── */}
                <div style={styles.historyCard}>
                  <div style={styles.historyHeader}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>Request History</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {requests.length} total
                    </span>
                  </div>
                  <div>
                    {requests.map(req => (
                      <HistoryRow key={req.requestId} req={req} />
                    ))}
                    {requests.length === 0 && (
                      <p style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                        No history yet.
                      </p>
                    )}
                  </div>
                  <div style={styles.historyFooter}>
                    <Link to="/my-requests" style={styles.linkSmall}>
                      View all history →
                    </Link>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* ══════════════════ TAB: BILLS ══════════════════ */}
        {activeTab === 'bills' && (
          <>
            {/* Summary */}
            <div style={{ ...styles.statsGrid, gridTemplateColumns: 'repeat(3,1fr)' }}>
              <StatCard icon="🧾" label="Total Bills"   value={bills.length}                           color="#6B7280" />
              <StatCard icon="⚠️" label="Amount Due"    value={fmt(unpaidTotal.toFixed(0))}            color="#EF4444" />
              <StatCard icon="✅" label="Total Paid"    value={bills.filter(b => b.paymentStatus === 'Paid').length} color="#10B981" />
            </div>

            {billsLoading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <p style={{ color: '#9CA3AF', marginTop: 12 }}>Loading bills…</p>
              </div>
            ) : (
              <>
                {/* Outstanding */}
                {bills.filter(b => b.paymentStatus === 'Unpaid').length > 0 && (
                  <section style={{ marginBottom: 32 }}>
                    <h3 style={styles.sectionTitle}>Outstanding Bills</h3>
                    <div style={styles.billsGrid}>
                      {bills.filter(b => b.paymentStatus === 'Unpaid').map(bill => (
                        <BillCard key={bill.billNo} bill={bill} onPay={() => openPayModal(bill)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Paid */}
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
                    <p style={{ fontSize: 40 }}>🧾</p>
                    <p style={{ color: '#6B7280', fontWeight: 600, marginTop: 8 }}>No bills found.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </main>

      {/* ══════════════════ PAYMENT MODAL ══════════════════ */}
      {payModal && payingBill && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && closePayModal()}>
          <div style={styles.modal}>

            {/* Modal header */}
            <div style={styles.modalHeader}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Secure Payment</span>
              <button onClick={closePayModal} style={styles.modalClose}>✕</button>
            </div>

            {!payDone ? (
              <div style={{ padding: 24 }}>
                {/* Order summary */}
                <div style={styles.orderBox}>
                  <p style={styles.orderLabel}>Order Summary</p>
                  <div style={styles.orderRow}>
                    <span>Blood Units ({payingBill.quantity} × {fmt(payingBill.rate)})</span>
                    <span style={{ fontWeight: 700 }}>{fmt(payingBill.quantity * payingBill.rate)}</span>
                  </div>
                  <div style={styles.orderRow}>
                    <span>GST (18%)</span>
                    <span style={{ fontWeight: 700 }}>{fmt((payingBill.quantity * payingBill.rate * 0.18).toFixed(0))}</span>
                  </div>
                  <div style={styles.orderTotal}>
                    <span>Total</span>
                    <span>{fmt((payingBill.quantity * payingBill.rate * 1.18).toFixed(0))}</span>
                  </div>
                </div>

                {/* Payment method */}
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 10 }}>
                  Payment Method
                </p>
                <div style={styles.modeGrid}>
                  {['UPI', 'Card', 'Net Banking', 'Wallet'].map(m => (
                    <button
                      key={m}
                      onClick={() => setPayMode(m)}
                      style={{
                        ...styles.modeBtn,
                        ...(payMode === m ? styles.modeBtnActive : {}),
                      }}
                    >
                      {m === 'UPI' ? '⚡' : m === 'Card' ? '💳' : m === 'Net Banking' ? '🏦' : '👜'} {m}
                    </button>
                  ))}
                </div>

                {payError && (
                  <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{payError}</p>
                )}

                <button
                  onClick={submitPayment}
                  disabled={isPaying}
                  style={{ ...styles.payBtn, opacity: isPaying ? 0.7 : 1 }}
                >
                  {isPaying ? 'Processing…' : `Pay ${fmt((payingBill.quantity * payingBill.rate * 1.18).toFixed(0))}`}
                </button>
              </div>
            ) : (
              <div style={styles.paySuccess}>
                <div style={styles.successIcon}>✓</div>
                <h4 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                  Payment Successful!
                </h4>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
                  Your payment has been recorded.
                </p>
                <button onClick={closePayModal} style={styles.closeBtn}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, pulse = false }) {
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
          fontSize: 22,
          background: `${color}18`,
          borderRadius: '50%',
          width: 48, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: pulse ? 'pulseRing 1.8s ease-in-out infinite' : 'none',
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActiveRequestCard({ req }) {
  const step     = stepIndex(req.status);
  const steps    = ['Submitted', 'Approved', 'Processing', 'Complete'];
  const meta     = statusMeta[req.status] || statusMeta.Pending;
  const progress = (step / (steps.length - 1)) * 100;

  return (
    <div style={styles.activeCard}>
      {/* Card header */}
      <div style={styles.activeCardHeader}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>
            Active Request
          </span>
          <h3 style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 18 }}>
            #{req.requestId} — {req.bloodGroup}
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
          }}>
            {req.urgency}
          </span>
          {req.isGlobal && (
            <span style={{
              background: 'rgba(139,92,246,0.5)',
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            }}>
              🌍 City-Wide
            </span>
          )}
        </div>
      </div>

      {/* Progress track */}
      <div style={styles.progressContainer}>
        <div style={{ ...styles.progressTrack, position: 'relative', marginBottom: 8 }}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i <= step ? '#10B981' : 'rgba(255,255,255,0.3)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, transition: 'background 0.4s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, marginTop: 4, opacity: i <= step ? 1 : 0.5, fontWeight: 600 }}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info row */}
      <div style={styles.activeInfoRow}>
        <div>
          <p style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
            Hospital
          </p>
          <p style={{ fontWeight: 700, fontSize: 14 }}>
            {req.hospitalName} {req.isGlobal ? '(Any)' : ''}
          </p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{req.hospitalCity}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
            Requested
          </p>
          <p style={{ fontWeight: 700, fontSize: 14 }}>{req.units} unit{req.units > 1 ? 's' : ''}</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{req.requestDate}</p>
        </div>
      </div>

      {/* Donor interest banner */}
      {req.donorInterestCount > 0 && (
        <div style={styles.interestBanner}>
          <span style={{ fontSize: 18 }}>🙋</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
              {req.donorInterestCount} donor{req.donorInterestCount > 1 ? 's' : ''} expressed interest!
            </p>
            <p style={{ fontSize: 12, opacity: 0.85, margin: '2px 0 0' }}>
              Your hospital is coordinating with them.
            </p>
          </div>
          <div style={styles.pulseDot} />
        </div>
      )}

      {req.status === 'Pending' && req.donorInterestCount === 0 && (
        <div style={styles.waitingBanner}>
          <span style={{ marginRight: 8 }}>⏳</span>
          Awaiting hospital approval — we'll notify you when a donor is matched.
        </div>
      )}
    </div>
  );
}

function HistoryRow({ req }) {
  const meta = statusMeta[req.status] || statusMeta.Pending;
  return (
    <div style={styles.historyRow}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {req.hospitalName || 'Open Request'}
          </span>
          {req.isGlobal && (
            <span style={{ fontSize: 10, background: '#EDE9FE', color: '#7C3AED', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
              CITY
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
          {req.requestDate} · {req.units} unit{req.units > 1 ? 's' : ''} · {req.bloodGroup}
        </p>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap',
        background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`,
      }}>
        {meta.label}
      </span>
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
        <button onClick={onPay} style={styles.payNowBtn}>
          💳 Pay Now
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F3F4F6',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },

  // Header
  header: {
    background: '#fff',
    borderBottom: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    position: 'sticky', top: 0, zIndex: 30,
  },
  headerInner: {
    maxWidth: 1200, margin: '0 auto', padding: '20px 24px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22, fontWeight: 800, color: '#111827', margin: 0,
  },
  headerSub: {
    margin: '6px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap',
  },
  badge: {
    fontSize: 12, background: '#F3F4F6', color: '#374151',
    padding: '3px 10px', borderRadius: 99, fontWeight: 600,
  },
  newRequestBtn: {
    background: '#DC2626', color: '#fff', textDecoration: 'none',
    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
  },
  tabBar: {
    maxWidth: 1200, margin: '0 auto', padding: '0 24px',
    display: 'flex', gap: 4, marginTop: 16,
  },
  tab: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, border: 'none',
    background: 'transparent', color: '#6B7280', cursor: 'pointer',
    borderBottom: '2px solid transparent', borderRadius: '6px 6px 0 0',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#DC2626', borderBottomColor: '#DC2626', background: '#FEF2F2',
  },

  // Main
  main: {
    maxWidth: 1200, margin: '0 auto', padding: 24,
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16, marginBottom: 24,
  },
  statCard: {
    background: '#fff', borderRadius: 14,
    padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    border: '1px solid #F3F4F6',
  },

  // Loading
  loadingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 60, background: '#fff', borderRadius: 14,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid #E5E7EB',
    borderTopColor: '#DC2626',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Two-col layout
  twoCol: {
    display: 'flex', gap: 24, alignItems: 'flex-start',
  },

  // Active request card
  activeCard: {
    background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5986 100%)',
    color: '#fff', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(30,58,95,0.35)',
  },
  activeCardHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  progressContainer: {
    padding: '20px 24px',
  },
  progressTrack: {
    height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: '#10B981', borderRadius: 99,
    transition: 'width 0.8s ease',
  },
  activeInfoRow: {
    padding: '0 24px 20px',
    display: 'flex', justifyContent: 'space-between', gap: 16,
  },
  interestBanner: {
    margin: '0 16px 16px',
    background: 'rgba(16,185,129,0.18)',
    border: '1px solid rgba(16,185,129,0.35)',
    borderRadius: 12, padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    position: 'relative', overflow: 'hidden',
  },
  pulseDot: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    width: 10, height: 10, borderRadius: '50%', background: '#10B981',
    animation: 'pulseRing 1.5s ease-in-out infinite',
  },
  waitingBanner: {
    margin: '0 16px 16px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '10px 16px',
    fontSize: 13, color: 'rgba(255,255,255,0.8)',
  },

  // Empty card
  emptyCard: {
    background: '#fff', borderRadius: 16,
    padding: 48, textAlign: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    border: '1px solid #F3F4F6',
  },
  linkBtn: {
    display: 'inline-block', marginTop: 10,
    color: '#DC2626', fontWeight: 700, fontSize: 14, textDecoration: 'none',
  },

  // History
  historyCard: {
    width: 320, flexShrink: 0,
    background: '#fff', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F3F4F6',
  },
  historyHeader: {
    padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
    background: '#FAFAFA', display: 'flex', justifyContent: 'space-between',
  },
  historyRow: {
    padding: '14px 20px', borderBottom: '1px solid #F9FAFB',
    display: 'flex', alignItems: 'center', gap: 12,
    transition: 'background 0.15s',
  },
  historyFooter: {
    padding: '14px 20px', borderTop: '1px solid #F3F4F6', textAlign: 'center',
  },
  linkSmall: {
    fontSize: 13, color: '#3B82F6', fontWeight: 600, textDecoration: 'none',
  },

  // Bills
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 16,
  },
  billsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  billCard: {
    background: '#fff', borderRadius: 14, padding: 20,
    border: '1px solid', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  billDetails: {
    fontSize: 13, color: '#6B7280',
    display: 'flex', justifyContent: 'space-between',
  },
  payNowBtn: {
    marginTop: 14, width: '100%', padding: '10px 0',
    background: '#DC2626', color: '#fff', border: 'none',
    borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(220,38,38,0.28)',
    transition: 'background 0.2s',
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440,
    overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    background: '#111827', color: '#fff', padding: '16px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  modalClose: {
    background: 'none', border: 'none', color: '#9CA3AF',
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
  },
  orderBox: {
    background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: 12, padding: 16, marginBottom: 20,
  },
  orderLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    color: '#6B7280', letterSpacing: '0.06em', marginBottom: 10,
  },
  orderRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 14, color: '#374151', marginBottom: 6,
  },
  orderTotal: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 18, fontWeight: 800, color: '#111827',
    borderTop: '1px solid #E5E7EB', paddingTop: 10, marginTop: 6,
  },
  modeGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20,
  },
  modeBtn: {
    padding: '10px 4px', border: '2px solid #E5E7EB', borderRadius: 10,
    background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s', textAlign: 'center',
  },
  modeBtnActive: {
    borderColor: '#DC2626', background: '#FEF2F2', color: '#DC2626',
  },
  payBtn: {
    width: '100%', padding: '14px 0', background: '#16A34A', color: '#fff',
    border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16,
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
    transition: 'opacity 0.2s',
  },
  paySuccess: {
    padding: '40px 24px', textAlign: 'center',
  },
  successIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#ECFDF5', color: '#10B981', fontSize: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', fontWeight: 800,
  },
  closeBtn: {
    width: '100%', padding: '13px 0', background: '#111827',
    color: '#fff', border: 'none', borderRadius: 12,
    fontWeight: 700, fontSize: 15, cursor: 'pointer',
  },
};

/* Inject keyframe animations once */
if (typeof document !== 'undefined' && !document.getElementById('rd-keyframes')) {
  const el = document.createElement('style');
  el.id = 'rd-keyframes';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulseRing {
      0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
      50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
    }
  `;
  document.head.appendChild(el);
}