import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('Donor'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initial State matches all potential fields in database
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', 
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    fullName: '',      // For Donors
    hospitalName: '',  // For Hospitals (mapped to fullName on submit)
    
    // Donor Specific
    dob: '',           // CRITICAL: Matches backend data.get('dob')
    gender: 'Male',
    bloodGroup: 'O+',
    weight: '',

    // Hospital Specific
    licenseNumber: '',
    hospitalType: 'Private',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validation
    if (formData.password !== formData.confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Prepare Data for Backend
      // We determine the "Name" based on the Role
      const finalName = role === 'Hospital' ? formData.hospitalName : formData.fullName;

      // We send the ENTIRE formData object, plus the corrected fullName and role.
      // The Backend will pick the fields it needs based on the Role.
      const payload = {
        ...formData,      // Spreads: dob, weight, address, city, etc.
        fullName: finalName,
        role: role
      };

      console.log("Sending Payload:", payload); // Debugging line to check data

      // 3. Send to Django API
      const response = await fetch('http://127.0.0.1:8000/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Registration Successful for ${role}! 🎉\nPlease log in to continue.`);
        navigate('/login');
      } else {
        // Show error from Backend
        setError(data.error || "Registration failed. Try again.");
        window.scrollTo(0, 0); 
      }

    } catch (err) {
      console.error("Registration Error:", err);
      setError("Cannot connect to server. Is Django running?");
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRoleSpecificFields = () => {
    switch (role) {
      case 'Donor':
        return (
          <>
            <div className="md:col-span-2 border-b pb-2 mb-4 mt-2">
              <h3 className="text-gray-800 font-bold">Donor Health Details 🩸</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                required 
                type="text" 
                name="fullName" 
                value={formData.fullName}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input 
                required 
                type="date" 
                name="dob" // MATCHES BACKEND
                value={formData.dob}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select 
                  name="bloodGroup" 
                  value={formData.bloodGroup}
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md border-gray-300 bg-white"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender}
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md border-gray-300 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input 
                required 
                type="number" 
                min="45" 
                name="weight" 
                value={formData.weight}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300" 
                placeholder="e.g. 65" 
              />
            </div>
          </>
        );

      case 'Hospital':
        return (
          <>
            <div className="md:col-span-2 border-b pb-2 mb-4 mt-2">
              <h3 className="text-gray-800 font-bold">Hospital Official Details 🏥</h3>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
              <input 
                required 
                type="text" 
                name="hospitalName" 
                value={formData.hospitalName}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300" 
                placeholder="e.g. City General Hospital" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input 
                required 
                type="text" 
                name="licenseNumber" 
                value={formData.licenseNumber}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300" 
                placeholder="Govt. Reg ID" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                name="hospitalType" 
                value={formData.hospitalType}
                onChange={handleChange} 
                className="w-full border p-2 rounded-md border-gray-300 bg-white"
              >
                <option value="Private">Private</option>
                <option value="Government">Government / Civil</option>
              </select>
            </div>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-4xl">🩸</span>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Create your account</h2>
        <p className="mt-2 text-sm text-gray-600">Join the LifeLink network today.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center mb-8 border-b border-gray-200">
            {['Donor', 'Hospital'].map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex-1 ${role === r ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {r}
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {renderRoleSpecificFields()}

              <div className="md:col-span-2 border-b pb-2 mb-2 mt-4"><h3 className="text-gray-800 font-bold">Contact & Location 📍</h3></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>

              <div className="md:col-span-2 border-b pb-2 mb-2 mt-4"><h3 className="text-gray-800 font-bold">Security 🔒</h3></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${isSubmitting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
              {isSubmitting ? 'Creating Account...' : `Register as ${role}`}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">Already have an account? <Link to="/login" className="font-medium text-red-600 hover:text-red-500">Log in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;