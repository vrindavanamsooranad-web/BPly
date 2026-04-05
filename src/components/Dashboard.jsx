import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { Activity } from 'lucide-react';
import { subDays, isAfter } from 'date-fns';
import { classifyBP, getAHAStyles } from '../utils/bpClassify';

async function get3DayInsight(uid, newSystolic) {
  try {
    const snap = await getDocs(query(collection(db, `users/${uid}/logs`), orderBy('timestamp', 'desc')));
    const threeDaysAgo = subDays(new Date(), 3);
    const recent = snap.docs
      .map(d => d.data())
      .filter(l => { try { return l.timestamp && isAfter(new Date(l.timestamp), threeDaysAgo); } catch { return false; } });
    if (recent.length < 3) return { text: 'Log saved successfully.', type: 'info' };
    const avg = recent.reduce((s, l) => s + (l.systolic || 0), 0) / recent.length;
    const diff = newSystolic - avg;
    if (diff > 10)  return { text: `Note: This is significantly higher than your 3-day average (${Math.round(avg)} mmHg). Please rest and re-check in 15 minutes.`, type: 'warning' };
    if (diff < -10) return { text: `Excellent! This reading is lower than your recent 3-day average (${Math.round(avg)} mmHg).`, type: 'success' };
    return { text: `Your blood pressure is consistent with your recent 3-day average (${Math.round(avg)} mmHg).`, type: 'info' };
  } catch {
    return { text: 'Log saved successfully.', type: 'info' };
  }
}

const CATEGORY_PILL = {
  normal:   'text-green-700 bg-green-50 border-green-200',
  elevated: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  stage1:   'text-orange-700 bg-orange-50 border-orange-200',
  stage2:   'text-red-700 bg-red-50 border-red-200',
  crisis:   'text-red-900 bg-red-100 border-red-400 animate-pulse',
};

const TOAST_COLORS = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  error:   'bg-red-50 text-red-700 border-red-200',
};

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [systolic, setSystolic]   = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse]         = useState('');
  const [dateTime, setDateTime]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null); // { text, type }

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  }, []);

  const handleLog = async (e) => {
    e.preventDefault();
    if (!systolic || !diastolic) return;
    setLoading(true);
    setToast(null);
    const sysNum = Number(systolic);
    const diaNum = Number(diastolic);
    try {
      await addDoc(collection(db, `users/${currentUser.uid}/logs`), {
        systolic: sysNum,
        diastolic: diaNum,
        pulse: pulse ? Number(pulse) : null,
        timestamp: new Date(dateTime).toISOString(),
        shareId: currentUser.uid,
      });
      setSystolic(''); setDiastolic(''); setPulse('');
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDateTime(now.toISOString().slice(0, 16));
      const insight = await get3DayInsight(currentUser.uid, sysNum);
      setToast(insight);
      setTimeout(() => setToast(null), 7000);
    } catch {
      setToast({ text: 'Failed to log reading. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const liveCategory = systolic && diastolic ? classifyBP(Number(systolic), Number(diastolic)) : null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hi, {userProfile?.name}!</h2>
          <p className="text-slate-500 mt-1">Log your Blood Pressure and Pulse reading below.</p>
        </div>

        {/* Live AHA category preview */}
        {liveCategory && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${CATEGORY_PILL[liveCategory.color]}`}>
            <Activity className="w-4 h-4 flex-shrink-0" />
            {liveCategory.label}
          </div>
        )}

        {/* Comparative insights toast */}
        {toast && (
          <div className={`p-4 rounded-xl border text-sm flex items-start gap-2 ${TOAST_COLORS[toast.type]}`}>
            <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{toast.text}</span>
          </div>
        )}

        <form onSubmit={handleLog} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Systolic (Top)</label>
              <input type="number" required min="30" max="300" value={systolic} onChange={e => setSystolic(e.target.value)}
                className="w-full text-center text-3xl sm:text-4xl font-bold text-red-600 py-4 sm:py-6 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all placeholder:text-slate-200" placeholder="120" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Diastolic (Bottom)</label>
              <input type="number" required min="30" max="200" value={diastolic} onChange={e => setDiastolic(e.target.value)}
                className="w-full text-center text-3xl sm:text-4xl font-bold text-blue-600 py-4 sm:py-6 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-200" placeholder="80" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Pulse (BPM)</label>
              <input type="number" min="30" max="250" value={pulse} onChange={e => setPulse(e.target.value)}
                className="w-full text-center text-xl font-bold text-slate-700 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300" placeholder="72" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Date & Time</label>
              <input type="datetime-local" required value={dateTime} onChange={e => setDateTime(e.target.value)}
                className="w-full text-center text-sm font-medium text-slate-700 py-3 sm:py-4 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-lg mt-4">
            {loading ? 'Saving...' : 'Save Reading'}
          </button>
        </form>
      </div>
    </div>
  );
}
