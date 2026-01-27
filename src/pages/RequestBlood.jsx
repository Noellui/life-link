import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RequestBlood = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null); // 'donors' or 'banks'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: 'A+',
    city: 'Vadodara',
    hospitalName: '', // For Bank Request
    units: 1,
    contact: '',
    urgency: 'High'
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleBroadcast = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // SIMULATION: Sending Emails & Notifications
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Save request to LocalStorage so Donor Dashboard can see it
      const newRequest = {
        id: Date.now(),
        ...formData,
        type: activeTab === 'donors' ? 'Community Request' : 'Hospital Requisition',
        date: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      const existingRequests = JSON.parse(localStorage.getItem('live_blood_requests') || '[]');
      localStorage.setItem('live_blood_requests', JSON.stringify([newRequest, ...existingRequests]));

      alert(`✅ Broadcast Successful! \n\n📧 Emails sent to 15 ${activeTab === 'donors' ? 'Donors' : 'Blood Banks'} in ${formData.city}.\n🔔 Notifications pushed to mobile apps.`);
      navigate('/dashboard/recipient');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900">Request Blood</h2>
          <p className="mt-2 text-gray-600">Choose how you want to source the blood.</p>
        </div>

        {/* 1. SELECTION CARDS */}
        {!activeTab && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Option A: Request Donors */}
            <div 
              onClick={() => setActiveTab('donors')}
              className="bg-white p-8 rounded-xl shadow-sm border-2 border-transparent hover:border-red-500 cursor-pointer transition transform hover:-translate-y-1 group"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:bg-red-600 group-hover:text-white transition">📢</div>
              <h3 className="text-xl font-bold text-gray-900">Broadcast to Donors</h3>
              <p className="mt-2 text-gray-500 text-sm">
                Directly notify registered donors in your city via Email & SMS. Best for emergencies where no stock is available.
              </p>
            </div>

            {/* Option B: Request Blood Banks */}
            <div 
              onClick={() => setActiveTab('banks')}
              className="bg-white p-8 rounded-xl shadow-sm border-2 border-transparent hover:border-blue-500 cursor-pointer transition transform hover:-translate-y-1 group"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition">🏥</div>
              <h3 className="text-xl font-bold text-gray-900">Request from Blood Banks</h3>
              <p className="mt-2 text-gray-500 text-sm">
                Send an official requisition to nearby hospitals and blood banks. Best for scheduled surgeries or bulk requirements.
              </p>
            </div>
          </div>
        )}

        {/* 2. REQUEST FORMS */}
        {activeTab && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up">
            <div className={`px-6 py-4 flex justify-between items-center text-white ${activeTab === 'donors' ? 'bg-red-600' : 'bg-blue-600'}`}>
              <h3 className="text-lg font-bold">
                {activeTab === 'donors' ? '📢 Alerting Nearby Donors' : '🏥 Requisition to Blood Banks'}
              </h3>
              <button onClick={() => setActiveTab(null)} className="text-white hover:text-gray-200 text-sm font-bold">Change Option</button>
            </div>

            <form onSubmit={handleBroadcast} className="p-8 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input required name="patientName" onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Full Name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group Needed</label>
                  <select name="bloodGroup" onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select name="urgency" onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                    <option value="High">High (Need within 24hrs)</option>
                    <option value="Critical">Critical (Immediate)</option>
                    <option value="Routine">Routine (Planned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City / Location</label>
                  <input required name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Units Required</label>
                  <input required type="number" name="units" min="1" max="10" value={formData.units} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3" />
                </div>

                {activeTab === 'banks' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Hospital (Optional)</label>
                    <input name="hospitalName" onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g. City General Hospital" />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 border border-gray-200">
                <strong>Note:</strong> Clicking Broadcast will send an automated email and push notification to all {activeTab === 'donors' ? 'registered donors' : 'partner blood banks'} matching the <strong>{formData.bloodGroup}</strong> group in <strong>{formData.city}</strong>.
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg transition shadow-md flex justify-center items-center gap-2 ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : activeTab === 'donors' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Broadcasting...' : '🚀 Broadcast Request'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default RequestBlood;