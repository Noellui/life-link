import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Home = () => {
  const location = useLocation();

  // --- 1. DYNAMIC STATS STATE ---
  const [stats, setStats] = useState({
    donors: 2500, // Base number
    livesSaved: 800, // Base number
    activeCamps: 15 // Base number
  });

  // --- 2. CALCULATE REAL-TIME STATS ---
  useEffect(() => {
    // A. Calculate Lives Saved from Stock Logs
    const stockLogs = JSON.parse(localStorage.getItem('stock_logs') || '[]');
    const incomingDonations = stockLogs.filter(log => log.type === 'Incoming').length;
    // Rule: 1 Donation saves ~3 lives
    const additionalLives = incomingDonations * 3;

    // B. Calculate Active Camps from Hospital Events
    const events = JSON.parse(localStorage.getItem('hospital_events') || '[]');
    const liveEventsCount = events.length;

    // C. Update State (Base + Real Activity)
    setStats({
      donors: 2500 + incomingDonations, // Increment as people donate
      livesSaved: 800 + additionalLives,
      activeCamps: 12 + liveEventsCount 
    });

  }, []);

  // --- 3. SCROLL LOGIC ---
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-red-600 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-red-600 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Every Drop Counts</span>{' '}
                  <span className="block text-red-200">Save a Life Today</span>
                </h1>
                <p className="mt-3 text-base text-red-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  LifeLink connects hospitals, blood banks, and donors in real-time. 
                  Whether you need blood urgently or want to be a hero by donating, we bridge the gap efficiently and securely.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link to="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg">
                      Donate Blood
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link to="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-800 hover:bg-red-900 md:py-4 md:text-lg">
                      Request Blood
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-red-700 flex items-center justify-center">
          <div className="text-red-800 opacity-20 text-9xl font-black select-none">🩸</div>
        </div>
      </div>

      {/* --- STATISTICS SECTION (DYNAMIC) --- */}
      <div className="bg-gray-50 pt-12 sm:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Trusted by the Community</h2>
            <p className="mt-3 text-xl text-gray-500 sm:mt-4">
              Our real-time network ensures blood reaches those in need faster than ever before.
            </p>
          </div>
        </div>
        <div className="mt-10 pb-12 bg-white sm:pb-16">
          <div className="relative">
            <div className="absolute inset-0 h-1/2 bg-gray-50"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <dl className="rounded-lg bg-white shadow-lg sm:grid sm:grid-cols-3">
                  <div className="flex flex-col border-b border-gray-100 p-6 text-center sm:border-0 sm:border-r">
                    <dt className="order-2 mt-2 text-lg leading-6 font-medium text-gray-500">Registered Donors</dt>
                    <dd className="order-1 text-5xl font-extrabold text-red-600">
                      {stats.donors.toLocaleString()}+
                    </dd>
                  </div>
                  <div className="flex flex-col border-t border-b border-gray-100 p-6 text-center sm:border-0 sm:border-l sm:border-r">
                    <dt className="order-2 mt-2 text-lg leading-6 font-medium text-gray-500">Lives Saved</dt>
                    <dd className="order-1 text-5xl font-extrabold text-red-600">
                      {stats.livesSaved.toLocaleString()}+
                    </dd>
                  </div>
                  <div className="flex flex-col border-t border-gray-100 p-6 text-center sm:border-0 sm:border-l">
                    <dt className="order-2 mt-2 text-lg leading-6 font-medium text-gray-500">Active Camps & Partners</dt>
                    <dd className="order-1 text-5xl font-extrabold text-red-600">
                      {stats.activeCamps}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DETAILED SERVICES SECTION --- */}
      <div className="bg-white py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base text-red-600 font-semibold tracking-wide uppercase">Our Services</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Comprehensive Solutions for Everyone
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              We provide dedicated, feature-rich platforms for every role in the blood donation ecosystem.
            </p>
          </div>

          <div className="space-y-24">
            
            {/* 1. DONOR SERVICE */}
            <div id="service-donor" className="scroll-mt-24 lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div className="flex items-center justify-center mb-8 lg:mb-0">
                <div className="w-full max-w-md bg-red-50 rounded-2xl p-8 border border-red-100 shadow-sm flex items-center justify-center aspect-square">
                  <span className="text-9xl">❤️</span>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">For Donors</h3>
                <p className="mt-4 text-lg text-gray-500">
                  Join a community of lifesavers. Our donor platform is designed to make donating blood simple, rewarding, and impactful.
                </p>
                <dl className="mt-8 space-y-6">
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-red-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Smart Notifications</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Stop checking for camps. We send you instant alerts via SMS and Email the moment a hospital near you needs your specific blood type.
                    </dd>
                  </div>
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-red-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Health & History Tracking</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Keep a digital log of all your past donations, track your hemoglobin levels over time, and know exactly when you are eligible to donate again.
                    </dd>
                  </div>
                </dl>
                <div className="mt-8">
                  <Link to="/register" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                    Register as Donor
                  </Link>
                </div>
              </div>
            </div>

            {/* 2. RECIPIENT SERVICE */}
            <div id="service-recipient" className="scroll-mt-24 lg:grid lg:grid-cols-2 lg:gap-16 items-center">
               <div className="order-2 lg:order-1">
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">For Recipients</h3>
                <p className="mt-4 text-lg text-gray-500">
                  In an emergency, every second counts. Our system cuts through the red tape to find you blood donors fast.
                </p>
                <dl className="mt-8 space-y-6">
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Instant Broadcasting</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Create a blood request and we instantly notify all registered donors and nearby hospitals with matching blood types in your city.
                    </dd>
                  </div>
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Live Status Tracking</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Watch your request progress in real-time. See when a donor has been found, when the blood is dispatched, and when it arrives.
                    </dd>
                  </div>
                </dl>
                <div className="mt-8">
                  <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Login to Request
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center mb-8 lg:mb-0 order-1 lg:order-2">
                <div className="w-full max-w-md bg-blue-50 rounded-2xl p-8 border border-blue-100 shadow-sm flex items-center justify-center aspect-square">
                  <span className="text-9xl">📢</span>
                </div>
              </div>
            </div>

            {/* 3. HOSPITAL SERVICE */}
            <div id="service-hospital" className="scroll-mt-24 lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div className="flex items-center justify-center mb-8 lg:mb-0">
                <div className="w-full max-w-md bg-green-50 rounded-2xl p-8 border border-green-100 shadow-sm flex items-center justify-center aspect-square">
                  <span className="text-9xl">🏥</span>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">For Hospitals</h3>
                <p className="mt-4 text-lg text-gray-500">
                  Modernize your blood bank operations. Move away from paper records to a secure, cloud-based inventory system.
                </p>
                <dl className="mt-8 space-y-6">
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-green-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Digital Inventory Management</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Track every unit of blood from donation to transfusion. Get alerts when specific blood types are running low or near expiration.
                    </dd>
                  </div>
                  <div className="relative">
                    <dt className="flex items-center">
                      <div className="absolute flex items-center justify-center h-8 w-8 rounded-md bg-green-500 text-white">✓</div>
                      <p className="ml-12 text-lg leading-6 font-medium text-gray-900">Inter-Hospital Exchange</p>
                    </dt>
                    <dd className="mt-2 ml-12 text-base text-gray-500">
                      Easily request stock from other partner hospitals or organize blood donation camps with integrated registration tools.
                    </dd>
                  </div>
                </dl>
                <div className="mt-8">
                  <Link to="/register" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                    Register as Partner
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer id="about-us" className="scroll-mt-24 bg-gray-800 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-700 pb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wider">About LifeLink</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                LifeLink is a dedicated platform designed to bridge the gap between blood donors and those in critical need. 
                Our mission is to ensure no life is lost due to a lack of available blood by providing real-time 
                connectivity between hospitals and donors.
              </p>
            </div>
            <div>
              <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wider">Contact Details</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="mr-3 text-red-500">📍</span>
                  <span>123 Health Avenue, Medical District,<br />Vadodara, Gujarat 390001</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-3 text-red-500">📞</span>
                  <span>+91 94844 68668</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-3 text-red-500">✉️</span>
                  <span>support@lifelink-project.org</span>
                </li>
              </ul>
            </div>
            <div>
               <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wider">Quick Links</h3>
               <ul className="space-y-2 text-sm text-gray-400">
                 <li><Link to="/login" className="hover:text-white hover:underline transition">Hospital Login</Link></li>
                 <li><Link to="/register" className="hover:text-white hover:underline transition">Register as Donor</Link></li>
                 <li><span className="cursor-pointer hover:text-white hover:underline transition">Privacy Policy</span></li>
                 <li><span className="cursor-pointer hover:text-white hover:underline transition">Terms of Service</span></li>
               </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-sm text-gray-500">
            &copy; 2026 LifeLink Project. Developed by BCA Students. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;