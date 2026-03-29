import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Download, FileText, Calendar, Filter, Activity } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Chart.js imports
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend);

export default function History() {
  const { currentUser, userProfile } = useAuth();
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef();

  // Date Range State
  const [rangeType, setRangeType] = useState('30days'); // '30days' | 'custom'
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
        })).filter(log => log.timestamp); // Ensure we only keep logs with valid timestamps
        setAllLogs(fetchedLogs);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
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
        scale: 2, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BP_Report_${userProfile?.name}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert(`Failed to generate PDF. Error: ${err.message}`);
    } finally {
      setGenerating(false);
      setShowPdf(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading history...</div>;

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

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Header & Report Configurations */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">History & Reports</h2>
            <p className="text-slate-500 mt-1 text-sm">Analyze trends and generate PDF reports for your doctor.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-auto">
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

            <button 
              onClick={generatePDF} disabled={generating || filteredLogs.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 whitespace-nowrap w-full sm:w-auto justify-center"
            >
              {generating ? <span className="animate-pulse">Building PDF...</span> : <><Download className="w-4 h-4" /> Generate Report</>}
            </button>
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
                    <th className="py-3 px-6 font-medium">Date & Time</th>
                    <th className="py-3 px-6 font-medium text-center">Systolic</th>
                    <th className="py-3 px-6 font-medium text-center">Diastolic</th>
                    <th className="py-3 px-6 font-medium text-center">Pulse</th>
                    <th className="py-3 px-6 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredLogs.map((log) => {
                    // Logic: highlight if systolic > 140 OR diastolic > 90
                    const isHigh = log.systolic > 140 || log.diastolic > 90;
                    const isOptimal = log.systolic < 120 && log.diastolic < 80;
                    
                    return (
                      <tr key={log.id} className={`border-b border-slate-50 last:border-0 transition-colors ${isHigh ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                        <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                          {(() => {
                            try { return format(new Date(log.timestamp), 'MMM dd, yyyy - hh:mm a'); } 
                            catch(e) { return 'Invalid Date'; }
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
                            {isHigh ? 'High (Stage 2+)' : isOptimal ? 'Optimal' : 'Elevated / Stage 1'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Hidden PDF Payload (Expanded standard A4 view) */}
      {showPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, backgroundColor: '#ffffff' }}>
          <div ref={printRef} style={{ width: '850px', backgroundColor: '#ffffff', padding: '48px', color: '#1e293b', fontFamily: 'sans-serif' }}>
          
          {/* Watermark Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', opacity: 0.8 }}>
            <Activity style={{ width: '32px', height: '32px', color: '#2563eb' }} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.05em', color: '#1e293b' }}>BPly</span>
          </div>

          {/* Professional Header */}
          <div style={{ borderBottom: '4px solid #1e293b', paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.05em', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#0f172a' }}>Blood Pressure Report</h1>
              <p style={{ margin: 0, fontWeight: '500', letterSpacing: '0.025em', color: '#475569' }}>
                REPORT PERIOD: {rangeType === '30days' ? 'LAST 30 DAYS' : 'CUSTOM FILTER'}
              </p>
            </div>
            <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '24px', textAlign: 'right', fontSize: '14px' }}>
              <p style={{ margin: 0, fontWeight: '800', fontSize: '20px', textTransform: 'uppercase', color: '#0f172a' }}>{userProfile?.name}</p>
              <p style={{ margin: '4px 0 0 0', textTransform: 'uppercase', fontWeight: '600', color: '#475569' }}>Age: {userProfile?.age} | Gender: {userProfile?.gender}</p>
              <p style={{ margin: '2px 0 0 0', textTransform: 'uppercase', fontWeight: '500', color: '#64748b' }}>DOB: {userProfile?.dob}</p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', marginBottom: '32px', margin: 0 }}>
            This document was generated on {format(new Date(), 'MMMM dd, yyyy')} via the BPly Tracker Application.
          </p>

          <div style={{ marginBottom: '48px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Visualization</h3>
            <div style={{ height: '350px', width: '100%', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
              <Line data={chartData} options={{...chartOptions, animation: false, responsive: true, maintainAspectRatio: false}} />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Log Registry</h3>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 'bold', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '10px 16px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Systolic</th>
                  <th style={{ padding: '10px 16px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Diastolic</th>
                  <th style={{ padding: '10px 16px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Pulse</th>
                  <th style={{ padding: '10px 16px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Alerts</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => {
                  const isHigh = log.systolic > 140 || log.diastolic > 90;
                  return (
                    <tr key={log.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                        {(() => {
                          try { return format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm'); } 
                          catch(e) { return 'Invalid Date'; }
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: isHigh ? '#b91c1c' : 'inherit', backgroundColor: isHigh ? '#fef2f2' : 'transparent' }}>{log.systolic}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: isHigh ? '#1d4ed8' : 'inherit', backgroundColor: isHigh ? '#eff6ff' : 'transparent' }}>{log.diastolic}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#475569' }}>{log.pulse || '-'}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {isHigh ? <span style={{ color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>High BP</span> : <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '64px', paddingTop: '16px', borderTop: '2px solid #1e293b' }}>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              BPly Dashboards • Personal Reference
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '0.05em' }}>
              www.bply.vercel.com
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
