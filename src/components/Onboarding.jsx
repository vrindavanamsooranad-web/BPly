import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Onboarding() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    dob: ''
  });
  const [loading, setLoading] = useState(false);

  if (!currentUser) return <Navigate to="/login" />;
  if (userProfile) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = { ...formData, age: Number(formData.age), createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'users', currentUser.uid), userData);
      setUserProfile(userData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Complete Your Profile</h2>
          <p className="text-slate-500 mt-2 text-sm">Please provide some basic details to personalize your BPly dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input 
                type="number" required min="1" max="120"
                value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select 
                value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input 
              type="date" required
              value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2.5 rounded-lg transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
