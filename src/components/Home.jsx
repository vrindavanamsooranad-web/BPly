import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, TrendingUp, FileText, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] flex flex-col items-center">
      
      {/* Hero Section */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block p-4 rounded-full bg-blue-100 text-blue-600 mb-6">
          <Activity className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Track Your Heart Health <br className="hidden sm:block" /> with <span className="text-blue-600">BPly</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          A simple, secure way to log your daily blood pressure and generate professional reports for your doctor. Completely private and built for your peace of mind.
        </p>
        <div className="flex justify-center">
          <Link 
            to="/login" 
            className="group bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            Get Started 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Daily Logging</h3>
            <p className="text-slate-600 leading-relaxed">
              Easily record your Systolic, Diastolic, and Pulse readings on any device. The dashboard automatically syncs to your personal cloud.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Visual Trends</h3>
            <p className="text-slate-600 leading-relaxed">
              Spot patterns instantly with our interactive Chart.js graphs. We categorize your readings to highlight elevated metrics.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">PDF Exports</h3>
            <p className="text-slate-600 leading-relaxed">
              Generate clinical-grade PDF documents spanning any selected date range. Deliver beautifully formatted reports straight to your doctor.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
