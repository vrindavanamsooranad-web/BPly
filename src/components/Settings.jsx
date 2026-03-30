import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, messaging, auth } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { signOut } from 'firebase/auth';
import { Users, Mail, Trash2, Link as LinkIcon, AlertCircle, CheckCircle, UserPlus, Bell, User, LogOut } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function Settings() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('reminders');
  
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [sharedList, setSharedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reminders Configuration
  const [reminders, setReminders] = useState({
    morning: { enabled: false, time: '08:00' },
    evening: { enabled: false, time: '20:00' }
  });
  const [fcmToken, setFcmToken] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function checkShares() {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sharedWith) setSharedList(data.sharedWith);
          if (data.reminders) setReminders(data.reminders);
          if (data.fcmToken) setFcmToken(data.fcmToken);
        }
      } catch (err) {
        console.error("Failed to fetch share list:", err);
      } finally {
        setLoading(false);
      }
    }
    checkShares();
  }, [currentUser]);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'BM6QG5b8zXZM_P6H9l-5_uA_2bWq2dO9S8Wz8s0O8Q_2I5_A_9bW0g9wV' || null
        }).catch(err => {
          console.warn("Generating basic token instead of VAPID secured due to config", err);
          return getToken(messaging);
        });
        
        if (token) {
          setFcmToken(token);
          return token;
        }
      } else {
        setError("You have explicitly blocked Notifications in your browser settings. Please allow them to set clinical reminders.");
      }
    } catch (err) {
      console.error('FCM Token generation failed:', err);
    }
    return null;
  };

  const toggleReminder = async (type) => {
    const isCurrentlyEnabled = reminders[type].enabled;
    let newToken = fcmToken;
    setError('');
    setSuccess('');
    
    if (!isCurrentlyEnabled && !fcmToken) {
       newToken = await requestNotificationPermission();
       if (!newToken) return; 
    }

    const updatedReminders = {
      ...reminders,
      [type]: {
        ...reminders[type],
        enabled: !isCurrentlyEnabled
      }
    };
    setReminders(updatedReminders);
    
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
         reminders: updatedReminders,
         fcmToken: newToken || fcmToken || null
      });
      setSuccess(`Successfully ${!isCurrentlyEnabled ? 'enabled' : 'disabled'} your ${type} reminders!`);
    } catch(err) {
       console.error("Failed to commit reminder prefs:", err);
    }
  };

  const updateTime = async (type, newTime) => {
    const updatedReminders = {
      ...reminders,
      [type]: {
        ...reminders[type],
        time: newTime
      }
    };
    setReminders(updatedReminders);
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { reminders: updatedReminders });
    } catch(err) {}
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BPly Test Reminder', {
        body: 'Success! This device is ready to receive automated BPly push notifications.',
        icon: '/favicon.svg'
      });
    } else {
      alert('Please enable clinical reminders below to securely grant browser permissions first!');
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    if (sharedList.includes(emailInput.toLowerCase())) {
      setError("This user is already on your access list.");
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      const email = emailInput.toLowerCase();
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
        sharedWith: arrayUnion(email)
      });
      
      setSharedList([...sharedList, email]);
      if (userProfile) setUserProfile({ ...userProfile, sharedWith: [...(userProfile.sharedWith || []), email] });
      
      try {
        await emailjs.send(
          'service_56iqe9k', 
          'template_247grif', 
          {
            family_name: nameInput || 'Family Member',
            family_email: email,
            user_name: userProfile?.name || 'A BPly User',
            user_id: currentUser.uid
          }, 
          'YNVv0rI2soZaNdWx3'
        );
      } catch (emailErr) {
        console.error("EmailJS sending error:", emailErr);
      }

      setSuccess(`Successfully granted viewer access and sent invite email to ${email}!`);
      setEmailInput('');
      setNameInput('');
    } catch (err) {
      console.error(err);
      setError("Failed to share profile. Please try again.");
    }
  };

  const handleRemove = async (emailToRemove) => {
    if (!window.confirm(`Are you sure you want to revoke access from ${emailToRemove}?`)) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
        sharedWith: arrayRemove(emailToRemove)
      });
      setSharedList(sharedList.filter(e => e !== emailToRemove));
      if (userProfile) setUserProfile({ ...userProfile, sharedWith: sharedList.filter(e => e !== emailToRemove) });
    } catch (err) {
      console.error(err);
      alert("Failed to remove viewer. Please try again.");
    }
  };

  const copyToClipboard = () => {
    const sharedLink = `${window.location.origin}/shared/${currentUser?.uid}`;
    navigator.clipboard.writeText(sharedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-4 px-6 text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-colors focus:outline-none ${activeTab === 'reminders' ? 'text-primary-600 bg-white border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Bell className="w-4 h-4" /> Reminders
          </button>
          <button 
            onClick={() => setActiveTab('sharing')}
            className={`flex-1 py-4 px-6 text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-colors focus:outline-none ${activeTab === 'sharing' ? 'text-primary-600 bg-white border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Users className="w-4 h-4" /> Sharing
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-4 px-6 text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-colors focus:outline-none ${activeTab === 'account' ? 'text-primary-600 bg-white border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <User className="w-4 h-4" /> Account
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 sm:p-8">
          
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

          {/* -------------------- REMINDERS TAB -------------------- */}
          {activeTab === 'reminders' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    Daily Reminders
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Configure your local notification schedules.</p>
                </div>
                <button 
                  onClick={sendTestNotification} 
                  className="text-sm bg-primary-100 hover:bg-primary-200 text-primary-700 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Test Target
                </button>
              </div>

              <div className="space-y-4">
                {/* Morning Configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4">
                   <div>
                     <h3 className="font-bold text-slate-800">Morning Check</h3>
                     <p className="text-sm text-slate-500 italic mt-1 bg-white inline-block px-2 py-1 rounded border border-slate-100">"Time for your morning BP check! Log it before breakfast."</p>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 justify-between">
                     <input 
                       type="time" 
                       value={reminders.morning.time}
                       onChange={e => updateTime('morning', e.target.value)}
                       className="bg-white border text-base border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 outline-none focus:ring-primary-500 text-slate-700"
                     />
                     <button onClick={() => toggleReminder('morning')} className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out ${reminders.morning.enabled ? 'bg-primary-600' : 'bg-slate-300'}`}>
                       <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reminders.morning.enabled ? 'translate-x-3' : '-translate-x-3'}`}></span>
                     </button>
                   </div>
                </div>

                {/* Evening Configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4">
                   <div>
                     <h3 className="font-bold text-slate-800">Evening Check</h3>
                     <p className="text-sm text-slate-500 italic mt-1 bg-white inline-block px-2 py-1 rounded border border-slate-100">"Time for your evening BP check! Log it before bed."</p>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 justify-between">
                     <input 
                       type="time" 
                       value={reminders.evening.time}
                       onChange={e => updateTime('evening', e.target.value)}
                       className="bg-white border text-base border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 outline-none focus:ring-primary-500 text-slate-700"
                     />
                     <button onClick={() => toggleReminder('evening')} className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out ${reminders.evening.enabled ? 'bg-primary-600' : 'bg-slate-300'}`}>
                       <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reminders.evening.enabled ? 'translate-x-3' : '-translate-x-3'}`}></span>
                     </button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- SHARING TAB -------------------- */}
          {activeTab === 'sharing' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  Family & Doctors
                </h2>
                <p className="text-slate-500 text-sm mt-1">Grant read-only access to your heart tracking data.</p>
              </div>

              {/* Invite Form */}
              <form onSubmit={handleShare} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Grant Viewer Access & Email Invite</h3>
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
                        placeholder="Guest Name (e.g., Dr. Smith)"
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
                    className="text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-xl text-sm px-6 py-3 transition-colors shadow-sm focus:ring-4 focus:ring-primary-100 w-full sm:w-auto self-end"
                  >
                    Send Secure Invite
                  </button>
                </div>
              </form>

              {/* Active Viewers List */}
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Currently Shared With</h3>
              {sharedList.length === 0 ? (
                <div className="text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No active viewers. Your data is entirely private.
                </div>
              ) : (
                <ul className="space-y-3 mb-8">
                  {sharedList.map((email, index) => (
                    <li key={index} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold uppercase flex-shrink-0 text-sm">
                          {email.charAt(0)}
                        </div>
                        <span className="text-slate-700 font-medium truncate">{email}</span>
                      </div>
                      <button 
                        onClick={() => handleRemove(email)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 flex-shrink-0"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Direct Link Sharing Box */}
              {sharedList.length > 0 && (
                <div className="mt-10 border-t border-slate-100 pt-8">
                   <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Your Private Share Link</h3>
                   <p className="text-sm text-slate-500 mb-4">Copy and instantly send this exact URL to your authorized viewers:</p>
                   <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 overflow-hidden">
                      <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                        <LinkIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate text-sm font-mono">{`${window.location.origin}/shared/${currentUser?.uid}`}</span>
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className="text-primary-600 hover:text-primary-800 font-bold text-sm whitespace-nowrap bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* -------------------- ACCOUNT TAB -------------------- */}
          {activeTab === 'account' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="border-b border-slate-100 pb-4 mb-6">
                 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                   Profile Settings
                 </h2>
                 <p className="text-slate-500 text-sm mt-1">Manage your identity and session.</p>
               </div>

               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                 <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0 shadow-inner">
                   {userProfile?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                 </div>
                 <div className="flex-1 space-y-1">
                   <h3 className="text-xl font-bold text-slate-800">{userProfile?.name || 'Anonymous User'}</h3>
                   <p className="text-slate-500">{currentUser?.email}</p>
                   <div className="pt-2 text-sm text-slate-600 space-y-1">
                      <p><b>Age:</b> {userProfile?.age || 'Not configured'}</p>
                      <p><b>Gender:</b> {userProfile?.gender || 'Not configured'}</p>
                   </div>
                 </div>
               </div>

               <div className="pt-4">
                  <button 
                    onClick={() => signOut(auth)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-5 py-3 rounded-xl font-medium transition-colors w-full sm:w-auto justify-center"
                  >
                    <LogOut className="w-5 h-5" /> Terminate Session
                  </button>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
