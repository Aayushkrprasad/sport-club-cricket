import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Radio, ArrowRight, Trophy } from 'lucide-react';
import { playBidTone, playHammerThump, playSoldFanfare } from '../services/audio';

export default function LiveAuctionStadium({ 
  auctionRoomState, 
  onOpenAuthModal, 
  onOpenCaptainPortal 
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activePlayer = auctionRoomState?.activePlayer;
  const currentBid = auctionRoomState?.currentBid || activePlayer?.base_price || 0;
  const highestBidderTeamName = auctionRoomState?.highestBidderTeamName;
  const highestBidderLogo = auctionRoomState?.highestBidderLogo;
  const status = auctionRoomState?.status || 'IDLE';
  const history = auctionRoomState?.biddingHistory || [];

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) playBidTone();
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'BIDDING':
        return <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-lime-400 text-slate-950 animate-pulse">🔥 LIVE BIDDING OPEN</span>;
      case 'GOING_ONCE':
        return <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 animate-bounce">⚡ GOING ONCE...</span>;
      case 'GOING_TWICE':
        return <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-orange-500 text-white animate-bounce">⚡ GOING TWICE...</span>;
      case 'SOLD':
        return <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950">🔨 SOLD!</span>;
      case 'UNSOLD':
        return <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-500 text-white">❌ UNSOLD</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">STAGE READY</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      {/* Hero Header */}
      <div className="text-center relative mb-12">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4 leading-[1.1] uppercase">
          <span className="burning-fast text-white">Sunstone</span> <br /> Premier League <br />
          <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Auction Arena 2026
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Register as a student player, showcase your face photo & stats, and get drafted by Team Captains in the live interactive auction!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onOpenAuthModal('signup')}
            className="w-full sm:w-auto font-black bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-slate-950 px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-lime-400/10 flex items-center justify-center gap-3 cursor-pointer group uppercase text-sm"
          >
            <span>Student Player Registration</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onOpenCaptainPortal}
            className="w-full sm:w-auto font-bold text-amber-400 hover:text-white border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-6 py-3.5 rounded-xl transition-all block cursor-pointer text-sm"
          >
            👑 Captain Registration / Login
          </button>
        </div>
      </div>

      {/* Public Stadium Live Screen */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Stadium Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </span>
            <h2 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>Live Auction Stage</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge()}
            
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-lime-400/10 border-lime-400/30 text-lime-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Audio ON' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* Live Arena Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Player Face Photo & Info Card */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
            {/* Player Face Photo Display */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-slate-900 border-2 border-lime-400/40 flex items-center justify-center text-6xl shadow-xl overflow-hidden shrink-0 relative group">
              {activePlayer?.photo_data ? (
                <img 
                  src={activePlayer.photo_data} 
                  alt={activePlayer.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{activePlayer?.avatar || '🏏'}</span>
              )}
              <div className="absolute bottom-1 right-1 bg-slate-950/90 text-lime-400 text-[10px] font-bold px-2 py-0.5 rounded border border-lime-400/30">
                LIVE
              </div>
            </div>

            {/* Player Info Details */}
            <div className="text-center sm:text-left flex-1 space-y-2">
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lime-400/10 text-lime-400 border border-lime-400/20 uppercase tracking-wider mb-1">
                {activePlayer?.player_role || 'All-Rounder'}
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black text-white capitalize leading-tight">
                {activePlayer ? (activePlayer.name || activePlayer.full_name) : 'Waiting for Auctioneer...'}
              </h3>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Roll / Enrollment</span>
                  <span className="font-mono text-slate-200 font-bold">{activePlayer?.enrollment_no || '---'}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Department</span>
                  <span className="text-slate-200 font-bold">{activePlayer?.department || '---'}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Batting Style</span>
                  <span className="text-slate-200 font-semibold">{activePlayer?.batting_style || 'Right Hand'}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Bowling Style</span>
                  <span className="text-slate-200 font-semibold">{activePlayer?.bowling_style || 'Right Arm Fast'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Realtime Bidding Purse & Highest Bidder */}
          <div className="lg:col-span-5 space-y-4">
            {/* Current Price Box */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-lime-400/30 text-center shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Current Stage Bid
              </span>
              <div className="text-4xl sm:text-5xl font-black text-lime-400 font-mono tracking-tight">
                {currentBid} <span className="text-xl text-lime-300">Pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Starting Base Bid: {activePlayer?.base_price || 15} Pts
              </p>
            </div>

            {/* Highest Bidder Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Highest Bidder:</span>
              <div className="flex items-center gap-2">
                {highestBidderTeamName ? (
                  <>
                    <span className="text-xl">{highestBidderLogo || '👑'}</span>
                    <span className="text-sm font-bold text-amber-400">{highestBidderTeamName}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 italic">No bids placed yet</span>
                )}
              </div>
            </div>

            {/* Realtime Bid Feed */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
                <span>Live Bidding Feed</span>
                <span className="text-[10px] text-slate-500">{history.length} bids</span>
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {history.length > 0 ? (
                  history.slice().reverse().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span>{item.logo || '🏏'}</span>
                        <span>{item.teamName}</span>
                      </span>
                      <span className="font-mono font-bold text-lime-400">{item.bidAmount} Pts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 text-center py-3 italic">
                    Captains can place live bids from the Captain Station.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
