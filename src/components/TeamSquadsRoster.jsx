import React, { useState, useEffect } from 'react';
import { Trophy, Users, Shield, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { getAllTeams, getAllPlayers, subscribeToAuctionUpdates } from '../services/db';

export default function TeamSquadsRoster() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToAuctionUpdates(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    const { data: teamList } = await getAllTeams();
    const { data: playerList } = await getAllPlayers();

    if (teamList) {
      // Enrich each team with its sold players roster
      const enriched = teamList.map(t => {
        const squad = (playerList || []).filter(
          p => (p.sold_to_team_id === t.id) || (p.sold_to_team && p.sold_to_team.toLowerCase() === t.name.toLowerCase())
        );

        const spent = squad.reduce((acc, p) => acc + Number(p.sold_price || p.base_price || 0), 0);
        const leftover = (t.total_budget || 100) - spent;

        return {
          ...t,
          squad,
          squadCount: squad.length,
          spent,
          leftover
        };
      });

      setTeams(enriched);
    }
    setLoading(false);
  };

  const claimedCount = teams.filter(t => t.owner_email).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-4 h-4" /> Official Tournament Roster
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          All 8 <span className="bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 bg-clip-text text-transparent">Franchise Squads</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Real-time draft results, captain status, remaining budget purse, and squad composition (8 Active + 2 Subs = 10 Max Players).
        </p>

        {/* Captain Seats Status Badge */}
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs font-bold text-slate-300">
          <span>👑 Captain Seats:</span>
          <span className={`font-mono ${claimedCount >= 8 ? 'text-rose-400 font-black' : 'text-lime-400'}`}>
            {claimedCount} / 8 Claimed
          </span>
          {claimedCount >= 8 && (
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase">
              Registration Closed
            </span>
          )}
        </div>
      </div>

      {/* Grid of 8 Teams */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading franchise squad details...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teams.map(t => (
            <div
              key={t.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
            >
              {/* Top Accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: t.color || '#a3e635' }}
              />

              <div className="space-y-4">
                {/* Team Info */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-3xl p-2 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                    {t.logo || '🏏'}
                  </span>
                  <div>
                    <h3 className="font-black text-white text-base leading-tight">{t.name}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">{t.department} Department</p>
                  </div>
                </div>

                {/* Captain Badge */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                    <span>Captain</span>
                    {t.owner_email ? (
                      <span className="text-emerald-400 font-mono">✓ REGISTERED</span>
                    ) : (
                      <span className="text-amber-400">VACANT</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-200 truncate">
                    {t.owner_name || 'No captain claimed yet'}
                  </p>
                </div>

                {/* Purse Budget Bar */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold text-[11px]">Purse Remaining</span>
                    <span className="font-mono font-black text-lime-400">{t.leftover} / {t.total_budget || 100} Pts</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (t.leftover / (t.total_budget || 100)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Spent: {t.spent} Pts</span>
                    <span>Squad: {t.squadCount} / 10 Max</span>
                  </div>
                </div>

                {/* Squad Roster List */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>Drafted Squad ({t.squadCount})</span>
                    <span className="text-[10px] font-normal text-slate-500">Max 10</span>
                  </h4>

                  {t.squad.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {t.squad.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] shrink-0">
                              {pIdx < 7 ? '🏏' : '🔄'}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-slate-200 truncate">{p.name}</p>
                              <p className="text-[9px] text-slate-500 uppercase">{p.player_role || 'All-Rounder'}</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-lime-400 shrink-0 ml-1">
                            {p.sold_price || p.base_price || 15} Pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-600 text-xs italic">
                      No players drafted into this squad yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
