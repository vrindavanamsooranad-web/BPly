import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { AlertCircle, CheckCircle, User, LogOut, Calendar } from 'lucide-react';
import { differenceInYears } from 'date-fns';

export default function Settings() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  // Profile Form States
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setName(data.name);
          if (data.gender) setGender(data.gender);
          if (data.dob) setDob(data.dob);
        }
      } catch (err) {} finally { setLoading(false); }
    }
    fetchProfile();
  }, [currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      // Calculate age natively via date-fns
      let calculatedAge = null;
      if (dob) {
         calculatedAge = differenceInYears(new Date(), new Date(dob));
      }

      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
         name,
         gender,
         dob,
         age: calculatedAge
      });
      setSuccess('Profile successfully updated! Changes are reflected securely on your generated PDFs.');
    } catch(err) {
       setError("Failed to push profile update back to the database.");
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Configuration...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">Account Profile</h2>
          </div>
          <button 
            type="button"
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors border border-red-100/50 text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Form Body */}
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

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
                 
                 <div className="w-20 h-20 rounded-full bg-primary-100 flex mx-auto items-center justify-center text-primary-700 font-bold text-3xl shadow-inner uppercase mb-4">
                   {name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                 </div>
                 <div className="text-center mb-8 pb-6 border-b border-slate-100">
                   <p className="text-slate-500 font-medium">{currentUser?.email}</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                   <div className="space-y-1.5 text-left md:col-span-2">
                     <label className="text-sm font-bold text-slate-700 px-1">Full Name</label>
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                       placeholder="Enter Name To Print on Report"
                     />
                   </div>
                   <div className="space-y-1.5 text-left">
                     <label className="text-sm font-bold text-slate-700 px-1">Biological Sex / Gender</label>
                     <select 
                       value={gender}
                       onChange={(e) => setGender(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-700 font-medium"
                     >
                       <option value="">Select Identity...</option>
                       <option value="Female">Female</option>
                       <option value="Male">Male</option>
                       <option value="Other">Other</option>
                       <option value="Prefer Not to Say">Prefer Not to Say</option>
                     </select>
                   </div>
                   <div className="space-y-1.5 text-left">
                     <div className="flex justify-between items-center px-1">
                       <label className="text-sm font-bold text-slate-700">Date of Birth</label>
                       {dob && <span className="text-xs font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded shadow-sm border border-primary-100">Age: {differenceInYears(new Date(), new Date(dob))}</span>}
                     </div>
                     <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                         <Calendar className="h-[18px] w-[18px] text-slate-400" />
                       </div>
                       <input 
                         type="date" 
                         value={dob}
                         max={new Date().toISOString().split("T")[0]}
                         onChange={(e) => setDob(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-700 font-medium tracking-wide"
                       />
                     </div>
                   </div>
                 </div>
               
               <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-white px-5 py-4 rounded-xl font-bold text-lg transition-all flex justify-center shadow-lg hover:shadow-xl shadow-slate-900/10"
                  >
                    Save Context Parameters
                  </button>
               </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
