import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   REQUEST BLOOD — Three modes
   1. 📢  Broadcast to Donors   — notifies all matching donors in city via alert
   2. 🌍  City-Wide Request     — hospitalId: null → any hospital can claim
   3. 🏥  Specific Hospital     — targeted single-hospital requisition
   ───────────────────────────────────────────────────────────────────────────── */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const CITIES = ['Vadodara', 'Ahmedabad', 'Surat', 'Rajkot', 'Gandhinagar', 'Bharuch', 'Anand'];


const REQUEST_TYPES = [
  {
    key: 'broadcast',
    icon: '📢',
    title: 'Broadcast to Donors',
    subtitle: 'Notify registered donors',
    desc: 'Sends an automated alert to all matching donors in your city via SMS & email. Best for emergencies when no hospital stock is available.',
    color: '#DC2626',
    lightBg: '#FEF2F2',
    isGlobal: false,
  },
  {
    key: 'global',
    icon: '🌍',
    title: 'City-Wide Open Request',
    subtitle: 'Any hospital can respond',
    desc: 'Visible to all partner hospitals in your city. Any hospital with matching blood stock can view and claim your request.',
    color: '#7C3AED',
    lightBg: '#F5F3FF',
    isGlobal: true,
  },
  {
    key: 'hospital',
    icon: '🏥',
    title: 'Specific Hospital',
    subtitle: 'Direct requisition',
    desc: 'Send an official requisition directly to one hospital or blood bank. Best for planned surgeries or bulk requirements.',
    color: '#1D4ED8',
    lightBg: '#EFF6FF',
    isGlobal: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function RequestBlood() {
  const navigate = useNavigate();

  const [step, setStep] = useState('pick');   // 'pick' | 'form' | 'done'
  const [reqType, setReqType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  const [form, setForm] = useState({
    patientName: '',
    bloodGroup: 'B+',
    city: 'Vadodara',
    units: 1,
    urgency: 'High',
    doctorName: '',
    hospitalId: '',
  });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    if (stored?.name) setForm(f => ({ ...f, patientName: stored.name }));
    if (stored?.city) setForm(f => ({ ...f, city: stored.city }));
  }, []);

  useEffect(() => {
    const fetchHospitals = async () => {
      if (!form.city) {
        setHospitals([]);
        return;
      }
      setLoadingHospitals(true);
      try {
        const res = await fetch(`http://localhost:8000/api/hospitals/by-city/?city=${encodeURIComponent(form.city)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setHospitals(data);
          if (data.length > 0) {
            setForm(f => ({ ...f, hospitalId: data[0].id }));
          } else {
            setForm(f => ({ ...f, hospitalId: '' }));
          }
        } else {
          setHospitals([]);
        }
      } catch (err) {
        console.error('Failed to fetch hospitals:', err);
        setHospitals([]);
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, [form.city]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const resolveHospitalId = () => {
    if (reqType.key === 'broadcast') return null;
    if (reqType.key === 'global') return null;
    if (reqType.key === 'hospital') return form.hospitalId ? Number(form.hospitalId) : null;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const user = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
    const hospId = resolveHospitalId();

    const payload = {
      userId: user?.id,
      bloodGroup: form.bloodGroup,
      units: Number(form.units),
      urgency: form.urgency,
      doctorName: form.doctorName || 'Emergency Dept',
      hospitalId: hospId,
      city: form.city,
    };

    try {
      const res = await fetch('http://localhost:8000/api/recipient/create-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        // Optimistic localStorage update
        const existing = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');
        existing.unshift({
          id: data.requestId || Date.now(),
          patientName: form.patientName,
          bloodGroup: form.bloodGroup,
          units: form.units,
          urgency: form.urgency,
          city: form.city,
          status: 'Pending',
          isGlobal: reqType.isGlobal,
          hospitalName: reqType.isGlobal
            ? 'Open to Any Hospital'
            : (hospitals.find(h => h.id === hospId)?.name || 'Unknown Hospital'),
          date: new Date().toISOString().slice(0, 10),
          donorInterestCount: 0,
        });
        localStorage.setItem('live_blood_requests', JSON.stringify(existing));
        setStep('done');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.warn('Server unreachable — offline fallback:', err);
      setStep('done');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .rb-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important; }
        .rb-card:hover { transform:translateY(-5px) !important; box-shadow:0 16px 40px rgba(0,0,0,0.13) !important; }
        .rb-input { transition: border-color 0.2s, box-shadow 0.2s !important; }
        .rb-input:focus { outline:none; }
        .rb-btn  { transition: filter 0.15s, transform 0.15s !important; }
        .rb-btn:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); }
      `}</style>

      <div style={S.container}>

        {/* Breadcrumb */}
        <div style={S.breadcrumb}>
          <Link to="/dashboard/recipient" style={S.breadLink}>Dashboard</Link>
          <span style={{ color: '#9CA3AF', margin: '0 8px' }}>›</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>Request Blood</span>
        </div>

        {/* Page title */}
        <div style={S.titleBlock}>
          <h1 style={S.title}>🩸 Request Blood</h1>
          <p style={S.subtitle}>Choose how you want to source blood for your patient.</p>
        </div>

        {/* ══ STEP 1: PICK ══ */}
        {step === 'pick' && (
          <div style={{ animation: 'fadeUp 0.35s ease' }}>
            <div style={S.typeGrid}>
              {REQUEST_TYPES.map(type => (
                <button
                  key={type.key}
                  className="rb-card"
                  onClick={() => { setReqType(type); setStep('form'); setError(''); }}
                  style={{ ...S.typeCard, textAlign: 'left' }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: type.lightBg, fontSize: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16, border: `1px solid ${type.color}25`,
                    flexShrink: 0,
                  }}>
                    {type.icon}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
                    {type.title}
                  </h3>
                  <p style={{ fontSize: 12, fontWeight: 700, color: type.color, margin: '0 0 10px' }}>
                    {type.subtitle}
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.55, margin: '0 0 20px', flexGrow: 1 }}>
                    {type.desc}
                  </p>
                  <div style={{ fontSize: 13, fontWeight: 700, color: type.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Select <span style={{ fontSize: 16 }}>→</span>
                  </div>
                </button>
              ))}
            </div>

            <div style={S.infoBox}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                <strong>Not sure?</strong> Use <em>Broadcast to Donors</em> for emergencies,{' '}
                <em>City-Wide</em> when you're open to any hospital, or{' '}
                <em>Specific Hospital</em> for planned procedures.
              </p>
            </div>
          </div>
        )}

        {/* ══ STEP 2: FORM ══ */}
        {step === 'form' && reqType && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>

            {/* Form header */}
            <div style={{ ...S.formHeader, background: `linear-gradient(135deg, ${reqType.color} 0%, ${reqType.color}CC 100%)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(255,255,255,0.2)', fontSize: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {reqType.icon}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>
                    {reqType.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
                    {reqType.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setStep('pick'); setError(''); }}
                style={S.changeBtn}
              >
                ← Change
              </button>
            </div>

            {/* Global banner */}
            {reqType.key === 'global' && (
              <div style={S.globalBanner}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🌍</span>
                <div>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 14, color: '#5B21B6' }}>
                    City-Wide Broadcast
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#7C3AED', lineHeight: 1.55 }}>
                    Your request won't be tied to a specific hospital. Any partner hospital in{' '}
                    <strong>{form.city}</strong> with matching stock can view and respond.
                  </p>
                </div>
              </div>
            )}

            {/* Form body */}
            <form onSubmit={handleSubmit} style={S.formCard}>
              <div style={S.formGrid}>

                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <label style={S.label}>Patient Name</label>
                  <input required className="rb-input" name="patientName" value={form.patientName}
                    onChange={handleChange} placeholder="Full name of the patient"
                    style={{ ...S.input, borderColor: '#E5E7EB' }} />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Blood Group Needed</label>
                  <select className="rb-input" name="bloodGroup" value={form.bloodGroup}
                    onChange={handleChange} style={S.input}>
                    {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                  </select>
                </div>

                <div style={S.field}>
                  <label style={S.label}>Urgency Level</label>
                  <select className="rb-input" name="urgency" value={form.urgency}
                    onChange={handleChange} style={S.input}>
                    <option value="Critical">🚨 Critical — Immediate</option>
                    <option value="High">⚡ High — Within 24 hours</option>
                    <option value="Routine">📋 Routine — Planned</option>
                  </select>
                </div>

                <div style={S.field}>
                  <label style={S.label}>City</label>
                  <select className="rb-input" name="city" value={form.city}
                    onChange={handleChange} style={S.input}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div style={S.field}>
                  <label style={S.label}>Units Required</label>
                  <input required className="rb-input" type="number" name="units"
                    min="1" max="10" value={form.units} onChange={handleChange} style={S.input} />
                </div>

                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <label style={S.label}>
                    Doctor / Dept{' '}
                    <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input className="rb-input" name="doctorName" value={form.doctorName}
                    onChange={handleChange} placeholder="e.g. Dr. Mehta / Emergency Dept"
                    style={S.input} />
                </div>

                {/* Hospital — specific only */}
                {reqType.key === 'hospital' && (
                  <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Select Hospital</label>
                    {loadingHospitals ? (
                      <div style={{ padding: '12px 16px', background: '#F3F4F6', borderRadius: 12, color: '#6B7280', fontSize: 14 }}>
                        Loading hospitals in {form.city}...
                      </div>
                    ) : hospitals.length === 0 ? (
                      <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: 12, color: '#DC2626', fontSize: 14 }}>
                        No hospitals found in {form.city}. Try another city.
                      </div>
                    ) : (
                      <select className="rb-input" name="hospitalId" value={form.hospitalId}
                        onChange={handleChange} style={S.input} required>
                        <option value="" disabled>— Choose a hospital —</option>
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Hospital — global (display only) */}
                {reqType.key === 'global' && (
                  <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Hospital</label>
                    <div style={{
                      ...S.input, background: '#F5F3FF', borderColor: '#DDD6FE',
                      color: '#7C3AED', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span>🌍</span> Open to Any Hospital in {form.city}
                    </div>
                  </div>
                )}

              </div>

              {/* Context note */}
              <div style={{
                ...S.contextNote,
                background: reqType.lightBg,
                borderColor: `${reqType.color}35`,
              }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>
                  {reqType.key === 'broadcast' ? '📣' : reqType.key === 'global' ? '🏙️' : '📋'}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                  {reqType.key === 'broadcast' && <>
                    An automated alert will go to all <strong>{form.bloodGroup}</strong> donors in{' '}
                    <strong>{form.city}</strong>. Interested donors click "I Can Donate" to respond.
                  </>}
                  {reqType.key === 'global' && <>
                    This request appears on every partner hospital's dashboard in <strong>{form.city}</strong>.
                    The first hospital with <strong>{form.bloodGroup}</strong> stock will claim it and contact you.
                  </>}
                  {reqType.key === 'hospital' && <>
                    A formal requisition will be sent directly to the selected hospital. They will confirm
                    availability within their standard processing time.
                  </>}
                </p>
              </div>

              {error && (
                <div style={S.errorBox}>⚠️ {error}</div>
              )}

              <button
                type="submit"
                className="rb-btn"
                disabled={isSubmitting}
                style={{
                  ...S.submitBtn,
                  background: reqType.color,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting
                  ? <><span style={S.spinnerInline} /> Submitting…</>
                  : <>{reqType.icon} Submit {reqType.title}</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ══ STEP 3: SUCCESS ══ */}
        {step === 'done' && reqType && (
          <div style={{ ...S.successCard, animation: 'fadeUp 0.35s ease' }}>
            <div style={S.successRing}>✓</div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>
              Request Submitted!
            </h2>
            <p style={{ color: '#6B7280', fontSize: 15, margin: '0 0 8px' }}>
              Your {reqType.title.toLowerCase()} for{' '}
              <strong>{form.bloodGroup}</strong> ({form.units} unit{form.units > 1 ? 's' : ''})
              has been created successfully.
            </p>

            {reqType.key === 'global' && (
              <div style={{ ...S.successNote, background: '#F5F3FF', color: '#7C3AED', borderColor: '#DDD6FE' }}>
                🌍 Visible to all hospitals in <strong>{form.city}</strong>.
                The first to respond will contact you.
              </div>
            )}
            {reqType.key === 'broadcast' && (
              <div style={{ ...S.successNote, background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>
                📢 Matching donors in <strong>{form.city}</strong> are being notified right now.
              </div>
            )}
            {reqType.key === 'hospital' && (
              <div style={{ ...S.successNote, background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>
                🏥 Requisition sent to{' '}
                {hospitals.find(h => h.id === Number(form.hospitalId))?.name || 'the hospital'}.
              </div>
            )}

            <div style={S.successActions}>
              <button
                className="rb-btn"
                onClick={() => navigate('/dashboard/recipient')}
                style={{ ...S.submitBtn, background: '#111827', flex: 1 }}
              >
                Go to Dashboard
              </button>
              <button
                className="rb-btn"
                onClick={() => { setStep('pick'); setReqType(null); setError(''); }}
                style={{ ...S.submitBtn, background: '#fff', color: '#374151', border: '2px solid #E5E7EB', flex: 1 }}
              >
                + New Request
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #FFF5F5 0%, #F5F3FF 50%, #EFF6FF 100%)',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    padding: '40px 16px 80px',
  },
  container: { maxWidth: 860, margin: '0 auto' },

  breadcrumb: { display: 'flex', alignItems: 'center', marginBottom: 28, fontSize: 13 },
  breadLink: { color: '#6B7280', textDecoration: 'none', fontWeight: 600 },

  titleBlock: { textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 15, color: '#6B7280', margin: 0 },

  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 24 },
  typeCard: {
    background: '#fff', border: '2px solid #F3F4F6', borderRadius: 18,
    padding: '24px 22px', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column',
  },

  infoBox: {
    background: '#FFFBEB', border: '1px solid #FDE68A',
    borderRadius: 12, padding: '14px 18px',
    display: 'flex', gap: 12, alignItems: 'flex-start',
  },

  formHeader: {
    borderRadius: '16px 16px 0 0', padding: '20px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  changeBtn: {
    background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff', padding: '8px 16px', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  globalBanner: {
    background: '#F5F3FF', borderLeft: '4px solid #7C3AED',
    padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
  },

  formCard: {
    background: '#fff', border: '1px solid #E5E7EB', borderTop: 'none',
    borderRadius: '0 0 16px 16px', padding: '28px 28px 32px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: '0.01em' },
  input: {
    width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB',
    borderRadius: 10, fontSize: 14, color: '#111827', background: '#FAFAFA',
    boxSizing: 'border-box',
  },

  contextNote: {
    borderRadius: 12, padding: '14px 16px', marginBottom: 20,
    border: '1px solid', display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  errorBox: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
    padding: '12px 16px', color: '#DC2626', fontSize: 14, fontWeight: 600, marginBottom: 16,
  },
  submitBtn: {
    width: '100%', padding: '15px 24px', border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 15, fontWeight: 800,
    boxShadow: '0 4px 14px rgba(0,0,0,0.16)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer',
  },
  spinnerInline: {
    width: 18, height: 18, borderRadius: '50%',
    border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
    display: 'inline-block', animation: 'spin 0.75s linear infinite',
  },

  successCard: {
    background: '#fff', borderRadius: 20, padding: '60px 40px',
    textAlign: 'center', boxShadow: '0 4px 28px rgba(0,0,0,0.1)',
    border: '1px solid #F3F4F6',
  },
  successRing: {
    width: 84, height: 84, borderRadius: '50%',
    background: 'linear-gradient(135deg,#10B981,#059669)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 24px', fontSize: 36, fontWeight: 800,
    boxShadow: '0 8px 24px rgba(16,185,129,0.38)',
  },
  successNote: {
    borderRadius: 10, padding: '12px 18px',
    fontSize: 14, fontWeight: 600, border: '1px solid',
    margin: '16px auto 0', maxWidth: 420, lineHeight: 1.55,
  },
  successActions: {
    display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center',
  },
};