import React from 'react';
import { User, Award, ShieldCheck, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

export default function PlayerDashboard({ student, onOpenCertViewer }) {
  if (!student) return null;

  const isSold = student.auction_status === 'Sold' || Boolean(student.sold_to_team);
  const status = student.status || 'Registered';

  const getClearanceBadge = () => {
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
          <CheckCircle2 className="w-4 h-4" /> Approved for Draft
        </span>
      );
    } else if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-400/10 text-rose-400 border border-rose-400/30">
          <AlertTriangle className="w-4 h-4" /> Registration Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
        <Clock className="w-4 h-4 animate-pulse" /> Pending Coordinator Approval
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-800 pb-8">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 border-2 border-lime-400/40 flex items-center justify-center text-5xl shadow-xl overflow-hidden shrink-0">
            {student.photo_data ? (
              <img src={student.photo_data} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span>{student.avatar || '🏏'}</span>
            )}
          </div>

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {getClearanceBadge()}
              
              {isSold ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                  <Award className="w-4 h-4 text-emerald-400" /> Sold to {student.sold_to_team} ({student.sold_price || student.base_price} Pts)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                  Available for Bidding
                </span>
              )}
            </div>

            <h2 className="text-3xl font-black text-white capitalize">{student.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{student.email}</p>
          </div>
        </div>

        {/* Profile Attributes Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold">Enrollment / Roll Number</span>
            <p className="font-mono font-bold text-slate-200">{student.enrollment_no || '---'}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold">Department / Branch</span>
            <p className="font-bold text-slate-200">{student.department || '---'}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold">Player Role</span>
            <p className="font-bold text-lime-400">{student.player_role || 'All-Rounder'}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold">Starting Base Price</span>
            <p className="font-bold font-mono text-lime-400">{student.base_price || 15} Points</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold">Batting & Bowling Style</span>
            <p className="font-medium text-slate-300">{student.batting_style || 'Right Hand Batter'} • {student.bowling_style || 'Right Arm Fast'}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-xs uppercase font-bold block">Sports Certificate</span>
              <span className="text-xs text-slate-300 font-medium">{student.certificate_name || 'None attached'}</span>
            </div>
            {student.certificate_data && (
              <button
                onClick={() => onOpenCertViewer(student.certificate_name, student.certificate_data)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-lime-400/10 text-lime-400 hover:bg-lime-400 hover:text-slate-950 transition-all flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> View
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
