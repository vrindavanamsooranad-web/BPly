import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Activity, Share2, Check, Globe, Lock, X, Copy } from 'lucide-react';

// ─── Google Drive-style Share Modal ──────────────────────────────────────────
function ShareModal({ userId, isPublic, onClose }) {
  const [access, setAccess] = useState(isPublic ? 'public' : 'restricted');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/shared/${userId}`;

  const handleAccessChange = async (value) => {
    setAccess(value);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), { isPublic: value === 'public' });
    } catch (err) {
      console.error('Failed to update sharing settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Share Blood Pressure Report</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Toggle - Google Drive Style */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">General Access</p>

          <button
            onClick={() => handleAccessChange('public')}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              access === 'public'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              access === 'public' ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Globe className={`w-5 h-5 ${access === 'public' ? 'text-blue-600' : 'text-slate-500'}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold ${access === 'public' ? 'text-blue-700' : 'text-slate-700'}`}>
                Anyone with the link
              </p>
              <p className="text-sm text-slate-500 truncate">Anyone on the internet can view</p>
            </div>
            {access === 'public' && <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-auto" />}
          </button>

          <button
            onClick={() => handleAccessChange('restricted')}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              access === 'restricted'
                ? 'border-slate-600 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              access === 'restricted' ? 'bg-slate-200' : 'bg-slate-100'
            }`}>
              <Lock className={`w-5 h-5 ${access === 'restricted' ? 'text-slate-700' : 'text-slate-500'}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold ${access === 'restricted' ? 'text-slate-800' : 'text-slate-700'}`}>
                Restricted
              </p>
              <p className="text-sm text-slate-500 truncate">Only you can access this report</p>
            </div>
            {access === 'restricted' && <Check className="w-5 h-5 text-slate-600 flex-shrink-0 ml-auto" />}
          </button>
        </div>

        {/* Copy Link Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-sm text-slate-600 font-medium truncate">{shareUrl}</p>
          </div>
          <button
            onClick={handleCopy}
            disabled={access === 'restricted'}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              access === 'restricted'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>

        {access === 'restricted' && (
          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
            ⚠️ Enable "Anyone with the link" to allow relatives to view your report.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

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

  return (
    <>
      {showShareModal && (
        <ShareModal
          userId={currentUser?.uid}
          isPublic={userProfile?.isPublic}
          onClose={() => setShowShareModal(false)}
        />
      )}

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

          {/* Share CTA */}
          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full font-semibold flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all border-2 bg-white text-primary-600 hover:bg-primary-50 border-primary-100 hover:border-primary-300"
            >
              {userProfile?.isPublic ? (
                <><Globe className="w-5 h-5 text-blue-600" /> Manage Sharing — Public</>
              ) : (
                <><Share2 className="w-5 h-5" /> Share Report</>
              )}
            </button>
            <p className="text-xs text-center text-slate-400 mt-2">
              {userProfile?.isPublic
                ? 'Your report is currently visible to anyone with the link.'
                : 'Share your BP history with family and doctors.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
