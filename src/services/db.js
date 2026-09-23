// Central Database & Realtime Auction Management Service
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://mhlhzfzxvlshmbcwtvkt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HVAXt2IGvOtqZhruw2qY1g_Ttzirbuk';

const cleanUrl = (SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const isSupabaseConfigured = Boolean(
  cleanUrl &&
  cleanUrl !== 'YOUR_SUPABASE_PROJECT_URL' &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  SUPABASE_ANON_KEY.startsWith('eyJ') // Must be valid JWT
);

let supabaseClient = null;
try {
  if (isSupabaseConfigured) {
    supabaseClient = createClient(cleanUrl, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase client init warning:', e);
}

// Default Franchises Array (Captains dynamically create their own teams)
export const DEFAULT_TEAMS = [];

export const DEFAULT_ROLE_BASE_PRICES = {
  'Batter': 20,
  'Batsman': 20,
  'Bowler': 5,
  'All-Rounder': 15,
  'Wicketkeeper': 10,
  'Fielder': 5
};

// Realtime BroadcastChannel
const broadcastChannel = (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('unibox_auction_sync')
  : null;

export function broadcastAuctionEvent(event) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('unibox_auction_update', { detail: event }));
  }
}

export function subscribeToAuctionUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e) => callback(e.detail);
  const handleBcMessage = (e) => callback(e.data);
  const handleStorageEvent = (e) => {
    if (e.key && e.key.startsWith('unibox_')) {
      callback({ type: 'STORAGE_CHANGE', key: e.key });
    }
  };

  window.addEventListener('unibox_auction_update', handleCustomEvent);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBcMessage);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('unibox_auction_update', handleCustomEvent);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBcMessage);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// Password Hashing (Salted SHA-256 via native Web Crypto API)
export async function hashPassword(password) {
  if (!password) return '';
  try {
    const salt = 'unibox_league_2026_salt_';
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return password;
  }
}

export function getDefaultBasePriceForRole(role) {
  if (!role) return 15;
  const normalized = String(role).trim().toLowerCase();
  if (normalized.includes('bat')) return 20;
  if (normalized.includes('bowl')) return 5;
  if (normalized.includes('keeper') || normalized.includes('wk')) return 10;
  if (normalized.includes('field')) return 5;
  return 15;
}

// Teams & Squads
export async function getAllTeams() {
  let teams = [];
  try {
    const stored = localStorage.getItem('unibox_teams');
    if (stored) teams = JSON.parse(stored);
  } catch (e) {}

  // Filter out any legacy vacant dummy teams without a registered captain
  teams = (teams || []).filter(t => t.owner_email && t.owner_email.trim().length > 0);
  localStorage.setItem('unibox_teams', JSON.stringify(teams));

  // Attempt Supabase fetch
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('teams').select('*').order('name');
      if (!error && Array.isArray(data) && data.length > 0) {
        const localTeams = JSON.parse(localStorage.getItem('unibox_teams') || '[]');
        teams = data.map(t => {
          const localMatch = localTeams.find(lt => lt.id === t.id);
          return {
            id: t.id,
            name: t.name,
            department: t.department,
            logo: t.logo || '🏏',
            color: t.color || '#a3e635',
            total_budget: Number(t.total_budget) || 100,
            owner_name: t.owner_name || localMatch?.owner_name || null,
            owner_email: t.owner_email || localMatch?.owner_email || null,
            password_hash: t.password_hash || localMatch?.password_hash || null,
            status: t.status || 'Active'
          };
        });
        localStorage.setItem('unibox_teams', JSON.stringify(teams));
      }
    } catch (e) {}
  }

  // Enrich with squad & spent balance
  const { data: players } = await getAllPlayers();
  const enriched = teams.map(team => {
    const teamName = (team.name || '').trim().toLowerCase();
    const teamId = (team.id || '').trim().toLowerCase();

    const teamSquad = (players || []).filter(p => {
      const soldTeam = (p.sold_to_team || '').trim().toLowerCase();
      const soldTeamId = (p.sold_to_team_id || '').trim().toLowerCase();
      return (soldTeam && (soldTeam === teamName || soldTeam === teamId)) ||
             (soldTeamId && (soldTeamId === teamId || soldTeamId === teamName));
    });

    const spent = teamSquad.reduce((sum, p) => sum + (Number(p.sold_price) || 0), 0);
    const totalBudget = Number(team.total_budget) || 100;
    const leftover = Math.max(0, totalBudget - spent);

    return {
      ...team,
      total_budget: totalBudget,
      spent: spent,
      leftover_balance: leftover,
      squad: teamSquad,
      squad_count: teamSquad.length
    };
  });

  return { data: enriched, error: null };
}

// Players
export async function getAllPlayers() {
  let players = [];
  try {
    const stored = localStorage.getItem('unibox_players');
    if (stored) players = JSON.parse(stored);
  } catch (e) {}

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('players').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        players = data;
      }
    } catch (e) {}
  }

  const auctionCache = JSON.parse(localStorage.getItem('unibox_auction_players_cache') || '{}');
  const enriched = players.map(p => {
    const id = p.id || p.email;
    const cached = auctionCache[id] || auctionCache[p.email] || {};
    const defaultPrice = getDefaultBasePriceForRole(p.player_role);

    return {
      ...p,
      name: p.full_name || p.name,
      base_price: (p.base_price !== undefined && p.base_price !== null && p.base_price !== '')
        ? Number(p.base_price)
        : (cached.base_price !== undefined ? Number(cached.base_price) : defaultPrice),
      sold_price: (p.sold_price !== undefined && p.sold_price !== null)
        ? Number(p.sold_price)
        : (cached.sold_price !== undefined ? Number(cached.sold_price) : null),
      sold_to_team: cached.sold_to_team || p.sold_to_team || null,
      sold_to_team_id: cached.sold_to_team_id || p.sold_to_team_id || null,
      auction_status: (cached.sold_to_team || p.sold_to_team) ? 'Sold' : (cached.auction_status || p.auction_status || 'Upcoming')
    };
  });

  return { data: enriched, error: null };
}

export async function getPlayerByEmail(email) {
  if (!email) return { data: null, error: 'Email required' };
  const lowerEmail = email.trim().toLowerCase();
  const { data: all } = await getAllPlayers();
  const player = (all || []).find(p => p.email && p.email.toLowerCase() === lowerEmail);
  return { data: player || null, error: null };
}

export async function savePlayer(playerData) {
  const roleBase = getDefaultBasePriceForRole(playerData.player_role);
  const resolvedBase = playerData.base_price !== undefined ? Number(playerData.base_price) : roleBase;

  const record = {
    ...playerData,
    id: playerData.id || 'player_' + Date.now(),
    base_price: resolvedBase,
    auction_status: playerData.auction_status || 'Upcoming',
    status: playerData.status || 'Registered'
  };

  const localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  const idx = localPlayers.findIndex(p => p.email?.toLowerCase() === record.email?.toLowerCase() || p.enrollment_no === record.enrollment_no);
  if (idx >= 0) {
    localPlayers[idx] = { ...localPlayers[idx], ...record };
  } else {
    localPlayers.push(record);
  }
  localStorage.setItem('unibox_players', JSON.stringify(localPlayers));

  if (supabaseClient) {
    try {
      const payload = {
        full_name: playerData.name,
        enrollment_no: playerData.enrollment_no,
        department: playerData.department,
        email: playerData.email,
        gender: playerData.gender,
        player_role: playerData.player_role,
        photo_data: playerData.photo_data || null,
        certificate_name: playerData.certificate_name || playerData.certificate || null,
        certificate_data: playerData.certificate_data || null,
        password_hash: playerData.password_hash || null,
        base_price: resolvedBase,
        auction_status: 'Upcoming',
        status: 'Registered'
      };
      await supabaseClient.from('players').upsert([payload], { onConflict: 'email' });
    } catch (e) {}
  }

  broadcastAuctionEvent({ type: 'PLAYER_REGISTERED', player: record });
  return { data: record, error: null };
}

export async function updatePlayerStatus(emailOrId, status) {
  const localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  const idx = localPlayers.findIndex(p => p.id === emailOrId || p.email === emailOrId);
  if (idx >= 0) {
    localPlayers[idx].status = status;
    localStorage.setItem('unibox_players', JSON.stringify(localPlayers));
  }

  if (supabaseClient) {
    try {
      const field = typeof emailOrId === 'string' && emailOrId.includes('@') ? 'email' : 'id';
      await supabaseClient.from('players').update({ status }).eq(field, emailOrId);
    } catch (e) {}
  }

  broadcastAuctionEvent({ type: 'PLAYER_STATUS_UPDATED', playerId: emailOrId, status });
  return { success: true };
}

// Live Auction Stage Management
export function getActiveAuctionRoomState() {
  try {
    const stored = localStorage.getItem('unibox_live_auction_room_state');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return {
    activePlayer: null,
    currentBid: 0,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    highestBidderLogo: null,
    highestBidderOwner: null,
    status: 'IDLE',
    biddingHistory: [],
    lastUpdate: Date.now()
  };
}

export function setActiveAuctionRoomState(state) {
  const payload = { ...state, lastUpdate: Date.now() };
  localStorage.setItem('unibox_live_auction_room_state', JSON.stringify(payload));
  broadcastAuctionEvent({ type: 'AUCTION_ROOM_STATE_UPDATED', state: payload });
  return payload;
}

export async function purchasePlayer({ playerIdOrEmail, teamId, soldPrice }) {
  const numPrice = Number(soldPrice);
  if (isNaN(numPrice) || numPrice <= 0) {
    throw new Error('Please enter a valid purchase price.');
  }

  const { data: teams } = await getAllTeams();
  const targetTeam = teams.find(t => t.id === teamId || t.name === teamId);
  if (!targetTeam) throw new Error('Target team not found.');

  if (numPrice > targetTeam.leftover_balance) {
    throw new Error(`Insufficient budget! ${targetTeam.name} has only ${targetTeam.leftover_balance} Points remaining.`);
  }

  const currentSquadSize = targetTeam.squad_count || (targetTeam.squad ? targetTeam.squad.length : 0);
  if (currentSquadSize >= 8) {
    throw new Error(`Squad Full! ${targetTeam.name} already has the maximum capacity of 8 players.`);
  }

  // Update auction cache
  const auctionCache = JSON.parse(localStorage.getItem('unibox_auction_players_cache') || '{}');
  if (!auctionCache[playerIdOrEmail]) auctionCache[playerIdOrEmail] = {};
  auctionCache[playerIdOrEmail].sold_price = numPrice;
  auctionCache[playerIdOrEmail].sold_to_team = targetTeam.name;
  auctionCache[playerIdOrEmail].sold_to_team_id = targetTeam.id;
  auctionCache[playerIdOrEmail].auction_status = 'Sold';
  localStorage.setItem('unibox_auction_players_cache', JSON.stringify(auctionCache));

  // Update local players
  const localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  const pIdx = localPlayers.findIndex(p => p.id === playerIdOrEmail || p.email === playerIdOrEmail);
  if (pIdx >= 0) {
    localPlayers[pIdx].sold_price = numPrice;
    localPlayers[pIdx].sold_to_team = targetTeam.name;
    localPlayers[pIdx].sold_to_team_id = targetTeam.id;
    localPlayers[pIdx].auction_status = 'Sold';
    localPlayers[pIdx].status = 'Approved';
    localStorage.setItem('unibox_players', JSON.stringify(localPlayers));
  }

  if (supabaseClient) {
    try {
      const field = typeof playerIdOrEmail === 'string' && playerIdOrEmail.includes('@') ? 'email' : 'id';
      await supabaseClient.from('players').update({
        sold_price: numPrice,
        sold_to_team: targetTeam.name,
        auction_status: 'Sold',
        status: 'Approved'
      }).eq(field, playerIdOrEmail);
    } catch (e) {}
  }

  broadcastAuctionEvent({
    type: 'PLAYER_PURCHASED',
    playerId: playerIdOrEmail,
    teamId: targetTeam.id,
    teamName: targetTeam.name,
    soldPrice: numPrice
  });

  return { success: true };
}

export async function getRegistrationStatus() {
  const { data: teams } = await getAllTeams();
  const captainsCount = (teams || []).filter(t => t.owner_email).length;
  const maxCaptains = 8;
  const minCaptainsForPlayerReg = 5;
  const remainingCaptainSeats = Math.max(0, maxCaptains - captainsCount);
  const isPlayerRegistrationOpen = captainsCount >= minCaptainsForPlayerReg;

  return {
    captainsCount,
    maxCaptains,
    minCaptainsForPlayerReg,
    remainingCaptainSeats,
    isPlayerRegistrationOpen
  };
}

// Franchise Owner Auth & Custom Team Registration
export async function registerTeamOwner(ownerData) {
  const { ownerName, email, password, teamName, department, logo, color } = ownerData;
  if (!ownerName || !email || !password || !teamName || !department) {
    return { success: false, error: 'Captain name, email, password, team name, and department are required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const { data: currentTeams } = await getAllTeams();

  if (currentTeams.length >= 8) {
    return { success: false, error: 'Registration Closed! All 8 Captain positions have already been registered.' };
  }

  const emailExists = currentTeams.some(t => t.owner_email && t.owner_email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    return { success: false, error: 'A captain is already registered with this email address.' };
  }

  const nameExists = currentTeams.some(t => t.name && t.name.toLowerCase() === teamName.trim().toLowerCase());
  if (nameExists) {
    return { success: false, error: 'A team with this name is already registered.' };
  }

  const slug = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const targetTeam = {
    id: `team-${slug}-${Date.now().toString().slice(-4)}`,
    name: teamName.trim(),
    department: department.trim(),
    logo: logo || '🏆',
    color: color || '#a3e635',
    total_budget: 100,
    owner_name: ownerName.trim(),
    owner_email: normalizedEmail,
    password_hash: passwordHash,
    status: 'Active'
  };

  currentTeams.push(targetTeam);
  localStorage.setItem('unibox_teams', JSON.stringify(currentTeams));

  const sessionData = {
    email: normalizedEmail,
    ownerName: targetTeam.owner_name,
    teamId: targetTeam.id,
    teamName: targetTeam.name,
    timestamp: Date.now()
  };
  localStorage.setItem('unibox_team_owner_session', JSON.stringify(sessionData));

  broadcastAuctionEvent({ type: 'TEAM_OWNER_REGISTERED', team: targetTeam });
  return { success: true, team: targetTeam };
}

export async function loginTeamOwner(email, password) {
  if (!email || !password) return { success: false, error: 'Email and password required.' };
  const normalized = email.trim().toLowerCase();
  const inputHash = await hashPassword(password);

  const { data: teams } = await getAllTeams();
  let team = teams.find(t => t.owner_email && t.owner_email.toLowerCase() === normalized);

  if (!team) {
    return { success: false, error: 'No franchise owner found with this email. Please register first.' };
  }

  if (team.password_hash && team.password_hash !== inputHash) {
    return { success: false, error: 'Incorrect password credentials.' };
  }

  const sessionData = {
    email: normalized,
    ownerName: team.owner_name || 'Franchise Owner',
    teamId: team.id,
    teamName: team.name,
    timestamp: Date.now()
  };
  localStorage.setItem('unibox_team_owner_session', JSON.stringify(sessionData));
  return { success: true, team };
}

// Admin Coordinator Auth
export async function adminLogin(identifier, password) {
  const inputHash = await hashPassword(password);
  const trimmed = (identifier || '').trim();

  const defaultHash = '62b2af84c3dec37c356a9374133e2f141e9e3ba6209f5d6ac58d9d2ab8095163';
  if ((trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'admin@unibox.com') && (inputHash === defaultHash || password === 'aayush2410')) {
    return {
      success: true,
      admin: { username: 'admin', email: 'admin@unibox.com', role: 'Lead Coordinator' }
    };
  }
  return { success: false, error: 'Invalid coordinator username or password.' };
}

// React App Helper Aliases & Administration Functions
export async function getAllStudents() {
  return getAllPlayers();
}

export async function updateStudentStatus(id, status, extraData = {}) {
  const localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  const idx = localPlayers.findIndex(p => p.id === id || p.email === id);
  if (idx >= 0) {
    localPlayers[idx].status = status;
    if (extraData.sold_to_team) localPlayers[idx].sold_to_team = extraData.sold_to_team;
    if (extraData.sold_price) localPlayers[idx].sold_price = extraData.sold_price;
    if (extraData.auction_status) localPlayers[idx].auction_status = extraData.auction_status;
    localStorage.setItem('unibox_players', JSON.stringify(localPlayers));
  }
  if (supabaseClient) {
    try {
      const field = typeof id === 'string' && id.includes('@') ? 'email' : 'id';
      await supabaseClient.from('players').update({ status, ...extraData }).eq(field, id);
    } catch (e) {}
  }
  broadcastAuctionEvent({ type: 'PLAYER_STATUS_UPDATED', playerId: id, status });
  return { success: true };
}

export async function updateStudentDetails(id, details) {
  const localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  const idx = localPlayers.findIndex(p => p.id === id || p.email === id);
  if (idx >= 0) {
    localPlayers[idx] = { ...localPlayers[idx], ...details };
    localStorage.setItem('unibox_players', JSON.stringify(localPlayers));
  }
  return { success: true };
}

export async function deleteStudent(id) {
  let localPlayers = JSON.parse(localStorage.getItem('unibox_players') || '[]');
  localPlayers = localPlayers.filter(p => p.id !== id && p.email !== id);
  localStorage.setItem('unibox_players', JSON.stringify(localPlayers));
  if (supabaseClient) {
    try {
      const field = typeof id === 'string' && id.includes('@') ? 'email' : 'id';
      await supabaseClient.from('players').delete().eq(field, id);
    } catch (e) {}
  }
  broadcastAuctionEvent({ type: 'PLAYER_DELETED', playerId: id });
  return { success: true };
}

export async function updateTeamBudget(teamId, totalBudget) {
  const { data: teams } = await getAllTeams();
  const idx = teams.findIndex(t => t.id === teamId);
  if (idx >= 0) {
    teams[idx].total_budget = Number(totalBudget);
    localStorage.setItem('unibox_teams', JSON.stringify(teams));
  }
  return { success: true };
}

export async function updateTeamOwner(teamId, ownerEmail, ownerName) {
  const { data: teams } = await getAllTeams();
  const idx = teams.findIndex(t => t.id === teamId);
  if (idx >= 0) {
    teams[idx].owner_email = ownerEmail;
    teams[idx].owner_name = ownerName;
    localStorage.setItem('unibox_teams', JSON.stringify(teams));
  }
  return { success: true };
}

export async function exportTournamentCSV() {
  const { data: players } = await getAllPlayers();

  const headers = [
    'Player Name',
    'Enrollment No',
    'Department',
    'Gender',
    'Role',
    'Batting Style',
    'Bowling Style',
    'Base Price (Pts)',
    'Approval Status',
    'Auction Status',
    'Sold To Team',
    'Sold Price (Pts)'
  ];

  const rows = (players || []).map(p => [
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.enrollment_no || '').replace(/"/g, '""')}"`,
    `"${(p.department || '').replace(/"/g, '""')}"`,
    `"${(p.gender || '').replace(/"/g, '""')}"`,
    `"${(p.player_role || '').replace(/"/g, '""')}"`,
    `"${(p.batting_style || '').replace(/"/g, '""')}"`,
    `"${(p.bowling_style || '').replace(/"/g, '""')}"`,
    p.base_price || 15,
    `"${p.status || 'Registered'}"`,
    `"${p.auction_status || 'Upcoming'}"`,
    `"${(p.sold_to_team || 'N/A').replace(/"/g, '""')}"`,
    p.sold_price || '0'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `unibox_auction_report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

