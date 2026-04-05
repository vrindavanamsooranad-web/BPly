import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Activity, Calendar, AlertTriangle, Globe, Lock, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { getAHAStyles } from '../utils/bpClassify';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend);

export default function SharedView() {
  const { userId } = useParams();

  const [logs, setLogs] = useState([]);
  const [targetProfile, setTargetProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function loadSharedData() {
      try {
        const profileSnap = await getDoc(doc(db, 'users', userId));
        if (!profileSnap.exists()) {
          setError('This report does not exist or has been deleted.');
          setLoading(false);
          return;
        }

        const profileData = profileSnap.data();

        // ── PATH 1: isPublic = true → Allow anyone, no auth needed ──────────
        if (profileData.isPublic === true) {
          setTargetProfile(profileData);
          const q = query(collection(db, `users/${userId}/logs`), orderBy('timestamp', 'desc'));
          const snap = await getDocs(q);
          setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.timestamp));
          setLoading(false);
          return;
        }

        // ── PATH 2: Restricted → Check viewer's credentials ─────────────────
        const currentUser = auth.currentUser;
        const authorizedEmails = profileData.authorizedEmails ?? [];

        // Not logged in at all → prompt login
        if (!currentUser) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }

        // Logged in but email not in authorizedEmails and not the owner
        const viewerEmail = currentUser.email?.toLowerCase() ?? '';
        const isOwner = currentUser.uid === userId;
        const isAuthorized = authorizedEmails.map(e => e.toLowerCase()).includes(viewerEmail);

        if (!isOwner && !isAuthorized) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Authorized → load data
        setTargetProfile(profileData);
        const q = query(collection(db, `users/${userId}/logs`), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.timestamp));
      } catch (err) {
        console.error('SharedView fetch error:', err);
        setError('Failed to load the report. The link may be invalid.');
      } finally {
        setLoading(false);
      }
    }

    loadSharedData();
  }, [userId]);

  // ── LOADING STATE ──────────────────────────────────────────────────────────
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
          <div className="p-6 border-b border-slate-50"><div className="h-6 w-48 bg-slate-200 rounded-lg"></div></div>
          <div className="p-6 space-y-4">
            <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // ── NEEDS LOGIN ────────────────────────────────────────────────────────────
  if (needsLogin) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">This report is restricted</h2>
        <p className="text-slate-500 text-sm mb-6">
          The owner has limited access to specific people. Log in to check if you have been granted access.
        </p>
        <Link
          to={`/login?redirect=/shared/${userId}`}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <LogIn className="w-4 h-4" /> Log In to View
        </Link>
      </div>
    );
  }

  // ── ACCESS DENIED ──────────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm">
          You don't have permission to view this report. Ask the owner to add your email address in their sharing settings.
        </p>
      </div>
    );
  }

  // ── GENERIC ERROR ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 border border-red-200 bg-red-50 rounded-2xl text-center shadow-sm">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-800 mb-2">Report Not Found</h2>
        <p className="text-red-600 mb-6">{error}</p>
      </div>
    );
  }

  // ── DATA RENDERING ─────────────────────────────────────────────────────────
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
        data: chartDataLogs.map(log => (log.systolic != null ? Number(log.systolic) : null)),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.3,
        pointRadius: 4,
        spanGaps: true,
      },
      {
        label: 'Diastolic',
        data: chartDataLogs.map(log => (log.diastolic != null ? Number(log.diastolic) : null)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        pointRadius: 4,
        spanGaps: true,
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
      {/* Header */}
      <div className="bg-primary-50 rounded-2xl shadow-sm border border-primary-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900">
            {targetProfile?.name || 'Patient'}'s Blood Pressure Report
          </h2>
          <p className="text-sm text-primary-600 mt-1">Read-only shared view</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${
          targetProfile?.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {targetProfile?.isPublic
            ? <><Globe className="w-3.5 h-3.5" /> Public Link</>
            : <><Lock className="w-3.5 h-3.5" /> Authorized View</>}
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
              <Activity className="w-5 h-5 text-primary-500"/> Blood Pressure Trends
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
                    <th className="py-3 px-6 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.entries(groupedLogs).map(([date, dailyLogs]) => (
                    <React.Fragment key={date}>
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan="5" className="py-3 px-6 font-bold text-slate-800 bg-slate-100">{date}</td>
                      </tr>
                      {dailyLogs.map((log) => {
                        const aha = getAHAStyles(log.systolic, log.diastolic);
                        return (
                          <tr key={log.id} className={`border-b border-slate-50 last:border-0 transition-colors ${aha.row}`}>
                            <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                              {(() => { try { return format(new Date(log.timestamp), 'hh:mm a'); } catch(e) { return 'Invalid Time'; } })()}
                            </td>
                            <td className={`py-4 px-6 text-center font-bold ${aha.numText}`}>{log.systolic}</td>
                            <td className={`py-4 px-6 text-center font-bold ${aha.numText}`}>{log.diastolic}</td>
                            <td className="py-4 px-6 text-center text-slate-600 font-medium">{log.pulse || '-'}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${aha.badge}`}>
                                {aha.label}
                              </span>
                            </td>
                          </tr>
                        );
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
