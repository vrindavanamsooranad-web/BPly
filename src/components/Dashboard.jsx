import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { Activity, Pill, Sun, Moon, ChevronRight, ChevronDown } from 'lucide-react';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Advanced Context Toggles
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [medContext, setMedContext] = useState(''); // 'PRE', 'POST', or ''

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
      const targetDate = new Date(dateTime);
      
      const hour = targetDate.getHours();
      const timeOfDay = (hour >= 6 && hour < 18) ? 'day' : 'night';
      
      await addDoc(logsRef, {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : null,
        timestamp: targetDate.toISOString(),
        timeOfDay,
        medicationContext: medContext || null
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setMedContext('');
      setShowAdvanced(false);
      
      // Reset datetime to current
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDateTime(now.toISOString().slice(0, 16));
      
      setMessage('Reading logged successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to log reading.');
    } finally {
      setLoading(false);
    }
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

          {/* Advanced Info Toggle */}
          <div className="pt-2">
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold text-sm transition-colors"
            >
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Additional Context (Optional)
            </button>
            
            {showAdvanced && (
              <div className="mt-4 p-5 bg-slate-50 border border-slate-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                   <Pill className="w-4 h-4 text-blue-500" /> Medication Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMedContext(medContext === 'PRE' ? '' : 'PRE')}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all focus:outline-none ${medContext === 'PRE' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50/50'}`}
                  >
                    PRE-Medication
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedContext(medContext === 'POST' ? '' : 'POST')}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all focus:outline-none ${medContext === 'POST' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:bg-green-50/50'}`}
                  >
                    POST-Medication
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">Tap to select context or leave blank if building a baseline.</p>
              </div>
            )}
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md flex items-center justify-center gap-2 text-lg mt-4"
          >
            {loading ? 'Saving...' : 'Save Reading'}
          </button>
        </form>
      </div>
    </div>
  );
}
