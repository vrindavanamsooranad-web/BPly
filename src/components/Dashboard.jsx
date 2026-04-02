import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { Activity, Share2, Check } from 'lucide-react';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Set default datetime to local time (YYYY-MM-DDThh:mm)
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  }, []);

  const handleLog = async (e) => {
    e.preventDefault();
    if (!systolic || !diastolic) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const logsRef = collection(db, `users/${currentUser.uid}/logs`);
      await addDoc(logsRef, {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : null,
        timestamp: new Date(dateTime).toISOString(),
        shareId: currentUser.uid
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      
      // Reset datetime to current
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDateTime(now.toISOString().slice(0, 16));
      
      setMessage('Reading logged successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to log reading. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/shared/${currentUser?.uid}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hi, {userProfile?.name}!</h2>
          <p className="text-slate-500 mt-1">Log your Blood Pressure and Pulse reading below.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm flex items-center gap-2 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <Activity className="w-4 h-4" /> {message}
          </div>
        )}

        <form onSubmit={handleLog} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Systolic (Top)</label>
              <input 
                type="number" required min="30" max="300"
                value={systolic} onChange={e => setSystolic(e.target.value)}
                className="w-full text-center text-3xl sm:text-4xl font-bold text-red-600 py-4 sm:py-6 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all placeholder:text-slate-200"
                placeholder="120"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Diastolic (Bottom)</label>
              <input 
                type="number" required min="30" max="200"
                value={diastolic} onChange={e => setDiastolic(e.target.value)}
                className="w-full text-center text-3xl sm:text-4xl font-bold text-blue-600 py-4 sm:py-6 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
                placeholder="80"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Pulse (BPM)</label>
              <input 
                type="number" min="30" max="250"
                value={pulse} onChange={e => setPulse(e.target.value)}
                className="w-full text-center text-xl font-bold text-slate-700 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300"
                placeholder="72"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Date & Time</label>
              <input 
                type="datetime-local" required
                value={dateTime} onChange={e => setDateTime(e.target.value)}
                className="w-full text-center text-sm font-medium text-slate-700 py-3 sm:py-4 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
              />
            </div>
          </div>
          

          
          <button 
            type="submit" disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md flex items-center justify-center gap-2 text-lg mt-4"
          >
            {loading ? 'Saving...' : 'Save Reading'}
          </button>
        </form>

        <div className="pt-6 mt-6 border-t border-slate-100">
          <button 
            onClick={handleShare}
            className={`w-full font-semibold flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all border-2 ${copiedLink ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-primary-600 hover:bg-primary-50 border-primary-100 hover:border-primary-200'}`}
          >
            {copiedLink ? (
               <><Check className="w-5 h-5" /> Copied Public Link!</>
            ) : (
               <><Share2 className="w-5 h-5" /> Copy Shareable Report Link</>
            )}
          </button>
          <p className="text-xs text-center text-slate-400 mt-3">Anyone with this link can view your blood pressure history.</p>
        </div>
      </div>
    </div>
  );
}
