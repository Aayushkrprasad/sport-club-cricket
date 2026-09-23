import React, { useState, useEffect } from 'react';
import { 
  Zap, Lock, Users, Shield, Trophy, Play, Pause, RefreshCw, 
  CheckCircle2, XCircle, Trash2, Edit3, Eye, FileText, Download, 
  Upload, Settings, Plus, DollarSign, Award, Volume2 
} from 'lucide-react';
import { 
  getAllStudents, updateStudentStatus, updateStudentDetails, deleteStudent,
  getAllTeams, updateTeamBudget, updateTeamOwner,
  getActiveAuctionRoomState, setActiveAuctionRoomState, broadcastAuctionEvent,
  exportTournamentCSV
} from '../services/db';
import { playBidTone, playHammerThump, playSoldFanfare } from '../services/audio';

export default function AdminHQ({ onOpenCertViewer }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Admin Sub-Tab
  const [activeTab, setActiveTab] = useState('auction'); // 'auction', 'players', 'teams', 'settings'

  // Data States
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Auction Deck State
  const [auctionRoom, setAuctionRoom] = useState(getActiveAuctionRoomState());
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Edit Player & Team Detail Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('unibox_admin_session');
    if (saved === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated]);

  // Timer loop for active auction bidding
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const loadData = async () => {
    const studentRes = await getAllStudents();
    if (studentRes.data) setStudents(studentRes.data);

    const teamRes = await getAllTeams();
    if (teamRes.data) setTeams(teamRes.data);

    const room = getActiveAuctionRoomState();
    setAuctionRoom(room);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const storedPasscode = localStorage.getItem('unibox_admin_passcode') || 'admin123';
    if (passcode === storedPasscode) {
      setAuthenticated(true);
      localStorage.setItem('unibox_admin_session', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid Admin Passcode. Default is "admin123"');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unibox_admin_session');
    setAuthenticated(false);
  };

  // --- AUCTION CONTROL METHODS ---
  const handleLoadPlayerToStage = () => {
    if (!selectedPlayerId) return;
    const player = students.find(s => s.id === selectedPlayerId || String(s.id) === selectedPlayerId);
    if (!player) return;

    const newRoomState = {
      status: 'BIDDING',
      activePlayer: player,
      currentBid: player.base_price || 15,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      highestBidderLogo: null,
      biddingHistory: []
    };

    setActiveAuctionRoomState(newRoomState);
    setAuctionRoom(newRoomState);
    setTimerSeconds(20);
    setIsTimerRunning(true);
    playBidTone();
    broadcastAuctionEvent({ type: 'PLAYER_STAGE', player });
  };

  const handlePlaceBidOnBehalf = (team) => {
    if (!auctionRoom.activePlayer) {
      alert('No player is currently on stage.');
      return;
    }

    const nextBid = auctionRoom.currentBid + 5;
    const updatedHistory = [
      {
        teamName: team.name,
        teamLogo: team.logo,
        amount: nextBid,
        timestamp: new Date().toLocaleTimeString()
      },
      ...(auctionRoom.biddingHistory || [])
    ];

    const updatedRoom = {
      ...auctionRoom,
      status: 'BIDDING',
      currentBid: nextBid,
      highestBidderTeamId: team.id,
      highestBidderTeamName: team.name,
      highestBidderLogo: team.logo,
      biddingHistory: updatedHistory
    };

    setActiveAuctionRoomState(updatedRoom);
    setAuctionRoom(updatedRoom);
    setTimerSeconds(15);
    setIsTimerRunning(true);
    playBidTone();
    broadcastAuctionEvent({ type: 'NEW_BID', team, amount: nextBid });
  };

  const handleMarkSold = async () => {
    if (!auctionRoom.activePlayer || !auctionRoom.highestBidderTeamId) {
      alert('No valid bid placed to sell this player.');
      return;
    }

    const player = auctionRoom.activePlayer;
    const teamName = auctionRoom.highestBidderTeamName;
    const price = auctionRoom.currentBid;

    await updateStudentStatus(player.id, 'Approved', {
      sold_to_team: teamName,
      sold_price: price,
      auction_status: 'Sold'
    });

    const soldRoomState = {
      ...auctionRoom,
      status: 'SOLD'
    };

    setActiveAuctionRoomState(soldRoomState);
    setAuctionRoom(soldRoomState);
    setIsTimerRunning(false);
    playSoldFanfare();
    playHammerThump();
    broadcastAuctionEvent({ type: 'PLAYER_SOLD', player, teamName, price });
    loadData();
  };

  const handleMarkUnsold = async () => {
    if (!auctionRoom.activePlayer) return;

    const player = auctionRoom.activePlayer;
    await updateStudentStatus(player.id, 'Approved', {
      auction_status: 'Unsold'
    });

    const unsoldState = {
      ...auctionRoom,
      status: 'UNSOLD'
    };

    setActiveAuctionRoomState(unsoldState);
    setAuctionRoom(unsoldState);
    setIsTimerRunning(false);
    broadcastAuctionEvent({ type: 'PLAYER_UNSOLD', player });
    loadData();
  };

  const handleResetAuctionStage = () => {
    const emptyRoom = {
      status: 'IDLE',
      activePlayer: null,
      currentBid: 0,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      highestBidderLogo: null,
      biddingHistory: []
    };
    setActiveAuctionRoomState(emptyRoom);
    setAuctionRoom(emptyRoom);
    setIsTimerRunning(false);
    broadcastAuctionEvent({ type: 'STAGE_RESET' });
  };

  // --- PLAYER APPROVAL & MANAGEMENT ---
  const handleUpdateStatus = async (id, status) => {
    await updateStudentStatus(id, status);
    loadData();
  };

  const handleDeletePlayer = async (id) => {
    if (confirm('Are you sure you want to delete this player?')) {
      await deleteStudent(id);
      loadData();
    }
  };

  // --- FILTERED PLAYERS ---
  const filteredStudents = students.filter(s => {
    const matchesFilter = filterStatus === 'ALL' || s.status === filterStatus;
    const matchesQuery = !searchQuery || 
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.enrollment_no && s.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  const approvedPlayersForAuction = students.filter(s => s.status === 'Approved' && s.auction_status !== 'Sold');

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto text-2xl">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Admin HQ Access</h2>
            <p className="text-xs text-slate-400">Box Cricket Tournament Control Center</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Admin Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 text-center font-mono"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer text-sm"
            >
              Unlock Control Deck ⚡
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Control Bar Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase text-white flex items-center gap-2">
              <span>Admin HQ Control Center</span>
            </h1>
            <p className="text-xs text-slate-400">Live Stage Controller, Player Approvals & Franchise Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'auction' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎙️ Live Auction Deck
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'players' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Players ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'teams' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛡️ Teams ({teams.length})
          </button>
          <button
            onClick={exportTournamentCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-lime-400 bg-lime-400/10 hover:bg-lime-400 hover:text-slate-950 border border-lime-400/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Export CSV Auction & Player Report"
          >
            <Download className="w-3.5 h-3.5" /> CSV Report
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Real-time Summary Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Athletes</span>
          <p className="text-2xl font-black text-white font-mono">{students.length}</p>
          <span className="text-[10px] text-lime-400 font-semibold block">
            {students.filter(s => s.status === 'Approved').length} Approved for Draft
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Franchises</span>
          <p className="text-2xl font-black text-amber-400 font-mono">{teams.length} / 8</p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            {Math.max(0, 8 - teams.length)} Seats Remaining
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drafted / Sold Players</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {students.filter(s => s.auction_status === 'Sold' || Boolean(s.sold_to_team)).length}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            {students.filter(s => s.auction_status === 'Unsold').length} Unsold
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purse Spent</span>
          <p className="text-2xl font-black text-lime-400 font-mono">
            {students.reduce((sum, s) => sum + Number(s.sold_price || 0), 0)} Pts
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">Across All Teams</span>
        </div>
      </div>

      {/* --- SUB-TAB 1: LIVE AUCTION CONTROLLER --- */}
      {activeTab === 'auction' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stage Controller Deck */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                <span>Stage Player Switchboard</span>
              </h2>
              <span className="text-xs font-mono font-bold text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20">
                {approvedPlayersForAuction.length} Approved Available
              </span>
            </div>

            {/* Select Player Dropdown */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Select Approved Player for Auction --</option>
                {approvedPlayersForAuction.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department} - {p.player_role || 'All-Rounder'}) • Base: {p.base_price || 15} Pts
                  </option>
                ))}
              </select>

              <button
                onClick={handleLoadPlayerToStage}
                className="w-full sm:w-auto bg-lime-400 hover:bg-lime-500 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-lime-400/20 shrink-0 cursor-pointer text-sm"
              >
                🚀 Load to Stage
              </button>
            </div>

            {/* Currently Active Stage Card */}
            {auctionRoom.activePlayer ? (
              <div className="bg-slate-950 border-2 border-lime-400/40 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-4xl">
                    {auctionRoom.activePlayer.photo_data ? (
                      <img src={auctionRoom.activePlayer.photo_data} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>🏏</span>
                    )}
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-xs font-bold text-lime-400 uppercase tracking-widest">ON STAGE NOW</span>
                    <h3 className="text-2xl font-black text-white">{auctionRoom.activePlayer.name}</h3>
                    <p className="text-xs text-slate-400">{auctionRoom.activePlayer.department} • Base: {auctionRoom.activePlayer.base_price || 15} Pts</p>
                  </div>

                  <div className="sm:ml-auto text-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-bold block uppercase">Current High Bid</span>
                    <span className="text-3xl font-black font-mono text-lime-400">{auctionRoom.currentBid} Pts</span>
                    {auctionRoom.highestBidderTeamName && (
                      <span className="text-xs text-amber-400 font-bold block mt-1">👑 {auctionRoom.highestBidderTeamName}</span>
                    )}
                  </div>
                </div>

                {/* Auction Action Triggers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={handleMarkSold}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl transition-all cursor-pointer text-sm shadow-lg shadow-emerald-500/20"
                  >
                    🔨 SOLD!
                  </button>
                  <button
                    onClick={handleMarkUnsold}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    ❌ UNSOLD
                  </button>
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    {isTimerRunning ? '⏸️ Pause Timer' : '▶️ Resume Timer'}
                  </button>
                  <button
                    onClick={handleResetAuctionStage}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    🔄 Clear Stage
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                <p className="text-4xl mb-2">🎙️</p>
                <p className="text-sm font-semibold">No player currently on stage.</p>
                <p className="text-xs text-slate-600">Select an approved player above and click "Load to Stage".</p>
              </div>
            )}

            {/* Quick Franchise Bidding Triggers (Admin Proxy Bidding) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Place Bid on Behalf of Franchise (+5 Pts)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handlePlaceBidOnBehalf(t)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-lime-400/50 rounded-xl transition-all text-left flex items-center gap-2 cursor-pointer group"
                  >
                    <span className="text-xl">{t.logo || '🏏'}</span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-lime-400 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Purse: {t.total_budget || 100} Pts</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bidding Log & Timer Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase">Live Countdown Timer</h3>
                <span className="text-xs font-mono font-bold text-amber-400">{isTimerRunning ? 'ACTIVE' : 'PAUSED'}</span>
              </div>

              <div className="text-center py-6 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-6xl font-black font-mono text-lime-400">{timerSeconds}s</span>
              </div>
            </div>

            {/* Recent Bids Feed */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">Recent Bids Feed</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(auctionRoom.biddingHistory || []).length > 0 ? (
                  auctionRoom.biddingHistory.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{item.teamLogo || '🏏'}</span>
                        <span className="font-bold text-slate-200">{item.teamName}</span>
                      </div>
                      <span className="font-bold font-mono text-lime-400">{item.amount} Pts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 text-center py-4">No bids placed in this session yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: PLAYERS MANAGEMENT --- */}
      {activeTab === 'players' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
              {['ALL', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterStatus === st ? 'bg-lime-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by name, roll no, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Role & Base</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Cert</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-bold">
                          {s.photo_data ? <img src={s.photo_data} alt="" className="w-full h-full object-cover" /> : '🏏'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{s.enrollment_no || s.email}</p>
                        </div>
                      </td>
                      <td className="p-3 font-semibold">{s.department || '---'}</td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-lime-400">{s.player_role || 'All-Rounder'}</span>
                        <span className="block text-[10px] text-slate-500">{s.base_price || 15} Pts</span>
                      </td>
                      <td className="p-3">
                        {s.status === 'Approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                            Approved
                          </span>
                        ) : s.status === 'Rejected' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-400/10 text-rose-400 border border-rose-400/30">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.certificate_data ? (
                          <button
                            onClick={() => onOpenCertViewer(s.certificate_name, s.certificate_data)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-lime-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> View
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {s.status !== 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'Approved')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold transition-all cursor-pointer"
                            title="Approve"
                          >
                            ✓
                          </button>
                        )}
                        {s.status !== 'Rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'Rejected')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold transition-all cursor-pointer"
                            title="Reject"
                          >
                            ✕
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePlayer(s.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No registered players found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 3: TEAMS & SQUAD DETAILS --- */}
      {activeTab === 'teams' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase">University Franchises & Squad Roster</h2>
              <p className="text-xs text-slate-400">Click on any franchise team to inspect full player roster, stats, and registration history.</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              {teams.length} / 8 Registered Teams
            </span>
          </div>

          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map(t => {
                const teamSquad = students.filter(
                  s => (s.sold_to_team_id === t.id) || (s.sold_to_team && s.sold_to_team.toLowerCase() === t.name.toLowerCase())
                );
                const spent = teamSquad.reduce((acc, p) => acc + Number(p.sold_price || p.base_price || 0), 0);
                const leftover = (t.total_budget || 100) - spent;

                return (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-md transition-all">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800">{t.logo || '🏏'}</span>
                        <div className="truncate">
                          <h3 className="font-bold text-white text-sm truncate">{t.name}</h3>
                          <span className="text-[10px] text-slate-400">{t.department} Dept</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-400">Purse Left:</span>
                          <span className="font-mono text-lime-400">{leftover} / {t.total_budget || 100} Pts</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Spent: {spent} Pts</span>
                          <span>Squad: {teamSquad.length} / 10</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>Captain: <span className="text-slate-200 font-semibold">{t.owner_name || 'Unassigned'}</span></p>
                        <p className="truncate text-[10px] text-slate-500 font-mono">{t.owner_email || 'No email'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTeamForDetails({ ...t, squad: teamSquad, spent, leftover })}
                      className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-lime-400 border border-lime-400/30 hover:border-lime-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🔍 Inspect Squad ({teamSquad.length})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-3xl mb-2">👑</p>
              <p className="text-sm font-semibold">No franchise teams registered yet.</p>
              <p className="text-xs text-slate-600">Team captains can register their franchise via the Captain Station.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TEAM DETAILS & PLAYER HISTORY MODAL --- */}
      {selectedTeamForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-4">
                <span className="text-4xl p-2.5 bg-slate-900 rounded-2xl border border-slate-800">
                  {selectedTeamForDetails.logo || '🏏'}
                </span>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedTeamForDetails.name}</h3>
                  <p className="text-xs text-slate-400">
                    Department: {selectedTeamForDetails.department} • Captain: <span className="text-lime-400 font-bold">{selectedTeamForDetails.owner_name}</span> ({selectedTeamForDetails.owner_email})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamForDetails(null)}
                className="text-slate-400 hover:text-white rounded-xl text-sm w-9 h-9 inline-flex justify-center items-center hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Budget Purse Banner */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Budget</span>
                  <span className="text-lg font-black font-mono text-white">{selectedTeamForDetails.total_budget || 100} Pts</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Spent</span>
                  <span className="text-lg font-black font-mono text-amber-400">{selectedTeamForDetails.spent} Pts</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Purse Left</span>
                  <span className="text-lg font-black font-mono text-lime-400">{selectedTeamForDetails.leftover} Pts</span>
                </div>
              </div>

              {/* Drafted Players Detailed List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                  Drafted Player Roster ({selectedTeamForDetails.squad?.length || 0} / 10 Max)
                </h4>

                {selectedTeamForDetails.squad && selectedTeamForDetails.squad.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTeamForDetails.squad.map((player, idx) => (
                      <div key={player.id || idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                        <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-2xl font-bold">
                          {player.photo_data ? (
                            <img src={player.photo_data} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>🏏</span>
                          )}
                        </div>

                        <div className="space-y-1 flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-white text-sm capitalize">{player.name}</h5>
                            <span className="font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">
                              {player.sold_price || player.base_price || 15} Pts
                            </span>
                          </div>

                          <p className="text-slate-400 text-[11px] font-mono">{player.enrollment_no || player.email}</p>
                          <p className="text-lime-400 font-semibold">{player.player_role || 'All-Rounder'} • {player.department}</p>
                          
                          <p className="text-slate-500 text-[10px]">
                            Style: {player.batting_style || 'Right Hand Batter'} / {player.bowling_style || 'Right Arm Fast'}
                          </p>

                          {player.certificate_data && (
                            <button
                              onClick={() => onOpenCertViewer(player.certificate_name, player.certificate_data)}
                              className="mt-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-slate-800"
                            >
                              📜 View Sports Cert
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-2xl mb-1">🏏</p>
                    <p className="text-xs font-semibold">No players drafted into this squad yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedTeamForDetails(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Squad Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
