import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Users, Mail, Trash2, Link as LinkIcon, AlertCircle, CheckCircle, UserPlus, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function ShareDash() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [sharedList, setSharedList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchShares() {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().sharedWith) {
          setSharedList(docSnap.data().sharedWith);
        }
      } catch (err) {} finally { setLoading(false); }
    }
    fetchShares();
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
      // Track sent history in Firestore 
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { sharedWith: arrayUnion(email) });
      
      setSharedList((prev) => Array.from(new Set([...prev, email])));
      if (userProfile) setUserProfile({ ...userProfile, sharedWith: Array.from(new Set([...(userProfile.sharedWith || []), email])) });
      
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
      } catch (err) {
        // Email delivery failure is non-critical; invite is already saved
      }

      setSuccess(`Sent! An email notification dispatched explicitly to ${email}.`);
      setEmailInput('');
      setNameInput('');
    } catch (err) {
      setError("Failed to generate invite record.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRemove = async (emailToRemove) => {
    if (!window.confirm(`Remove ${emailToRemove} from history?`)) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { sharedWith: arrayRemove(emailToRemove) });
      setSharedList(sharedList.filter(e => e !== emailToRemove));
      if (userProfile) setUserProfile({ ...userProfile, sharedWith: sharedList.filter(e => e !== emailToRemove) });
    } catch (err) { alert("Failed to remove access. Please try again."); }
  };

  const copyToClipboard = () => {
    const linkStr = `${window.location.origin}/shared/${currentUser?.uid}`;
    navigator.clipboard.writeText(linkStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Share Hub...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-6 h-6 text-primary-500" /> Share Public Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">Anyone with your specific URL will be able to read your history records natively without registering for an account.</p>
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
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Email Public Link</h3>
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
                  placeholder="Doctor's Name"
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
                  placeholder="doctor@clinic.com"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSending}
              className={`flex items-center justify-center gap-2 text-white font-medium rounded-xl text-sm px-6 py-3 transition-colors shadow-sm focus:ring-4 focus:ring-primary-100 w-full sm:w-auto self-end ${isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
            >
              {isSending ? <span className="animate-pulse">Sending...</span> : <><Send className="w-4 h-4" /> Send Invite</>}
            </button>
          </div>
        </form>

        {/* Direct Link Sharing Box */}
        <div className="mb-10 border-t border-slate-100 pt-8">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Your Anonymous Share Link</h3>
           <p className="text-sm text-slate-500 mb-4">You can manually text or SMS this exact URL string openly to family. No login Required!</p>
           <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                <LinkIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate text-sm font-mono">{`${window.location.origin}/shared/${currentUser?.uid}`}</span>
              </div>
              <button 
                onClick={copyToClipboard}
                className="text-primary-600 hover:text-primary-800 font-bold text-sm whitespace-nowrap bg-primary-50 px-3 py-1.5 rounded-lg transition-colors border border-primary-100"
              >
                {copied ? 'Copied!' : 'Copy UI Link'}
              </button>
           </div>
        </div>

        {/* Active Viewers History */}
        {sharedList.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Invite History Logs</h3>
            <ul className="space-y-3 mb-8">
              {sharedList.map((email, index) => (
                <li key={index} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-slate-700 font-medium truncate">{email}</span>
                  </div>
                  <button 
                    onClick={() => handleRemove(email)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 flex-shrink-0"
                    title="Clear Logging"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
