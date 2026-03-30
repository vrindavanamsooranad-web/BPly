import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Activity, Calendar, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Chart.js imports
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend);

export default function SharedView() {
  const { userId } = useParams();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [targetProfile, setTargetProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSharedData() {
      if (!currentUser) return;

      try {
        // Enforced by Security Rules: We can only read the profile if we are in sharedWith.
        const profileRef = doc(db, 'users', userId);
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          setError("User highly restricted or does not exist.");
          setLoading(false);
          return;
        }

        const profileData = profileSnap.data();
        
        // Minor local fail-safe check (The server will reject it regardless)
        if (currentUser.uid !== userId && (!profileData.sharedWith || !profileData.sharedWith.includes(currentUser.email))) {
          setError("You do not have viewer permission for this dashboard.");
          setLoading(false);
          return;
        }

        setTargetProfile(profileData);

        // Fetch user logs
        const q = query(
          collection(db, `users/${userId}/logs`),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedLogs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(log => log.timestamp);
        
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Shared Access Denied or Network Error:", err);
        setError("Missing permissions. The user must manually invite: " + currentUser.email);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadSharedData();
    }
  }, [currentUser, userId, authLoading]);

  // Redirect instantly if unauthenticated
  if (!authLoading && !currentUser) {
    return <Navigate to="/login" />;
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
        <Lock className="w-12 h-12 text-slate-300 mb-4" />
        <p>Verifying secure connection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 border border-red-200 bg-red-50 rounded-2xl text-center shadow-sm">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <p className="text-sm text-red-500">Ensure the dashboard owner invited the exact email: <b>{currentUser?.email}</b></p>
      </div>
    );
  }

  // --- Process Data for Display ---
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
      {/* Banner */}
      <div className="bg-primary-50 rounded-2xl shadow-sm border border-primary-100 p-6 flex items-start gap-4">
        <div className="bg-primary-100 p-3 rounded-full flex-shrink-0 shadow-sm border border-white">
          <Activity className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 border-b border-primary-200 pb-2 mb-2">
            Viewing Medical Dashboard: {targetProfile?.name}
          </h2>
          <p className="text-primary-700 text-sm flex gap-4">
             <span><b>Age:</b> {targetProfile?.age}</span>
             <span><b>Gender:</b> {targetProfile?.gender}</span>
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary-600 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded inline-flex">
            <Lock className="w-3 h-3" /> External Read-Only View
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
           No readings have been recorded by this user yet.
        </div>
      ) : (
        <>
          {/* Chart Wrapper */}
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

          {/* Table Wrapper without Edit/Delete columns */}
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
                      {/* Date Group Header */}
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan="5" className="py-3 px-6 font-bold text-slate-800 bg-slate-100">
                          {date}
                        </td>
                      </tr>
                      {/* Data Rows */}
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
        </>
      )}
    </div>
  );
}
