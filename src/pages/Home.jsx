import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Give the Gift of Life. <br/>
              <span className="text-brand-red">Donate Blood.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-lg">
              Our centralized platform connects donors, recipients, and hospitals seamlessly. Join our community today and make a difference.
            </p>
            <div className="flex space-x-4 pt-4">
              <Link to="/register" className="bg-brand-red px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-700 transition">
                Register as Donor
              </Link>
              <Link to="/search" className="border border-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white hover:text-gray-900 transition">
                Find Blood
              </Link>
            </div>
          </div>
          {/* Simple Placeholder for Image */}
          <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-sm border border-white/20">
               <div className="text-center">
                 <h3 className="text-5xl font-bold mb-2">10,000+</h3>
                 <p className="text-gray-300">Donors Registered</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features / Roles Section */}
      <div className="max-w-7xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Who We Serve</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition">
            <div className="text-4xl mb-4">🏥</div>
            <h3 className="text-xl font-bold mb-2">Hospitals</h3>
            <p className="text-gray-600">Manage inventory and request blood units efficiently.</p>
          </div>
          {/* Card 2 */}
          <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition">
            <div className="text-4xl mb-4">❤️</div>
            <h3 className="text-xl font-bold mb-2">Donors</h3>
            <p className="text-gray-600">Track your donation history and schedule appointments.</p>
          </div>
          {/* Card 3 */}
          <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">Recipients</h3>
            <p className="text-gray-600">Search for blood availability and connect with donors.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;