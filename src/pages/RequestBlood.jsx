import React, { useState } from 'react';

const RequestBlood = () => {
  const [formData, setFormData] = useState({
    bloodGroup: '',
    units: 1,
    urgency: 'Routine',
    hospitalId: 9001,
    doctorName: ''
  });

  const user = JSON.parse(localStorage.getItem('lifeLinkUser')) || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/requests/create-raw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id }),
      });
      if (response.ok) alert('Request Submitted via Raw SQL!');
      else {
        const err = await response.json();
        alert('Error: ' + (err.error || response.statusText));
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Network error');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-red-600 mb-6">Request Urgent Blood</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select 
          className="w-full border p-3 rounded"
          onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
          required
        >
          <option value="">Select Blood Group</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
        <input 
          type="number" placeholder="Units Required" 
          className="w-full border p-3 rounded"
          onChange={(e) => setFormData({...formData, units: e.target.value})}
          value={formData.units}
        />
        <select 
          className="w-full border p-3 rounded"
          onChange={(e) => setFormData({...formData, urgency: e.target.value})}
          value={formData.urgency}
        >
          <option value="Routine">Routine</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <input 
          type="text" placeholder="Doctor's Name" 
          className="w-full border p-3 rounded"
          onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
          value={formData.doctorName}
        />
        <button className="w-full bg-red-600 text-white font-bold p-3 rounded hover:bg-red-700 transition">
          Confirm Request
        </button>
      </form>
    </div>
  );
};

export default RequestBlood;