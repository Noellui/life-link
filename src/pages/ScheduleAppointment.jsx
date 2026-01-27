import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ScheduleAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [centers, setCenters] = useState([]);
  const [formData, setFormData] = useState({
    center: '', date: '', time: '', donationType: 'Whole Blood', isEligible: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const staticHospitals = [
      { id: 101, name: "City Civil Hospital", location: "Ahmedabad" },
      { id: 102, name: "City General Hospital", location: "Vadodara" }
    ];
    const storedEvents = JSON.parse(localStorage.getItem('hospital_events') || '[]');
    const eventOptions = storedEvents.map(evt => ({
      id: evt.id, name: `Event: ${evt.title}`, location: evt.location
    }));
    setCenters([...staticHospitals, ...eventOptions]);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedCenterName = centers.find(c => c.id == formData.center)?.name || "Selected Center";
    
    // 1. GET CURRENT USER
    const currentUser = JSON.parse(localStorage.getItem('lifeLinkUser')) || { name: "Guest", email: "guest@test.com" };

    // 2. CREATE APPOINTMENT (NOW SAVING EMAIL)
    const newAppointment = {
      id: Date.now(),
      donorName: currentUser.name,
      donorEmail: currentUser.email, // <--- CRITICAL FOR HISTORY LINKING
      centerName: selectedCenterName,
      date: formData.date,
      time: formData.time,
      type: formData.donationType,
      status: 'Pending',
      requestDate: new Date().toLocaleDateString()
    };

    const existingApps = JSON.parse(localStorage.getItem('donor_appointments') || '[]');
    localStorage.setItem('donor_appointments', JSON.stringify([newAppointment, ...existingApps]));

    setTimeout(() => {
      alert("Appointment Request Sent! ⏳");
      setIsSubmitting(false);
      navigate('/dashboard/donor'); 
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-red-600 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">Schedule Donation 📅</h1>
          <p className="opacity-90 mt-1 text-sm">Request a slot. The hospital will confirm shortly.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Donation Center</label>
            <select name="center" required value={formData.center} onChange={handleChange} className="block w-full rounded-md border shadow-sm p-2.5 bg-white border-gray-300">
              <option value="">-- Choose a location --</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.location})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="date" required value={formData.date} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select name="time" required value={formData.time} onChange={handleChange} className="block w-full rounded-md border-gray-300 shadow-sm border p-2.5 bg-white">
                <option value="">-- Select --</option>
                {['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start">
            <input type="checkbox" required name="isEligible" checked={formData.isEligible} onChange={handleChange} className="mt-1 h-4 w-4 text-red-600"/>
            <div className="ml-3 text-sm"><label className="font-medium text-gray-700">I confirm I am eligible to donate.</label></div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition">
            {isSubmitting ? 'Sending Request...' : 'Request Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScheduleAppointment;