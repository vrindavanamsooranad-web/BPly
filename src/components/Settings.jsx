import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, messaging, auth } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { signOut } from 'firebase/auth';
import { AlertCircle, CheckCircle, Bell, User, LogOut } from 'lucide-react';

export default function Settings() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('reminders');
  const [loading, setLoading] = useState(true);

  // Independent Notifications Tracking
  const [morningReminderTime, setMorningReminderTime] = useState('08:00');
  const [morningReminderEnabled, setMorningReminderEnabled] = useState(false);
  const [eveningReminderTime, setEveningReminderTime] = useState('20:00');
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(false);

  const [fcmToken, setFcmToken] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.morningReminderTime) setMorningReminderTime(data.morningReminderTime);
          if (data.morningReminderEnabled !== undefined) setMorningReminderEnabled(data.morningReminderEnabled);
          if (data.eveningReminderTime) setEveningReminderTime(data.eveningReminderTime);
          if (data.eveningReminderEnabled !== undefined) setEveningReminderEnabled(data.eveningReminderEnabled);
          if (data.fcmToken) setFcmToken(data.fcmToken);
        }
      } catch (err) {} finally { setLoading(false); }
    }
    fetchSettings();
  }, [currentUser]);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'BM6QG5b8zXZM_P6H9l-5_uA_2bWq2dO9S8Wz8s0O8Q_2I5_A_9bW0g9wV' || null
        }).catch(() => getToken(messaging));
        
        if (token) {
          setFcmToken(token);
          return token;
        }
      } else {
        setError("Notifications blocked natively by device browser.");
      }
    } catch (err) {}
    return null;
  };

  const handleToggle = async (type) => {
    setError(''); setSuccess('');
    let newToken = fcmToken;
    
    let currentEnabled = type === 'morning' ? morningReminderEnabled : eveningReminderEnabled;
    let newEnabled = !currentEnabled;

    if (newEnabled && !fcmToken) {
       newToken = await requestNotificationPermission();
       if (!newToken) {
          setError('System token extraction failed. Check browser permissions.');
          return;
       }
    }

    if (type === 'morning') {
      setMorningReminderEnabled(newEnabled);
    } else {
      setEveningReminderEnabled(newEnabled);
    }
    
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
         [type === 'morning' ? 'morningReminderEnabled' : 'eveningReminderEnabled']: newEnabled,
         [type === 'morning' ? 'morningReminderTime' : 'eveningReminderTime']: type === 'morning' ? morningReminderTime : eveningReminderTime,
         fcmToken: newToken || fcmToken || null
      });
      setSuccess(`Independently routed ${type} toggle state to ${newEnabled ? 'On' : 'Off'}!`);
    } catch(err) {
       setError("Failed to route token payload locally to Firebase.");
    }
  };

  const updateTime = async (type, newTime) => {
    if (type === 'morning') {
      setMorningReminderTime(newTime);
    } else {
      setEveningReminderTime(newTime);
    }

    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { 
        [type === 'morning' ? 'morningReminderTime' : 'eveningReminderTime']: newTime 
      });
    } catch(err) {}
  };

  const sendTestNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
         registration.showNotification('BPly Testing Engine', {
           body: 'Success! Your Service Worker correctly received this native trigger.',
           icon: '/favicon.svg'
         });
      } else {
        new Notification('BPly Test Reminder', {
          body: 'Success! Device payload triggered natively.',
          icon: '/favicon.svg'
        });
      }
    } else {
      alert('You must enable a Notification Switch below so the device securely pulls keys automatically!');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Configuration...</div>;

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

          {activeTab === 'reminders' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    Daily Reminders
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Configure independent alarm schedules.</p>
                </div>
                <button 
                  onClick={sendTestNotification} 
                  className="text-sm bg-primary-100 hover:bg-primary-200 text-primary-700 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap border border-primary-200"
                >
                  Test Native Target
                </button>
              </div>

              <div className="space-y-4">
                {/* Morning Configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4">
                   <div>
                     <h3 className="font-bold text-slate-800">Morning Check</h3>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 justify-between">
                     <input 
                       type="time" 
                       value={morningReminderTime}
                       onChange={e => updateTime('morning', e.target.value)}
                       className="bg-white border text-base border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 outline-none focus:ring-primary-500 text-slate-700"
                     />
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="sr-only peer"
                         checked={morningReminderEnabled}
                         onChange={() => handleToggle('morning')}
                       />
                       <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                     </label>
                   </div>
                </div>

                {/* Evening Configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4">
                   <div>
                     <h3 className="font-bold text-slate-800">Evening Check</h3>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 justify-between">
                     <input 
                       type="time" 
                       value={eveningReminderTime}
                       onChange={e => updateTime('evening', e.target.value)}
                       className="bg-white border text-base border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 outline-none focus:ring-primary-500 text-slate-700"
                     />
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="sr-only peer"
                         checked={eveningReminderEnabled}
                         onChange={() => handleToggle('evening')}
                       />
                       <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                     </label>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="border-b border-slate-100 pb-4 mb-6">
                 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                   Profile Settings
                 </h2>
               </div>
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                 <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0 shadow-inner">
                   {userProfile?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                 </div>
                 <div className="flex-1 space-y-1">
                   <h3 className="text-xl font-bold text-slate-800">{userProfile?.name || 'Anonymous User'}</h3>
                   <p className="text-slate-500">{currentUser?.email}</p>
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
