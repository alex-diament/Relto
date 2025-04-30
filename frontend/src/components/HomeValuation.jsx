// File: HomeValuation.jsx
// Frontend V1.1 - Relto AI Home Valuation App
// Tech Stack: React + Tailwind CSS + Typewriter Animation + Icon Submission

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRightCircleIcon } from '@heroicons/react/24/solid';
import { Bars3Icon } from '@heroicons/react/24/outline';

export default function HomeValuation() {
  const [address, setAddress] = useState('');
  const [animatedText, setAnimatedText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const sampleAddresses = [
    '123 Ocean Blvd',
    '457 Lincoln Ave',
    '901 Palm Drive',
    '10 SE 3rd Street'
  ];

  useEffect(() => {
    let i = 0;
    let j = 0;
    let direction = 1;
    const interval = setInterval(() => {
      setAnimatedText(sampleAddresses[i].substring(0, j));
      j += direction;
      if (j === sampleAddresses[i].length + 1 || j === 0) {
        direction *= -1;
        if (direction === 1) i = (i + 1) % sampleAddresses.length;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/predict', { address });
      navigate('/valuation');
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Top Navigation */}
      <div className="absolute top-4 left-4">
        <button onClick={() => setMenuOpen(!menuOpen)}>
          <Bars3Icon className="h-8 w-8 text-white cursor-pointer" />
        </button>
        {menuOpen && (
          <div className="absolute top-10 left-0 bg-white rounded-2xl shadow-lg px-4 py-2 transform origin-top-left animate-expand-in z-10">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white absolute -top-2 left-4"></div>
            <ul className="text-blue-600 font-semibold space-y-2">
              <li className="hover:text-blue-800 cursor-pointer">About</li>
              <li className="hover:text-blue-800 cursor-pointer">Help</li>
              <li className="hover:text-blue-800 cursor-pointer">Settings</li>
            </ul>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4">
        <button className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-full shadow hover:bg-blue-100 transition-all">
          Sign In
        </button>
      </div>

      <h1 className="text-white text-4xl font-bold mb-6 tracking-widest animate-fade-in">Relto</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md animate-fade-in bg-white p-4 rounded-3xl shadow-xl transition duration-500 ease-in-out flex items-center"
      >
        <input
          name="address"
          type="text"
          placeholder={animatedText || 'Enter property address'}
          className="flex-grow p-4 text-lg border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <button type="submit" className="ml-2 text-blue-600 hover:text-blue-800 transition">
          <ArrowRightCircleIcon className="h-10 w-10" />
        </button>
      </form>
    </div>
  );
}
