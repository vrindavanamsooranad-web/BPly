import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { Users, Mail, Link as LinkIcon, AlertCircle, CheckCircle, UserPlus, Send, Activity, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';

export default function ShareDash() {
  const { currentUser, userProfile } = useAuth();
  
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [familyMembers, setFamilyMembers] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setFamilyMembers(docSnap.data().familyMembers || {});
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (isSending) return;
    
    if (!emailInput || !emailInput.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    
    setError('');
    setSuccess('');
    setIsSending(true);
    
    try {
      const email = emailInput.toLowerCase();
      
      try {
        await emailjs.send(
          'service_56iqe9k',
          'template_247grif',
          {
            from_name:   'BPly Health Monitor',
            reply_to:    'no-reply@bply.vercel.app',
            logo_url:    'https://bply.vercel.app/preview-logo.png',
            family_name: nameInput || 'Family Member',
            family_email: email,
            user_name:   userProfile?.name || 'A BPly User',
            share_link:  `https://bply.vercel.app/shared/${currentUser.uid}`,
            user_id:     currentUser.uid
          },
          'YNVv0rI2soZaNdWx3'
        );
      } catch {
        // Email delivery failure is non-critical
      }

      setSuccess(`Secure invite sent to ${email}. They must log in to accept it.`);
      setEmailInput('');
      setNameInput('');
    } catch (err) {
      setError("Failed to send invite.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveFamily = async (patientId, patientName) => {
    if (!window.confirm(`Are you sure you want to stop monitoring ${patientName}?`)) return;
    try {
      // Dual delete
      const patientRef = doc(db, 'users', patientId);
      await updateDoc(patientRef, { [`authorized_viewers.${currentUser.uid}`]: deleteField() });

      const guardianRef = doc(db, 'users', currentUser.uid);
      await updateDoc(guardianRef, { [`familyMembers.${patientId}`]: deleteField() });
    } catch (err) { alert("Revocation failed. Missing permissions."); }
  };

  const copyToClipboard = () => {
    const linkStr = `${window.location.origin}/shared/${currentUser?.uid}`;
    navigator.clipboard.writeText(linkStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div className="text-center py-12 text-slate-500 animate-pulse">Loading Family Hub...</div>;

  const monitoredPatients = Object.entries(familyMembers);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      
      {/* 1. People You Monitor (Guardian Interface) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-4 mb-6">
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
             <Activity className="w-6 h-6 text-primary-500" /> People You Monitor
           </h2>
           <p className="text-slate-500 text-sm mt-1">Relatives who have authorized you to view their health data.</p>
        </div>

        {monitoredPatients.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">You are not monitoring anyone.</p>
            <p className="text-slate-400 text-sm mt-1">When a family member sends you an invite link, open it and click "Add to My Family Dashboard".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {monitoredPatients.map(([patientId, data]) => (
              <div key={patientId} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-primary-200 transition-colors flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{data.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Added: {data.addedAt ? format(new Date(data.addedAt), 'MMM dd, yyyy') : 'Unknown'}</p>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Link to={`/shared/${patientId}`} className="flex-1 text-center bg-primary-100 text-primary-700 font-bold py-2 px-3 rounded-lg hover:bg-primary-200 transition text-sm">
                    View Health Data
                  </Link>
                  <button onClick={() => handleRemoveFamily(patientId, data.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Stop Monitoring">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Share Your Dashboard (Patient Interface) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-6 h-6 text-primary-500" /> Share Your Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">Securely invite relatives or doctors. They must log into BPly to view your data. Manage access in your Profile Settings.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100 animate-in fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleShare} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Email Secure Invite</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="pl-10 w-full bg-white border border-slate-300 text-slate-900 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 px-4 outline-none"
                  placeholder="Doctor / Relative's Name"
                  required
                />
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="pl-10 w-full bg-white border border-slate-300 text-slate-900 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 px-4 outline-none"
                  placeholder="guardian@clinic.com"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSending}
              className={`flex items-center justify-center gap-2 text-white font-medium rounded-xl text-sm px-6 py-3 transition-colors shadow-sm focus:ring-4 focus:ring-primary-100 w-full sm:w-auto self-end ${isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
            >
              {isSending ? <span className="animate-pulse">Sending...</span> : <><Send className="w-4 h-4" /> Send Secure Invite</>}
            </button>
          </div>
        </form>

        {/* Direct Link */}
        <div className="border-t border-slate-100 pt-8">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Your Private Share Link</h3>
           <p className="text-sm text-slate-500 mb-4">You can manually text this URL. The recipient will be required to log in and request access.</p>
           <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                <LinkIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate text-sm font-mono">{`${window.location.origin}/shared/${currentUser?.uid}`}</span>
              </div>
              <button 
                onClick={copyToClipboard}
                className="text-primary-600 hover:text-primary-800 font-bold text-sm whitespace-nowrap bg-primary-50 px-3 py-1.5 rounded-lg transition-colors border border-primary-100"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
           </div>
        </div>
      </div>

    </div>
  );
}
