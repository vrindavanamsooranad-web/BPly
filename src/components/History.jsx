import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { Download, FileText, Calendar, Filter, Activity, Pencil, Trash2, Sun, Moon, Pill } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  
  // Edit State
  const [editingLog, setEditingLog] = useState(null);

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

      // Inject actual log registry directly using autoTable to prevent page cutoffs
      const tableBody = [];
      Object.entries(groupedLogs).forEach(([date, logs]) => {
        // Push a group header row spanning all 7 columns
        tableBody.push([{ content: date, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
        
        logs.forEach(log => {
          let timeStr = 'Invalid Time';
          let hour = 12;
          try { 
            const d = new Date(log.timestamp);
            timeStr = format(d, 'hh:mm a');
            hour = d.getHours();
          } catch(e) {}
          
          let period = log.timeOfDay || (hour >= 6 && hour < 18 ? 'day' : 'night');
          const periodStr = period === 'day' ? 'Day' : 'Night';
          
          const isHigh = log.systolic > 140 || log.diastolic > 90;
          tableBody.push([
            timeStr,
            periodStr,
            log.systolic.toString(),
            log.diastolic.toString(),
            log.pulse ? log.pulse.toString() : '-',
            log.medicationContext ? `[${log.medicationContext}]` : '-',
            isHigh ? 'High BP' : '-'
          ]);
        });
      });

      autoTable(pdf, {
        startY: pdfHeight + 10,
        head: [['Time', 'Period', 'Sys', 'Dia', 'Pulse', 'Medication', 'Alerts']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }, // slate-800
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
        didParseCell: function(data) {
          if (data.section === 'body') {
            // Check if it's a data row (length > 1) rather than a group header (length 1)
            if (data.row.raw.length > 1) {
              const isHigh = data.row.raw[6] === 'High BP';
              if (data.column.index === 2 && isHigh) {
                data.cell.styles.textColor = [185, 28, 28]; // red-700
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 3 && isHigh) {
                data.cell.styles.textColor = [29, 78, 216]; // blue-700
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 6 && isHigh) {
                data.cell.styles.textColor = [220, 38, 38]; // red-600
                data.cell.styles.fontStyle = 'bold';
              }
              // Format Medication Column
              if (data.column.index === 5 && data.row.raw[5] !== '-') {
                 data.cell.styles.textColor = data.row.raw[5] === '[PRE]' ? [217, 119, 6] : [21, 128, 61]; // amber or green
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
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text('BPly Dashboards • Personal Reference  |  https://bply.vercel.app', pdfWidth / 2, pdf.internal.pageSize.getHeight() - 8, { align: 'center' });
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
                    <th className="py-3 px-6 font-medium">Time</th>
                    <th className="py-3 px-6 font-medium text-center">Period</th>
                    <th className="py-3 px-6 font-medium text-center">Systolic</th>
                    <th className="py-3 px-6 font-medium text-center">Diastolic</th>
                    <th className="py-3 px-6 font-medium text-center">Pulse</th>
                    <th className="py-3 px-6 font-medium text-center">Meds</th>
                    <th className="py-3 px-6 font-medium text-center">Category</th>
                    <th className="py-3 px-6 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.entries(groupedLogs).map(([date, logs]) => (
                    <React.Fragment key={date}>
                      {/* Date Group Header */}
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan="8" className="py-3 px-6 font-bold text-slate-800 bg-slate-100">
                          {date}
                        </td>
                      </tr>
                      {/* Logs for this date */}
                      {logs.map((log) => {
                        const isHigh = log.systolic > 140 || log.diastolic > 90;
                        const isOptimal = log.systolic < 120 && log.diastolic < 80;
                        
                        let hour = 12;
                        try { hour = new Date(log.timestamp).getHours(); } catch(e) {}
                        let period = log.timeOfDay || (hour >= 6 && hour < 18 ? 'day' : 'night');
                        
                        return (
                          <tr key={log.id} className={`border-b border-slate-50 last:border-0 transition-colors ${isHigh ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                            <td className="py-4 px-6 text-slate-700 whitespace-nowrap font-medium">
                              {(() => {
                                try { return format(new Date(log.timestamp), 'hh:mm a'); } 
                                catch(e) { return 'Invalid Time'; }
                              })()}
                            </td>
                            <td className="py-4 px-6 text-center">
                               {period === 'day' ? 
                                 <span className="inline-flex items-center justify-center gap-1.5 min-w-[70px] text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-sm"><Sun className="w-3.5 h-3.5"/> Day</span> : 
                                 <span className="inline-flex items-center justify-center gap-1.5 min-w-[70px] text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 shadow-sm"><Moon className="w-3.5 h-3.5"/> Night</span>
                               }
                            </td>
                            <td className={`py-4 px-6 text-center text-lg font-black ${isHigh ? 'text-red-700' : 'text-slate-800'}`}>{log.systolic}</td>
                            <td className={`py-4 px-6 text-center text-lg font-black ${isHigh ? 'text-red-700' : 'text-slate-800'}`}>{log.diastolic}</td>
                            <td className="py-4 px-6 text-center text-slate-600 font-bold">{log.pulse || '-'}</td>
                            <td className="py-4 px-6 text-center">
                               {log.medicationContext ? (
                                  <span className={`inline-flex items-center justify-center gap-1.5 min-w-[75px] text-[11px] uppercase tracking-wide font-black px-2.5 py-1 rounded-full border ${log.medicationContext === 'PRE' ? 'text-amber-700 bg-amber-50 border-amber-200 shadow-sm' : 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-sm'}`}>
                                    <Pill className="w-3 h-3"/> {log.medicationContext}
                                  </span>
                               ) : <span className="text-slate-300 font-bold">—</span>}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                isHigh ? 'bg-red-200 text-red-800 shadow-sm' : 
                                isOptimal ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-blue-100 text-blue-700 shadow-sm'
                              }`}>
                                {isHigh ? 'High (Stage 2+)' : isOptimal ? 'Optimal' : 'Elevated / Stage 1'}
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

          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Visualization</h3>
            <div style={{ height: '350px', width: '100%', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
              <Line data={chartData} options={{...chartOptions, animation: false, responsive: true, maintainAspectRatio: false}} />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
