import React, { useState, useEffect } from 'react';
import { Crown, Zap, Shield, Plus, Lock, Users, Wallet, LogOut, CheckCircle2 } from 'lucide-react';
import { getAllTeams, loginTeamOwner, registerTeamOwner, getActiveAuctionRoomState, setActiveAuctionRoomState, broadcastAuctionEvent } from '../services/db';
import { playBidTone } from '../services/audio';

export default function CaptainPortal({ auctionRoomState }) {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Register State
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [department, setDepartment] = useState('');
  const [logo, setLogo] = useState('⚡');
  const [color, setColor] = useState('#38bdf8');
  const [allTeams, setAllTeams] = useState([]);

  // Active Franchise Data
  const [myTeam, setMyTeam] = useState(null);

  useEffect(() => {
    loadTeams();
    const saved = localStorage.getItem('unibox_team_owner_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const loadTeams = async () => {
    const { data } = await getAllTeams();
    if (data) setAllTeams(data);
  };

  useEffect(() => {
    if (session && allTeams.length > 0) {
      const email = session.email?.toLowerCase();
      let team = allTeams.find(t => t.owner_email && t.owner_email.toLowerCase() === email);
      if (!team && session.teamId) {
        team = allTeams.find(t => t.id === session.teamId);
      }
      setMyTeam(team || null);
    }
  }, [session, allTeams]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const res = await loginTeamOwner(loginEmail, loginPassword);
    if (res.success) {
      const sess = { email: loginEmail, teamId: res.team?.id, ownerName: res.team?.owner_name };
      setSession(sess);
      loadTeams();
    } else {
      setAuthError(res.error || 'Login failed.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const res = await registerTeamOwner({
      ownerName,
      email: regEmail,
      password: regPassword,
      teamName,
      department,
      logo,
      color
    });

    if (res.success) {
      const sess = { email: regEmail, teamId: res.team?.id, ownerName: res.team?.owner_name };
      setSession(sess);
      loadTeams();
    } else {
      setAuthError(res.error || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unibox_team_owner_session');
    setSession(null);
    setMyTeam(null);
  };

  const handlePlaceBid = (increment) => {
    if (!myTeam) return;
    const room = getActiveAuctionRoomState();

    if (!room.activePlayer) {
      alert('No player is currently on stage for bidding.');
      return;
    }

    if (myTeam.squad_count >= 8) {
      alert(`Squad Full! ${myTeam.name} already has maximum 8 players.`);
      return;
    }

    const nextBid = (room.currentBid || room.activePlayer.base_price || 0) + increment;
    if (nextBid > myTeam.leftover_balance) {
      alert(`Insufficient budget! ${myTeam.name} has only ${myTeam.leftover_balance} Pts remaining.`);
      return;
    }

    const newHistory = [...(room.biddingHistory || []), {
      teamId: myTeam.id,
      teamName: myTeam.name,
      logo: myTeam.logo,
      bidAmount: nextBid,
      timestamp: Date.now()
    }];

    const newState = {
      ...room,
      currentBid: nextBid,
      highestBidderTeamId: myTeam.id,
      highestBidderTeamName: myTeam.name,
      highestBidderLogo: myTeam.logo,
      highestBidderOwner: myTeam.owner_name,
      status: 'BIDDING',
      biddingHistory: newHistory
    };

    setActiveAuctionRoomState(newState);
    playBidTone();
  };

  // Render Login/Register Screen if not authenticated
  if (!session || !myTeam) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-3xl mb-1">
              👑
            </div>
            <h2 className="text-2xl font-black uppercase text-white">Captain Portal</h2>
            <p className="text-xs text-slate-400">Register or sign in to your University Franchise Team</p>
            
            {/* Captain Seats Status Badge */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold">
                <span className="text-slate-400">Captains Registered:</span>
                <span className="font-mono text-lime-400 font-bold">{allTeams.filter(t => t.owner_email).length} / 8</span>
              </div>
              {Math.max(0, 8 - allTeams.filter(t => t.owner_email).length) > 0 ? (
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1 rounded-full border border-amber-400/20">
                  ⚡ {Math.max(0, 8 - allTeams.filter(t => t.owner_email).length)} Captain Spot{Math.max(0, 8 - allTeams.filter(t => t.owner_email).length) === 1 ? '' : 's'} Remaining to Register
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3.5 py-1 rounded-full border border-rose-500/20">
                  🔒 All 8 Captain Seats Claimed
                </span>
              )}
            </div>
          </div>

          <div className="flex border border-slate-800 bg-slate-950 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'login' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'register' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Franchise
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              ⚠️ {authError}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase text-slate-400">Franchise Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@titans.com"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase text-slate-400">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full text-slate-950 bg-amber-400 hover:bg-amber-500 font-black rounded-xl text-sm px-5 py-3.5 transition-all shadow-lg shadow-amber-400/20 cursor-pointer mt-4"
              >
                Login to Captain Station
              </button>
            </form>
          ) : allTeams.filter(t => t.owner_email).length >= 8 ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2">
              <p className="text-sm font-black text-rose-400">🔒 Captain Registrations Closed</p>
              <p className="text-xs text-slate-400">All 8 Captain seats have already been claimed on a First Come, First Served basis.</p>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block mb-1 font-bold uppercase text-slate-400">Captain / Owner Name *</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Vikram Singh"
                      className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-slate-400">Official Email *</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="captain@titans.com"
                      className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-slate-400">Password *</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                      required
                    />
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-3">
                    <span className="text-amber-400 font-bold uppercase block text-[11px]">Create Franchise / Team Details</span>
                    
                    <div>
                      <label className="block mb-1 font-bold uppercase text-slate-400">Team / Franchise Name *</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. B.Tech Titans"
                        className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-bold uppercase text-slate-400">Department / Branch *</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. B.Tech CSE"
                        className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-bold uppercase text-slate-400">Team Logo</label>
                        <select
                          value={logo}
                          onChange={(e) => setLogo(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl block w-full p-3 outline-none"
                        >
                          {['⚡', '🏏', '🐂', '🦅', '👑', '🗡️', '🛡️', '🐾', '🦁', '🔥'].map(emoji => (
                            <option key={emoji} value={emoji}>{emoji}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 font-bold uppercase text-slate-400">Theme Color</label>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl block w-full h-11 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full text-slate-950 bg-amber-400 hover:bg-amber-500 font-black rounded-xl text-sm px-5 py-3.5 transition-all shadow-lg shadow-amber-400/20 cursor-pointer mt-4"
                  >
                    Register & Enter Station
                  </button>
                </form>
          )}
        </div>
      </div>
    );
  }

  // Active Captain Dashboard & Bidding Station
  const activePlayer = auctionRoomState?.activePlayer;
  const currentBid = auctionRoomState?.currentBid || activePlayer?.base_price || 0;
  const isHighestBidder = auctionRoomState?.highestBidderTeamId === myTeam.id;

  // Render exactly 8 squad slots
  const squadSlots = Array.from({ length: 8 }, (_, idx) => {
    if (idx === 0) {
      return { slotNum: 1, isCaptain: true, player: { name: myTeam.owner_name || 'Captain', role: 'Captain' } };
    }
    const drafted = myTeam.squad?.[idx - 1];
    return { slotNum: idx + 1, isCaptain: false, player: drafted || null };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Franchise HUD Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-amber-400/40 flex items-center justify-center text-4xl shadow-lg">
            {myTeam.logo || '🏏'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">{myTeam.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                {myTeam.department}
              </span>
            </div>
            <p className="text-xs text-slate-400">Captain: <strong className="text-white">{myTeam.owner_name}</strong></p>
          </div>
        </div>

        {/* Budget HUD */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="text-center px-3 border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Purse Leftover</span>
            <div className="text-xl font-black font-mono text-lime-400">{myTeam.leftover_balance} Pts</div>
          </div>
          <div className="text-center px-3 border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Spent</span>
            <div className="text-xl font-black font-mono text-amber-400">{myTeam.spent || 0} Pts</div>
          </div>
          <div className="text-center px-3">
            <span className="text-[10px] uppercase font-bold text-slate-500">Squad Count</span>
            <div className="text-xl font-black font-mono text-white">{myTeam.squad_count || 0} / 8</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all ml-2"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Captain Bidding Station */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-black uppercase text-amber-400 flex items-center gap-2">
            <Crown className="w-5 h-5" /> Live Captain Bidding Station
          </h3>
          {isHighestBidder && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-lime-400 text-slate-950 animate-pulse">
              👑 YOU ARE HIGHEST BIDDER!
            </span>
          )}
        </div>

        {activePlayer ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Active Stage Player */}
            <div className="md:col-span-7 flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-4xl overflow-hidden shrink-0">
                {activePlayer.photo_data ? <img src={activePlayer.photo_data} alt="" className="w-full h-full object-cover" /> : (activePlayer.avatar || '🏏')}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-lime-400">{activePlayer.player_role}</span>
                <h4 className="text-xl font-black text-white">{activePlayer.name || activePlayer.full_name}</h4>
                <p className="text-xs text-slate-400">Roll: {activePlayer.enrollment_no} • Base: {activePlayer.base_price} Pts</p>
              </div>
            </div>

            {/* Incremental Bidding Buttons */}
            <div className="md:col-span-5 space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Current Bid</span>
                <div className="text-3xl font-black font-mono text-lime-400">{currentBid} Pts</div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => handlePlaceBid(inc)}
                    className="py-3 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-slate-950 font-black text-sm shadow-lg shadow-lime-400/20 active:scale-95 transition-all cursor-pointer"
                  >
                    +{inc} Pt
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
            <p className="text-sm font-semibold">Waiting for Admin to send next player to the stage...</p>
          </div>
        )}
      </div>

      {/* 8 Squad Slots Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <h3 className="text-lg font-black uppercase text-white flex items-center justify-between">
          <span>Franchise Roster (8 Player Max Limit)</span>
          <span className="text-xs font-mono text-slate-400">{myTeam.squad_count || 0} / 8 slots filled</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {squadSlots.map((slot) => (
            <div
              key={slot.slotNum}
              className={`p-4 rounded-2xl border transition-all ${
                slot.isCaptain
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : slot.player
                  ? 'bg-slate-950 border-lime-400/40'
                  : 'bg-slate-950/40 border-slate-800 border-dashed text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono font-bold">Slot {slot.slotNum}</span>
                {slot.isCaptain ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">👑 CAPTAIN</span>
                ) : slot.player ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-400/10 text-lime-400 border border-lime-400/20">DRAFTED</span>
                ) : (
                  <span className="text-[10px] text-slate-600">OPEN SLOT</span>
                )}
              </div>

              {slot.player ? (
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm capitalize truncate">{slot.player.name || slot.player.full_name}</p>
                  <p className="text-[11px] text-slate-400">{slot.player.player_role || 'All-Rounder'}</p>
                  {!slot.isCaptain && (
                    <p className="text-[11px] font-mono font-bold text-lime-400">{slot.player.sold_price || slot.player.base_price} Pts</p>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-600">
                  <span>Available in auction</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
