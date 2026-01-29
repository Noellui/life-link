import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // CRITICAL: Save to localStorage so Dashboard can see the email
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        onLogin(data.user);
        
        // Dynamic Redirection
        const rolePath = data.user.role.toLowerCase(); 
        navigate(`/dashboard/${rolePath}`);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Is the Django server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-4xl">🩸</span>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">LifeLink Login</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input name="email" type="email" required onChange={handleChange} className="mt-1 block w-full border rounded-md p-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" required onChange={handleChange} className="mt-1 block w-full border rounded-md p-2 focus:ring-red-500" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition">
              {isLoading ? 'Processing...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;