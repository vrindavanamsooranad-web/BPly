import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Download, FileText, Calendar, Filter, Activity, Pencil, Trash2, Share2, Globe, Lock, X, Copy, Check, UserPlus } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay, differenceInYears } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { classifyBP, getAHAStyles } from '../utils/bpClassify';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend);

// ─── Google Drive-Style Share Modal ──────────────────────────────────────────
function ShareModal({ userId, userName, profile, onClose }) {
  const shareUrl = `${window.location.origin}/shared/${userId}`;
  const isPublic = profile?.isPublic ?? false;
  const authorizedEmails = profile?.authorizedEmails ?? [];

  const [emailInput, setEmailInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const profileRef = doc(db, 'users', userId);

  const handleAccessChange = async (pub) => {
    setSaving(true);
    try {
      await updateDoc(profileRef, { isPublic: pub });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleAddEmail = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (authorizedEmails.includes(email)) { setEmailInput(''); return; }
    setSaving(true);
    try {
      await updateDoc(profileRef, { authorizedEmails: arrayUnion(email) });
      setEmailInput('');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleRemoveEmail = async (email) => {
    try {
      await updateDoc(profileRef, { authorizedEmails: arrayRemove(email) });
    } catch (e) { console.error(e); }
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Share "{userName}'s" Report</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage who can view this blood pressure dashboard</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Add People */}
          <div className={isPublic ? 'opacity-40 pointer-events-none select-none' : ''}>
            {isPublic && (
              <p className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">🌐 Public access is on — email restrictions are inactive while anyone-with-link is enabled.</p>
            )}
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Add People</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                placeholder="Enter email address..."
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                onClick={handleAddEmail}
                disabled={saving}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {authorizedEmails.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {authorizedEmails.map(email => (
                  <div key={email} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-sm text-slate-700 font-medium truncate">{email}</span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Access  */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">General Access</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <button
                onClick={() => handleAccessChange(false)}
                disabled={saving}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${!isPublic ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!isPublic ? 'bg-slate-200' : 'bg-slate-100'}`}>
                  <Lock className={`w-4 h-4 ${!isPublic ? 'text-slate-700' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${!isPublic ? 'text-slate-900' : 'text-slate-600'}`}>Restricted</p>
                  <p className="text-xs text-slate-500">Only people added above can open with the link</p>
                </div>
                {!isPublic && <Check className="w-4 h-4 text-slate-700 flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleAccessChange(true)}
                disabled={saving}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isPublic ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isPublic ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <Globe className={`w-4 h-4 ${isPublic ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isPublic ? 'text-blue-700' : 'text-slate-600'}`}>Anyone with the link</p>
                  <p className="text-xs text-slate-500">Anyone on the internet can view without signing in</p>
                </div>
                {isPublic && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl gap-3">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${
              copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" />Link Copied!</> : <><Copy className="w-4 h-4" />Copy link</>}
          </button>
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const { currentUser, userProfile } = useAuth();
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef();

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProfile, setShareProfile] = useState(null);

  // Edit State
  const [editingLog, setEditingLog] = useState(null);

  // Date Range State
  const [rangeType, setRangeType] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, `users/${currentUser.uid}/logs`),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedLogs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(log => log.timestamp);
        setAllLogs(fetchedLogs);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [currentUser]);

  // Live-sync the user's share profile so modal always shows current state
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) setShareProfile(snap.data());
    });
    return () => unsub();
  }, [currentUser]);

  // Filter logs based on date range
  const filteredLogs = allLogs.filter(log => {
    if (!log.timestamp) return false;
    const logDate = new Date(log.timestamp);
    if (isNaN(logDate.getTime())) return false; // Skip invalid dates
    
    if (rangeType === '30days') {
      const thirtyDaysAgo = subDays(new Date(), 30);
      return isAfter(logDate, thirtyDaysAgo);
    } else if (rangeType === 'custom') {
      if (customStart && isBefore(logDate, startOfDay(new Date(customStart)))) return false;
      if (customEnd && isAfter(logDate, endOfDay(new Date(customEnd)))) return false;
      return true;
    }
    return true;
  });

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    let dateKey = 'Invalid Date';
    try { dateKey = format(new Date(log.timestamp), 'MMMM dd, yyyy'); } catch(e) {}
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  const [showPdf, setShowPdf] = useState(false);

  const generatePDF = async () => {
    // Reveal the container to the DOM and wait for Chart bounds to calculate
    setShowPdf(true);
    setGenerating(true);

    // Wait 800ms to ensure chart is fully rendered by react-chartjs-2
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!printRef.current) {
      setGenerating(false);
      setShowPdf(false);
      return;
    }
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // ── AHA Executive Summary Box ────────────────────────────────────────
      try {
        const sevenDaysAgo = subDays(new Date(), 7);
        const sevenDayLogs = allLogs.filter(l => { try { return l.timestamp && isAfter(new Date(l.timestamp), sevenDaysAgo); } catch { return false; } });
        const avgSys = sevenDayLogs.length > 0 ? Math.round(sevenDayLogs.reduce((s, l) => s + (l.systolic || 0), 0) / sevenDayLogs.length) : null;
        const avgDia = sevenDayLogs.length > 0 ? Math.round(sevenDayLogs.reduce((s, l) => s + (l.diastolic || 0), 0) / sevenDayLogs.length) : null;
        const avgCat = avgSys && avgDia ? classifyBP(avgSys, avgDia) : null;
        const bx = 15, by = pdfHeight + 8, bw = pdfWidth - 30, bh = 42;
        pdf.setFillColor(248, 250, 252);
        pdf.rect(bx, by, bw, bh, 'F');
        pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3);
        pdf.rect(bx, by, bw, bh, 'S');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139);
        pdf.text('EXECUTIVE SUMMARY — 7-DAY OVERVIEW', bx + 4, by + 8);
        pdf.setFontSize(9); pdf.setTextColor(15, 23, 42);
        const r1 = by + 18, r2 = by + 30, c1 = bx + 4, c2 = bx + 97;
        pdf.setFont('helvetica', 'bold'); pdf.text('7-Day Average:', c1, r1);
        pdf.setFont('helvetica', 'normal'); pdf.text(avgSys && avgDia ? `${avgSys} / ${avgDia} mmHg` : 'Insufficient data', c1 + 36, r1);
        pdf.setFont('helvetica', 'bold'); pdf.text('AHA Category:', c2, r1);
        pdf.setFont('helvetica', 'normal'); pdf.text(avgCat ? avgCat.label : 'N/A', c2 + 34, r1);
        pdf.setFont('helvetica', 'bold'); pdf.text('Log Count:', c1, r2);
        pdf.setFont('helvetica', 'normal'); pdf.text(`${filteredLogs.length} readings in selected period`, c1 + 25, r2);
        pdf.setFont('helvetica', 'bold'); pdf.text('Report Period:', c2, r2);
        pdf.setFont('helvetica', 'normal'); pdf.text(reportDateRange, c2 + 34, r2);
      } catch (summaryErr) { console.warn('Summary box skipped:', summaryErr); }

      // Inject actual log registry directly using autoTable to prevent page cutoffs
      const tableBody = [];
      Object.entries(groupedLogs).forEach(([date, logs]) => {
        tableBody.push([{ content: date, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }]);
        
        logs.forEach(log => {
          let timeStr = '-';
          try { timeStr = format(new Date(log.timestamp), 'hh:mm a'); } catch(e) {}
          const isHigh = log.systolic >= 140 || log.diastolic >= 90;
          
          tableBody.push([
            timeStr,
            log.systolic.toString(),
            log.diastolic.toString(),
            log.pulse ? log.pulse.toString() : '-',
            isHigh ? 'High BP' : '-'
          ]);
        });
      });

      autoTable(pdf, {
        startY: pdfHeight + 58,
        head: [['Time', 'Systolic', 'Diastolic', 'Pulse', 'Alerts']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' }, // slate-900 
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.row.raw.length > 1) {
              const alertText = data.row.raw[4];
              
              if (alertText === 'High BP') {
                data.cell.styles.textColor = [185, 28, 28]; // red-700
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        margin: { top: 15, bottom: 20 },
        pageBreak: 'auto'
      });

      // Add professional footer dynamically to every generated page
      const pageCount = pdf.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Footer line
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.line(15, pdf.internal.pageSize.getHeight() - 15, pdfWidth - 15, pdf.internal.pageSize.getHeight() - 15);
        
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text('BPly Dashboards • Personal Reference  |  https://bply.vercel.app', pdfWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      pdf.save(`BP_Report_${userProfile?.name}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert(`Failed to generate PDF. Error: ${err.message}`);
    } finally {
      setGenerating(false);
      setShowPdf(false);
    }
  };

  const handleDelete = async (log) => {
    if (window.confirm('Are you sure you want to completely remove this blood pressure reading? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/logs/${log.id}`));
        setAllLogs(prev => prev.filter(l => l.id !== log.id));
      } catch (err) {
        console.error('Error deleting log:', err);
        alert('Failed to delete the reading.');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLog) return;
    
    // Validate bounds
    const systolic = parseInt(editingLog.systolic, 10);
    const diastolic = parseInt(editingLog.diastolic, 10);
    const pulse = editingLog.pulse ? parseInt(editingLog.pulse, 10) : null;
    
    if (systolic < 40 || systolic > 250 || diastolic < 30 || diastolic > 150) {
      alert("Please enter realistic blood pressure values.");
      return;
    }
    
    try {
      const logRef = doc(db, `users/${currentUser.uid}/logs/${editingLog.id}`);
      const updatedData = { systolic, diastolic, pulse };
      await updateDoc(logRef, updatedData);
      
      // Update local state to force UI and Graph sync immediately
      setAllLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...updatedData } : l));
      setEditingLog(null);
    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update the reading.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-100 rounded-md"></div>
          </div>
          <div className="h-14 w-full md:w-80 bg-slate-100 rounded-xl"></div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
          <div className="h-64 sm:h-72 w-full bg-slate-100 rounded-xl"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="p-6 space-y-4">
            <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
            <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const chartDataLogs = [...filteredLogs].reverse(); // oldest to newest for the graph

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
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      y: { suggestedMin: 40, suggestedMax: 180 }
    }
  };

  // ─── PDF Analytics ──────────────────────────────────────────────────────────
  
  // 1. Metadata
  const patientAge = userProfile?.dob ? differenceInYears(new Date(), new Date(userProfile.dob)) : 'N/A';
  const reportDateRange = rangeType === '30days' ? 'LAST 30 DAYS' : 'CUSTOM FILTER';

  return (
    <div className="space-y-8 pb-12">

      {showShareModal && (
        <ShareModal
          userId={currentUser?.uid}
          userName={userProfile?.name || 'My'}
          profile={shareProfile}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Top Header & Report Configurations */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">History & Reports</h2>
            <p className="text-slate-500 mt-1 text-sm">Analyze trends and generate PDF reports for your doctor.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Filter className="w-4 h-4" />
                <select
                  value={rangeType} onChange={e => setRangeType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {rangeType === 'custom' && (
                <div className="flex items-center gap-2 text-sm">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                  <span className="text-slate-400">-</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5" />
                </div>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium py-2 px-3 rounded-lg transition-colors shadow-sm text-sm"
                  title="Share Report"
                >
                  {shareProfile?.isPublic
                    ? <Globe className="w-4 h-4 text-blue-600" />
                    : <Share2 className="w-4 h-4" />}
                  Share
                </button>
                <button
                  onClick={generatePDF} disabled={generating || filteredLogs.length === 0}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 whitespace-nowrap flex-1 sm:flex-none justify-center"
                >
                  {generating ? <span className="animate-pulse">Building PDF...</span> : <><Download className="w-4 h-4" /> Generate Report</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          No readings found in this date range.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
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
                <Calendar className="w-5 h-5 text-primary-500"/> Detailed Readings
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
                    <th className="py-3 px-6 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.entries(groupedLogs).map(([date, logs]) => (
                    <React.Fragment key={date}>
                      {/* Date Group Header */}
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan="6" className="py-3 px-6 font-bold text-slate-800 bg-slate-100">
                          {date}
                        </td>
                      </tr>
                      {/* Logs for this date */}
                      {logs.map((log) => {
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
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setEditingLog(log)} className="text-slate-400 hover:text-primary-600 transition-colors" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(log)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

      {/* Edit Reading Modal Popup */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 delay-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary-500" /> Edit Reading
              </h3>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Systolic (Top)</label>
                  <input
                    type="number"
                    value={editingLog.systolic}
                    onChange={(e) => setEditingLog({...editingLog, systolic: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Diastolic (Bottom)</label>
                  <input
                    type="number"
                    value={editingLog.diastolic}
                    onChange={(e) => setEditingLog({...editingLog, diastolic: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Pulse / Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={editingLog.pulse || ''}
                  onChange={(e) => setEditingLog({...editingLog, pulse: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 transition-colors"
                  placeholder="Optional"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingLog(null)} 
                  className="w-full bg-white border border-slate-300 text-slate-700 font-medium rounded-xl text-sm px-5 py-3 text-center transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-xl text-sm px-5 py-3 text-center transition-all shadow-sm shadow-primary-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden PDF Payload (Expanded standard A4 view) */}
      {showPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, backgroundColor: '#ffffff' }}>
          <div ref={printRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '40px', color: '#1e293b', fontFamily: 'sans-serif' }}>
            
            {/* Header: Logo & Title Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity style={{ width: '28px', height: '28px', color: '#2563eb' }} />
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>BPly</span>
                </div>
                <div>
                  <h1 style={{ fontSize: '40px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>BLOOD PRESSURE REPORT</h1>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    REPORT PERIOD: {reportDateRange}
                  </p>
                </div>
              </div>

              {/* Patient Metadata Card (Top Right) */}
              <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '24px', textAlign: 'right' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>{userProfile?.name || 'A S KRISHNAJITH'}</h2>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  AGE: {patientAge} | GENDER: {userProfile?.gender || 'MALE'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                  DOB: {userProfile?.dob || '2009-03-18'}
                </p>
              </div>
            </div>

            <div style={{ borderBottom: '2px solid #0f172a', margin: '20px 0 30px 0' }}></div>

            <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginBottom: '24px' }}>
              This document was generated on {format(new Date(), 'MMMM dd, yyyy')} via the BPly Tracker Application.
            </p>

            {/* Visualization Section */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', marginBottom: '16px' }}>VISUALIZATION</h3>
              <div style={{ height: '380px', width: '100%', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                <Line 
                  data={chartData} 
                  options={{
                    ...chartOptions, 
                    animation: false, 
                    plugins: { ...chartOptions.plugins, legend: { position: 'top', align: 'center' } },
                    scales: { 
                      ...chartOptions.scales, 
                      y: { min: 0, max: 300, ticks: { stepSize: 50 } },
                      x: { grid: { display: false } }
                    } 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
