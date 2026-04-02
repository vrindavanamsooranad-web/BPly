import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { User, Mail, Calendar, LogOut, ShieldCheck, Share2 } from 'lucide-react';
import { differenceInYears, format as fnsFormat } from 'date-fns';

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-base font-semibold text-slate-800 truncate">{value || <span className="text-slate-300 font-normal italic">Not set</span>}</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const { currentUser, userProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        setProfile(userProfile);
      }
      setLoading(false);
    }, (err) => {
      setProfile(userProfile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, userProfile]);

  const toggleSharing = async () => {
    try {
      const patientRef = doc(db, 'users', currentUser.uid);
      await updateDoc(patientRef, { isPublic: !profile?.isPublic });
    } catch (err) {
      alert("Failed to update privacy settings.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          Loading profile...
        </div>
      </div>
    );
  }

  // Calculate age live from DOB
  let age = profile?.age ?? null;
  if (profile?.dob) {
    try {
      age = differenceInYears(new Date(), new Date(profile.dob));
    } catch (e) { /* keep stored age */ }
  }

  // Format DOB nicely
  let dobDisplay = profile?.dob ?? null;
  if (dobDisplay) {
    try {
      dobDisplay = new Date(dobDisplay).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch (e) { /* keep raw */ }
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="max-w-lg mx-auto pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-8 text-white text-center relative">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 text-2xl font-black tracking-tight">
            {initials}
          </div>
          <h1 className="text-xl font-bold">{profile?.name || 'Your Profile'}</h1>
          <p className="text-slate-300 text-sm mt-0.5">{currentUser?.email}</p>
          {age !== null && (
            <span className="inline-block mt-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
              Age {age} · {profile?.gender || 'N/A'}
            </span>
          )}
        </div>

        {/* Fields */}
        <div className="px-6 py-2">
          <ProfileField icon={User}       label="Full Name"      value={profile?.name} />
          <ProfileField icon={Mail}       label="Email Address"  value={currentUser?.email} />
          <ProfileField icon={Calendar}   label="Date of Birth"  value={dobDisplay} />
          <ProfileField icon={ShieldCheck} label="Gender"        value={profile?.gender} />
          <ProfileField icon={User}       label="Age"            value={age !== null ? `${age} years old` : null} />
        </div>

        {/* Info notice */}
        <div className="mx-6 mb-4 mt-2 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-600 font-medium">
          Profile details are set during initial onboarding. Contact support to update your information.
        </div>

        {/* Data Sharing Control Pane */}
        <div className="px-6 py-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-slate-800">Public Link Sharing</h2>
            </div>
            
            <button 
              onClick={toggleSharing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.isPublic ? 'bg-primary-500' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile?.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {profile?.isPublic 
              ? "Your data is currently accessible via your direct shared link." 
              : "Enable this to allow anyone with your unique URL to view your dashboard."}
          </p>
          
          {profile?.isPublic && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-800 mb-1">Your Public Dashboard Link:</p>
              <a href={`/shared/${currentUser?.uid}`} target="_blank" rel="noreferrer" className="text-sm break-all font-medium text-blue-600 hover:underline">
                {window.location.origin}/shared/{currentUser?.uid}
              </a>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="px-6 pb-6">
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold py-3 rounded-xl transition-all text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
