import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Activity, Calendar, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend);

export default function SharedView() {
  const { userId } = useParams();
  const { currentUser, userProfile } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [targetProfile, setTargetProfile] = useState(null);
  useEffect(() => {
    if (!userId) return;

    const profileRef = doc(db, 'users', userId);
    
    // Using simple getDoc instead of onSnapshot since this is a public dashboard view
    // which prevents constant permission re-evaluation crashes for anonymous users
    async function loadSharedData() {
      try {
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          setError("Report Not Found: The requested dashboard does not exist.");
          setLoading(false);
          return;
        }

        const profileData = profileSnap.data();
        setTargetProfile(profileData);

        const viewers = profileData.authorized_viewers || {};
        const isAuth = currentUser ? viewers[currentUser.uid] : false;
        setIsAuthorized(!!isAuth);

        // Safe Data Fetching (Bypass Auth requirement)
        const q = query(collection(db, `users/${userId}/logs`), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = querySnapshot.docs
          .map(ds => ({ id: ds.id, ...ds.data() }))
          .filter(log => log.timestamp);
          
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Shared Access Network Error:", err);
        setError("Report Not Found or Access Denied.");
      } finally {
        setLoading(false);
      }
    }
    
    loadSharedData();
  }, [userId, currentUser]);

  const handleAddToFamily = async () => {
    if (!currentUser) return;
    setAddingToFamily(true);
    try {
      const patientRef = doc(db, 'users', userId);
      await updateDoc(patientRef, {
        [`authorized_viewers.${currentUser.uid}`]: {
          name: userProfile?.name || currentUser.email,
          email: currentUser.email,
          addedAt: new Date().toISOString()
        }
      });

      const guardianRef = doc(db, 'users', currentUser.uid);
      await updateDoc(guardianRef, {
        [`familyMembers.${userId}`]: {
          name: targetProfile?.name || 'Unknown Patient',
          addedAt: new Date().toISOString()
        }
      });

      setIsAuthorized(true);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Failed to establish secure link. Firebase permission missing.");
    } finally {
      setAddingToFamily(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse w-full max-w-5xl mx-auto mt-4 px-4 sm:px-0">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
          <div className="space-y-3 w-full">
            <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-100 rounded-md"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-sm">
          <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
          <div className="h-64 sm:h-72 w-full bg-slate-100 rounded-xl"></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-50">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="p-6 space-y-4">
            <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 border border-red-200 bg-red-50 rounded-2xl text-center shadow-sm">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-800 mb-2">Node Locked By Firebase</h2>
        <p className="text-red-600 mb-6">{error}</p>
      </div>
    );
  }

  const groupedLogs = logs.reduce((acc, log) => {
    let dateKey = 'Invalid Date';
    try { dateKey = format(new Date(log.timestamp), 'MMMM dd, yyyy'); } catch(e) {}
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  const chartDataLogs = [...logs].reverse();
  const chartData = {
    labels: chartDataLogs.map(log => {
      try { return format(new Date(log.timestamp), 'MMM dd'); } catch(e) { return ''; }
    }),
    datasets: [
      {
        label: 'Systolic',
        data: chartDataLogs.map(log => log.systolic),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Diastolic',
        data: chartDataLogs.map(log => log.diastolic),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        pointRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { suggestedMin: 40, suggestedMax: 180 } }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-primary-50 rounded-2xl shadow-sm border border-primary-100 p-6 flex items-start gap-4 flex-col sm:flex-row">
         <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 border-b border-primary-200 pb-2 mb-2">
            Viewing Medical Dashboard: {targetProfile?.name || 'Anonymous User'}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-600 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded inline-flex">
            {!currentUser ? (
              <><Lock className="w-3 h-3" /> Anonymous View</>
            ) : isAuthorized ? (
              <><ShieldCheck className="w-3 h-3 text-green-600" /> Authorized Guardian</>
            ) : (
              <><Lock className="w-3 h-3" /> Unlinked Medical Data</>
            )}
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
           No readings have been recorded by this user yet.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500"/> Patient Trends
            </h3>
            <div className="w-full overflow-x-auto pb-2">
              <div className="h-64 sm:h-72 min-w-[600px] w-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500"/> Blood Pressure Registry
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm">
                    <th className="py-3 px-6 font-medium">Time</th>
                    <th className="py-3 px-6 font-medium text-center">Systolic</th>
                    <th className="py-3 px-6 font-medium text-center">Diastolic</th>
                    <th className="py-3 px-6 font-medium text-center">Pulse</th>
                    <th className="py-3 px-6 font-medium">Categorization</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.entries(groupedLogs).map(([date, dailyLogs]) => (
                    <React.Fragment key={date}>
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan="5" className="py-3 px-6 font-bold text-slate-800 bg-slate-100">
                          {date}
                        </td>
                      </tr>
                      {dailyLogs.map((log) => {
                        const isHigh = log.systolic > 140 || log.diastolic > 90;
                        const isOptimal = log.systolic < 120 && log.diastolic < 80;
                        
                        return (
                          <tr key={log.id} className={`border-b border-slate-50 last:border-0 transition-colors ${isHigh ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                            <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                              {(() => {
                                try { return format(new Date(log.timestamp), 'hh:mm a'); } 
                                catch(e) { return 'Invalid Time'; }
                              })()}
                            </td>
                            <td className={`py-4 px-6 text-center font-bold ${isHigh ? 'text-red-700' : 'text-slate-800'}`}>{log.systolic}</td>
                            <td className={`py-4 px-6 text-center font-bold ${isHigh ? 'text-red-700' : 'text-slate-800'}`}>{log.diastolic}</td>
                            <td className="py-4 px-6 text-center text-slate-600 font-medium">{log.pulse || '-'}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                isHigh ? 'bg-red-200 text-red-800' : 
                                isOptimal ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isHigh ? 'High Range' : isOptimal ? 'Optimal' : 'Elevated'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add to Family Call to Action (Shown to ALL unconnected users) */}
          {currentUser?.uid !== userId && !isAuthorized && (
            <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-8 text-center mt-12 animate-in fade-in slide-in-from-bottom-4">
              <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Add to Family Dashboard</h2>
              <p className="text-slate-300 mb-6 max-w-md mx-auto text-sm">
                You are currently viewing this report anonymously. Add {targetProfile?.name || 'this patient'} to your Family Dashboard to monitor their health records securely in real-time.
              </p>
              
              {currentUser ? (
                <button 
                  onClick={handleAddToFamily}
                  disabled={addingToFamily}
                  className={`font-bold px-8 py-3 rounded-xl transition-colors ${addingToFamily ? 'bg-slate-600 text-slate-400' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  {addingToFamily ? 'Connecting...' : 'Establish Secure Link'}
                </button>
              ) : (
                <button 
                  onClick={() => window.location.href = `/login?redirect=/shared/${userId}`}
                  className="font-bold px-8 py-3 rounded-xl transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  Log In to Setup Family Link
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
