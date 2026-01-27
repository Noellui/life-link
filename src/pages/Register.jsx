import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('Donor'); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', 
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    fullName: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'O+',
    weight: '',
    hospitalName: '',
    licenseNumber: '',
    hospitalType: 'Private',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }

    setIsSubmitting(true);

    // --- 1. PREPARE USER OBJECT ---
    const newUser = {
      id: Date.now(), // Unique ID
      role: role,
      email: formData.email,
      password: formData.password,
      city: formData.city, // Important for matching requests
      phone: formData.phone,
      address: formData.address,
      
      // Role Specifics
      name: role === 'Hospital' ? formData.hospitalName : formData.fullName,
      bloodGroup: role === 'Donor' ? formData.bloodGroup : null,
      license: role === 'Hospital' ? formData.licenseNumber : null,
      
      // Default Stats
      totalDonations: 0,
      livesSaved: 0
    };

    // --- 2. SAVE TO LOCAL STORAGE ---
    // Get existing users or empty array
    const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
    
    // Check duplicates
    if (existingUsers.some(u => u.email === newUser.email)) {
      alert("User with this email already exists!");
      setIsSubmitting(false);
      return;
    }

    // Save
    localStorage.setItem('registered_users', JSON.stringify([...existingUsers, newUser]));

    setTimeout(() => {
      alert(`Registration Successful for ${role}! 🎉\nPlease log in to continue.`);
      setIsSubmitting(false);
      navigate('/login');
    }, 1000);
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
              <input required type="text" name="fullName" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input required type="date" name="dob" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select name="bloodGroup" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300 bg-white">
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select name="gender" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300 bg-white">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input required type="number" min="45" name="weight" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" placeholder="e.g. 65" />
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
              <input required type="text" name="hospitalName" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" placeholder="e.g. City General Hospital" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input required type="text" name="licenseNumber" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" placeholder="Govt. Reg ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="hospitalType" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300 bg-white">
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
                <input required type="email" name="email" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input required type="tel" name="phone" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input required type="text" name="city" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <input required type="text" name="address" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>

              <div className="md:col-span-2 border-b pb-2 mb-2 mt-4"><h3 className="text-gray-800 font-bold">Security 🔒</h3></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" name="password" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input required type="password" name="confirmPassword" onChange={handleChange} className="w-full border p-2 rounded-md border-gray-300" />
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