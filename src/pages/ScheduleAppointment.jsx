import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QUESTIONS = [
  { id: 'q_feeling_well',     label: 'Are you feeling well today?',                                             yesIsGood: true  },
  { id: 'q_recent_illness',   label: 'Have you had any illness, cold, or flu in the last 2 weeks?',            yesIsGood: false },
  { id: 'q_medications',      label: 'Are you currently taking any prescription medications?',                  yesIsGood: false },
  { id: 'q_antibiotics',      label: 'Have you taken antibiotics in the last 2 weeks?',                        yesIsGood: false },
  { id: 'q_recent_travel',    label: 'Have you travelled outside India in the last 6 months?',                 yesIsGood: false },
  { id: 'q_tattoo',           label: 'Have you had a tattoo, piercing, or acupuncture in the last 12 months?', yesIsGood: false },
  { id: 'q_alcohol',          label: 'Have you consumed alcohol in the last 24 hours?',                        yesIsGood: false },
  { id: 'q_donated_before',   label: 'Have you donated blood before?',                                         yesIsGood: null  },
  { id: 'q_eligibility_wait', label: 'Have you donated blood in the last 56 days (8 weeks)?',                  yesIsGood: false },
];

const BASE_URL = 'http://127.0.0.1:8000';

const ScheduleAppointment = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [centers, setCenters] = useState([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState('');

  const [formData, setFormData] = useState({
    center: '',
    date: '',
    time: '',
    donationType: 'Whole Blood',
  });

  const [answers, setAnswers] = useState(() =>
    QUESTIONS.reduce((acc, q) => ({ ...acc, [q.id]: null }), {})
  );

  const [vitals, setVitals] = useState({
    weight: '',
    hemoglobin: '',
    bp_systolic: '',
    bp_diastolic: '',
  });

  // ── Fetch hospitals in donor's city from DB ─────────────────────────────────
  useEffect(() => {
    const fetchCenters = async () => {
      setCentersLoading(true);
      try {
        // Get donor's city from localStorage (single key)
        const stored = JSON.parse(localStorage.getItem('lifeLinkUser') || 'null');
        const city = stored?.city || '';

        if (city) {
          const res = await fetch(`${BASE_URL}/api/hospitals/by-city/?city=${encodeURIComponent(city)}`);
          if (res.ok) {
            const hospitals = await res.json();
            const hospitalOptions = hospitals.map(h => ({
              id: h.id,
              name: h.name,
              location: h.city,
            }));

            // Also append any local hospital events
            const storedEvents = JSON.parse(localStorage.getItem('hospital_events') || '[]');
            const eventOptions = storedEvents.map(evt => ({
              id: evt.id,
              name: `Event: ${evt.title}`,
              location: evt.location,
            }));

            setCenters([...hospitalOptions, ...eventOptions]);
          } else {
            console.error('Failed to fetch hospitals');
            setCenters([]);
          }
        } else {
          // No city found — can't filter
          setCenters([]);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
        setCenters([]);
      } finally {
        setCentersLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // --- Handlers ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitals(prev => ({ ...prev, [name]: value }));
  };

  const goToQuestionnaire = (e) => {
    e.preventDefault();
    setStep(2);
    window.scrollTo(0, 0);
  };

  const validateQuestionnaire = () => {
    for (const q of QUESTIONS) {
      if (answers[q.id] === null) {
        alert('Please answer all questions before continuing.');
        return false;
      }
    }
    const disqualifiers = [
      { id: 'q_feeling_well',     bad: false, reason: 'You must be feeling well to donate.' },
      { id: 'q_recent_illness',   bad: true,  reason: 'You should wait 2 weeks after illness.' },
      { id: 'q_antibiotics',      bad: true,  reason: 'Please wait 2 weeks after completing antibiotics.' },
      { id: 'q_alcohol',          bad: true,  reason: 'Please wait 24 hours after alcohol consumption.' },
      { id: 'q_eligibility_wait', bad: true,  reason: 'You must wait 56 days between whole blood donations.' },
    ];
    for (const rule of disqualifiers) {
      if (answers[rule.id] === rule.bad) {
        setDisqualified(true);
        setDisqualifyReason(rule.reason);
        return false;
      }
    }
    return true;
  };

  const goToConfirm = () => {
    if (validateQuestionnaire()) {
      setStep(3);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Single localStorage key
    const currentUser = JSON.parse(localStorage.getItem('lifeLinkUser') || '{}');
    const questionnaire = { answers, vitals, submittedAt: new Date().toISOString() };
    const selectedCenter = centers.find(c => c.id == formData.center);

    try {
      const response = await fetch(`${BASE_URL}/api/donor/register-event/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          eventId: formData.center,
          appointmentDate: `${formData.date}T${formData.time || '10:00'}:00`,
          healthData: JSON.stringify(questionnaire),
        }),
      });
      if (!response.ok) throw new Error('Backend unavailable');
    } catch {
      // LocalStorage fallback
      const newAppointment = {
        id: Date.now(),
        donorName: currentUser.name || 'Donor',
        donorEmail: currentUser.email || '',
        centerName: selectedCenter?.name || 'Selected Center',
        date: formData.date,
        time: formData.time,
        type: formData.donationType,
        status: 'Pending',
        requestDate: new Date().toLocaleDateString(),
        healthQuestionnaire: questionnaire,
      };
      const existing = JSON.parse(localStorage.getItem('donor_appointments') || '[]');
      localStorage.setItem('donor_appointments', JSON.stringify([newAppointment, ...existing]));
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setStep(4);
    }, 800);
  };

  // ── Progress Bar ────────────────────────────────────────────────────────────
  const progressBar = (
    <div className="flex items-center justify-center gap-0 mb-8">
      {['Location', 'Health Check', 'Confirm'].map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-red-600 text-white ring-4 ring-red-100' :
                         'bg-gray-200 text-gray-500'
              }`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-red-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < 2 && (
              <div className={`h-0.5 w-16 mx-1 mb-4 transition-all duration-500 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── STEP 1: Location & Time ─────────────────────────────────────────────────
  if (step === 1) {
    const storedUser = JSON.parse(localStorage.getItem('lifeLinkUser') || '{}');
    const donorCity = storedUser?.city || '';

    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-red-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">Schedule Donation 📅</h1>
            <p className="opacity-90 mt-1 text-sm">Step 1 of 3 — Choose your location and time slot.</p>
          </div>

          <div className="p-8">
            {progressBar}
            <form onSubmit={goToQuestionnaire} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Donation Center
                  {donorCity && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (showing hospitals in {donorCity})
                    </span>
                  )}
                </label>

                {centersLoading ? (
                  <div className="block w-full rounded-lg border border-gray-300 p-3 text-gray-400 text-sm">
                    Loading hospitals in your city…
                  </div>
                ) : centers.length === 0 ? (
                  <div className="block w-full rounded-lg border border-orange-300 bg-orange-50 p-3 text-orange-700 text-sm">
                    ⚠️ No registered hospitals found in {donorCity || 'your city'}. Please contact support.
                  </div>
                ) : (
                  <select
                    name="center"
                    required
                    value={formData.center}
                    onChange={handleFormChange}
                    className="block w-full rounded-lg border border-gray-300 p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">-- Choose a location --</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={handleFormChange}
                    className="block w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preferred Time</label>
                  <select
                    name="time"
                    required
                    value={formData.time}
                    onChange={handleFormChange}
                    className="block w-full rounded-lg border border-gray-300 p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">-- Select slot --</option>
                    {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'].map(t => (
                      <option key={t} value={t}>
                        {parseInt(t) >= 12
                          ? `${parseInt(t) === 12 ? 12 : parseInt(t) - 12}:00 PM`
                          : `${t} AM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Donation Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Whole Blood', 'Platelets', 'Plasma'].map(type => (
                    <label
                      key={type}
                      className={`cursor-pointer rounded-lg border-2 p-3 text-center text-sm font-medium transition ${
                        formData.donationType === type
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="donationType"
                        value={type}
                        checked={formData.donationType === type}
                        onChange={handleFormChange}
                        className="sr-only"
                      />
                      {type === 'Whole Blood' ? '🩸' : type === 'Platelets' ? '🧫' : '🧪'} {type}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={centersLoading || centers.length === 0}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next: Health Screening →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: Health Questionnaire ────────────────────────────────────────────
  if (step === 2) {
    const allAnswered = QUESTIONS.every(q => answers[q.id] !== null);

    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-red-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">Health Screening 🏥</h1>
            <p className="opacity-90 mt-1 text-sm">Step 2 of 3 — Answer honestly. This keeps donors and recipients safe.</p>
          </div>

          <div className="p-8">
            {progressBar}

            {disqualified ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="text-xl font-bold text-red-800 mb-2">Unable to Proceed Today</h3>
                <p className="text-red-700 mb-4">{disqualifyReason}</p>
                <p className="text-sm text-gray-600 mb-6">
                  Thank you for your honesty. Please check back once you're eligible — your willingness to donate saves lives!
                </p>
                <button
                  onClick={() => {
                    setDisqualified(false);
                    setStep(1);
                    setAnswers(QUESTIONS.reduce((a, q) => ({ ...a, [q.id]: null }), {}));
                  }}
                  className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-900"
                >
                  Start Over
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {QUESTIONS.map((q, i) => (
                    <div
                      key={q.id}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        answers[q.id] !== null ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800 mb-3">
                        <span className="text-gray-400 mr-2">{i + 1}.</span>{q.label}
                      </p>
                      <div className="flex gap-3">
                        {['Yes', 'No'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswer(q.id, opt === 'Yes')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition border-2 ${
                              answers[q.id] === (opt === 'Yes')
                                ? opt === 'Yes' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">Pre-Screening Vitals (Optional)</h3>
                  <p className="text-xs text-gray-500 mb-4">If known, fill these in — they help the nurse at the center.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Weight (kg)</label>
                      <input type="number" name="weight" min="45" value={vitals.weight} onChange={handleVitalsChange}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="e.g. 65" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Hemoglobin (g/dL)</label>
                      <input type="number" step="0.1" name="hemoglobin" value={vitals.hemoglobin} onChange={handleVitalsChange}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="e.g. 13.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">BP Systolic (mmHg)</label>
                      <input type="number" name="bp_systolic" value={vitals.bp_systolic} onChange={handleVitalsChange}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="e.g. 120" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">BP Diastolic (mmHg)</label>
                      <input type="number" name="bp_diastolic" value={vitals.bp_diastolic} onChange={handleVitalsChange}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="e.g. 80" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="button" onClick={goToConfirm} disabled={!allAnswered}
                    className={`flex-1 font-bold py-3 rounded-lg transition shadow-md ${
                      allAnswered ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}>
                    Next: Confirm →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: Review & Confirm ────────────────────────────────────────────────
  if (step === 3) {
    const selectedCenter = centers.find(c => c.id == formData.center);
    const passedCount = QUESTIONS.filter(q => {
      if (q.yesIsGood === null) return true;
      return answers[q.id] === q.yesIsGood;
    }).length;

    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-green-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">You're Cleared to Donate! ✅</h1>
            <p className="opacity-90 mt-1 text-sm">Step 3 of 3 — Review and confirm your appointment.</p>
          </div>

          <div className="p-8">
            {progressBar}

            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 mb-6">
              <div className="flex justify-between p-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Center</span>
                <span className="font-bold text-gray-900">{selectedCenter?.name}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Date</span>
                <span className="font-bold text-gray-900">{formData.date}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Time</span>
                <span className="font-bold text-gray-900">
                  {parseInt(formData.time) >= 12
                    ? `${parseInt(formData.time) === 12 ? 12 : parseInt(formData.time) - 12}:00 PM`
                    : `${formData.time} AM`}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Type</span>
                <span className="font-bold text-gray-900">{formData.donationType}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="text-2xl">🩺</div>
              <div>
                <p className="font-bold text-green-800 text-sm">Health Screening Passed</p>
                <p className="text-xs text-green-600">{passedCount}/{QUESTIONS.length} screening criteria met. Questionnaire saved.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                <input type="checkbox" required id="confirm" className="mt-1 h-4 w-4 text-red-600" />
                <label htmlFor="confirm" className="text-sm text-gray-700 font-medium cursor-pointer">
                  I confirm all my answers are truthful and I am voluntarily donating blood.
                </label>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50">
                  ← Back
                </button>
                <button type="submit" disabled={isSubmitting}
                  className={`flex-1 font-bold py-3 rounded-lg transition shadow-md ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}>
                  {isSubmitting ? 'Submitting...' : '🩸 Submit Appointment Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 4: Success ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          🎉
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Requested!</h2>
        <p className="text-gray-500 mb-2">Your health questionnaire has been saved.</p>
        <p className="text-sm text-orange-600 font-medium bg-orange-50 rounded-lg px-4 py-2 mb-8">
          ⏳ Waiting for hospital approval. You'll be notified once confirmed.
        </p>
        <button
          onClick={() => navigate('/dashboard/donor')}
          className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition shadow-md"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ScheduleAppointment;