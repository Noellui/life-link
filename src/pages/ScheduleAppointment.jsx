import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ScheduleAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- STATE RETRIEVAL ---
  // 1. Check if we are editing an existing appointment (Reschedule)
  const existingAppointment = location.state?.appointment;
  const isEditMode = !!existingAppointment;

  // 2. Check if we are coming from the "Register" button on Donation Camps page
  const preSelectedCampId = location.state?.preSelectedCampId;

  // Mock Data: Available Centers
  const centers = [
    { id: 1, name: "Mega City Blood Drive", location: "Vinraj Plaza, Anandpura" },
    { id: 2, name: "Red Cross Weekend Camp", location: "Siddhivinayak Complex, Alkapuri" },
    { id: 3, name: "Emergency Plasma Drive", location: "City Center, Sayajiganj" },
    { id: 4, name: "Community Health Camp", location: "Vinayak Complex, Manjalpur" },
    { id: 101, name: "City Civil Hospital", location: "Ahmedabad" }, // Match Dashboard Mock
    { id: 102, name: "City General Hospital", location: "Sayajiganj, Vadodara" }
  ];

  // Initialize form
  // Priority: Existing Appt ID > Pre-selected Camp ID > Default Empty
  const [formData, setFormData] = useState({
    center: existingAppointment ? 101 : (preSelectedCampId || ''), 
    date: existingAppointment ? "2023-10-24" : '', 
    time: existingAppointment ? "10:00 AM" : '',
    donationType: 'Whole Blood',
    isEligible: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedCenterName = centers.find(c => c.id == formData.center)?.name || "Selected Center";

    setTimeout(() => {
      if (isEditMode) {
        // --- RESCHEDULE LOGIC ---
        alert(`Appointment Updated Successfully! ♻️\n\nNew Date: ${formData.date}\nNew Time: ${formData.time}\nLocation: ${selectedCenterName} (Unchanged)`);
      } else {
        // --- NEW APPOINTMENT LOGIC ---
        alert(`Appointment Confirmed! ✅\n\nLocation: ${selectedCenterName}\nDate: ${formData.date}\nTime: ${formData.time}`);
      }
      
      setIsSubmitting(false);
      navigate('/dashboard/donor'); 
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Dynamic Header */}
        <div className={`${isEditMode ? 'bg-orange-500' : 'bg-red-600'} px-8 py-6 text-white`}>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Reschedule Appointment ♻️' : 'Schedule Donation 📅'}
          </h1>
          <p className="opacity-90 mt-1 text-sm">
            {isEditMode 
              ? 'Update your preferred date and time. Location remains locked.' 
              : 'Book a slot to save a life. It only takes a minute.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* 1. Select Center */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Donation Center {isEditMode && <span className="text-orange-500 text-xs">(Cannot be changed)</span>}
            </label>
            <select 
              name="center" 
              required 
              value={formData.center} 
              onChange={handleChange}
              disabled={isEditMode} // Locked only if rescheduling
              className={`block w-full rounded-md border shadow-sm p-2.5 
                ${isEditMode 
                  ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                  : 'bg-white border-gray-300 focus:border-red-600 focus:ring-red-600'
                }`}
            >
              <option value="">-- Choose a location --</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>
                  {center.name} ({center.location})
                </option>
              ))}
            </select>
            {/* Helper text if pre-selected */}
            {!isEditMode && preSelectedCampId && formData.center == preSelectedCampId && (
              <p className="text-xs text-green-600 mt-1">✓ Pre-selected from Donation Camps list</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2. Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input 
                type="date" 
                name="date" 
                required 
                value={formData.date}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 border p-2"
              />
            </div>

            {/* 3. Time Slot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
              <select 
                name="time" 
                required 
                value={formData.time}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-600 focus:ring-red-600 border p-2.5 bg-white"
              >
                <option value="">-- Select Time --</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
          </div>

          {/* 4. Donation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Donation Type</label>
            <div className="flex gap-4">
              {['Whole Blood', 'Platelets', 'Plasma'].map((type) => (
                <label key={type} className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="donationType" 
                    value={type}
                    checked={formData.donationType === type}
                    onChange={handleChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Eligibility Check */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="eligibility"
                  name="isEligible"
                  type="checkbox"
                  required
                  checked={formData.isEligible}
                  onChange={handleChange}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="eligibility" className="font-medium text-gray-700">I confirm that I am eligible to donate.</label>
                <p className="text-gray-500 mt-1">
                  I weigh over 50kg, have not consumed alcohol in the last 24 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors 
              ${isEditMode 
                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}
              ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isSubmitting 
              ? (isEditMode ? 'Updating...' : 'Confirming...') 
              : (isEditMode ? 'Update Appointment' : 'Confirm Appointment')}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ScheduleAppointment;