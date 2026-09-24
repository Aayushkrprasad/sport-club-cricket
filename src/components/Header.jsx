import React from 'react';
import { Trophy, Crown, Zap, UserCheck, LogOut, FileText, Shield } from 'lucide-react';

export default function Header({ 
  currentView, 
  setCurrentView, 
  activeStudent, 
  onOpenAuthModal, 
  onOpenRulesModal, 
  onLogoutStudent 
}) {
  return (
    <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => setCurrentView('stadium')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-br from-lime-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-lime-500/20 group-hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6 text-slate-950" />
          </div>
          <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
            Sunstone Premier League
          </span>
        </div>

        {/* View Switching Navigation */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setCurrentView('stadium')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentView === 'stadium' 
                ? 'bg-lime-400 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🏟️ Public Arena
          </button>

          <button
            onClick={() => setCurrentView('squads')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'squads' 
                ? 'bg-emerald-400 text-slate-950 shadow-md' 
                : 'text-emerald-400 hover:bg-emerald-400/10'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> 8 Team Squads
          </button>
          
          <button
            onClick={() => setCurrentView('captain')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'captain' 
                ? 'bg-amber-400 text-slate-950 shadow-md' 
                : 'text-amber-400 hover:bg-amber-400/10'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Captain Portal
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onOpenRulesModal}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2.5 rounded-xl transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-lime-400" /> Rules
          </button>

          {activeStudent ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-lime-400 border border-lime-400/30 px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4 text-lime-400" />
                <span>{activeStudent.name?.split(' ')[0] || 'My Profile'}</span>
              </button>
              <button
                onClick={onLogoutStudent}
                className="text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal('login')}
              className="text-xs sm:text-sm font-bold bg-lime-400 hover:bg-lime-500 text-slate-950 px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
            >
              Athlete Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
