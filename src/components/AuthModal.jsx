import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Check, Lock } from 'lucide-react';
import { getPlayerByEmail, hashPassword, savePlayer, getDefaultBasePriceForRole, getRegistrationStatus } from '../services/db';

export default function AuthModal({ isOpen, initialTab, onClose, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'login');
  const [regStatus, setRegStatus] = useState({ captainsCount: 0, isPlayerRegistrationOpen: false });

  useEffect(() => {
    if (isOpen) {
      getRegistrationStatus().then(res => setRegStatus(res));
    }
  }, [isOpen]);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Signup State
  const [name, setName] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [department, setDepartment] = useState('B.Tech');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('Male');
  const [playerRole, setPlayerRole] = useState('All-Rounder');
  const [battingStyle, setBattingStyle] = useState('Right Hand Batter');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [selectedAvatar, setSelectedAvatar] = useState('🏏');
  const [photoData, setPhotoData] = useState(null);
  const [customBasePrice, setCustomBasePrice] = useState('');
  const [certName, setCertName] = useState('');
  const [certData, setCertData] = useState(null);
  const [signupError, setSignupError] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoData(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCertUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCertData(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const { data: dbPlayer } = await getPlayerByEmail(loginEmail);
      if (!dbPlayer) {
        setLoginError('No registered athlete found with this email. Please sign up first.');
        return;
      }

      if (dbPlayer.password_hash) {
        const inputHash = await hashPassword(loginPassword);
        if (dbPlayer.password_hash !== inputHash) {
          setLoginError('Incorrect password. Please verify credentials.');
          return;
        }
      }

      onAuthSuccess(dbPlayer, staySignedIn);
      onClose();
    } catch (err) {
      setLoginError('Authentication failed. Please try again.');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (!name || !enrollmentNo || !email || !password) {
      setSignupError('Please fill in all required fields (*)');
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const roleDefault = getDefaultBasePriceForRole(playerRole);
      const resolvedBase = Number(customBasePrice) > 0 ? Number(customBasePrice) : roleDefault;

      const playerData = {
        name: name.trim(),
        enrollment_no: enrollmentNo.trim(),
        department,
        email: email.trim(),
        gender,
        player_role: playerRole,
        batting_style: battingStyle,
        bowling_style: bowlingStyle,
        avatar: selectedAvatar,
        photo_data: photoData,
        base_price: resolvedBase,
        certificate_name: certName ? `📎 ${certName}` : 'None attached',
        certificate_data: certData,
        password_hash: passwordHash,
        status: 'Registered',
        auction_status: 'Upcoming'
      };

      const result = await savePlayer(playerData);
      onAuthSuccess(result.data, true);
      onClose();
    } catch (err) {
      setSignupError('Registration failed. Athlete with this email or enrollment may already exist.');
    }
  };

  const avatars = ['🏏', '⚡', '🎯', '👑', '🧢', '🌟', '🦁', '🦅'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Close Cross */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5">
          <button
            onClick={() => setActiveTab('login')}
            className={`w-1/2 py-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'text-lime-400 bg-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`w-1/2 py-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'text-lime-400 bg-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up (Registration)
          </button>
        </div>

        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {activeTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  ⚠️ {loginError}
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase text-slate-400">Email ID</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-3 outline-none"
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
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-3 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staySignedIn}
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-lime-400 focus:ring-lime-400"
                  />
                  <span className="ms-2">Stay signed in</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full text-slate-950 bg-lime-400 hover:bg-lime-500 font-bold rounded-xl text-sm px-5 py-3.5 transition-all shadow-lg shadow-lime-400/10 mt-2 cursor-pointer"
              >
                Login
              </button>
            </form>
          ) : !regStatus.isPlayerRegistrationOpen ? (
            <div className="p-6 bg-slate-950 border border-amber-500/30 rounded-2xl text-center space-y-4 my-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center mx-auto text-2xl font-bold">
                ⏳
              </div>
              <div>
                <h3 className="text-lg font-black text-amber-400 uppercase">Player Registration Locked</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Student player registration will open automatically once at least 5 Team Captains register!
                </p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-lime-400 font-bold space-y-1">
                <div>Captains Registered: {regStatus.captainsCount} / 5 Minimum Required</div>
                <div className="text-[10px] text-amber-400 font-normal">
                  ({Math.max(0, 5 - regStatus.captainsCount)} more Captain{Math.max(0, 5 - regStatus.captainsCount) === 1 ? '' : 's'} needed to unlock Player Registration)
                </div>
              </div>
            </div>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {signupError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  ⚠️ {signupError}
                </div>
              )}

              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-2.5 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">Enrollment / Roll No *</label>
                <input
                  type="text"
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="2026BTECH089"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-2.5 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Branch / Dept *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl focus:ring-2 focus:ring-lime-400/20 block w-full p-2.5 outline-none"
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="BCA">BCA</option>
                    <option value="BBA">BBA</option>
                    <option value="MCA">MCA</option>
                    <option value="MBA">MBA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Ph.D">Ph.D</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl focus:ring-2 focus:ring-lime-400/20 block w-full p-2.5 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">Email ID *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-2.5 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">Create Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 block w-full p-2.5 outline-none"
                  required
                />
              </div>

              {/* Photo Upload & Avatar Picker */}
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase text-slate-400">Player Face Photo Display</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl overflow-hidden shrink-0">
                      {photoData ? <img src={photoData} alt="Preview" className="w-full h-full object-cover" /> : selectedAvatar}
                    </div>
                    <label className="flex-1 flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-lime-400/40">
                      <span className="text-xs text-slate-300 font-medium">Upload Face Photo</span>
                      <Camera className="w-4 h-4 text-lime-400" />
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="grid grid-cols-8 gap-1">
                    {avatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`p-1.5 rounded-lg border text-sm transition-all ${
                          selectedAvatar === av ? 'bg-lime-400/20 border-lime-400' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Role & Styles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Role</label>
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl block w-full p-2.5 outline-none"
                  >
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Batter">Batter</option>
                    <option value="Bowler">Bowler</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Starting Bid Base (Pts)</label>
                  <input
                    type="number"
                    value={customBasePrice}
                    onChange={(e) => setCustomBasePrice(e.target.value)}
                    placeholder={`Role auto: ${getDefaultBasePriceForRole(playerRole)}`}
                    className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl block w-full p-2.5 outline-none"
                  />
                </div>
              </div>

              {/* Certificate Upload */}
              <div>
                <label className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Sports Certificate (Optional)</label>
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer">
                  <span className="text-xs text-slate-300 truncate">{certName ? `📎 ${certName}` : 'Upload Proof / PDF'}</span>
                  <Upload className="w-4 h-4 text-lime-400" />
                  <input type="file" accept="image/*,.pdf" onChange={handleCertUpload} className="hidden" />
                </label>
              </div>

              <button
                type="submit"
                className="w-full text-slate-950 bg-lime-400 hover:bg-lime-500 font-bold rounded-xl text-sm px-5 py-3.5 transition-all shadow-lg shadow-lime-400/10 cursor-pointer mt-2"
              >
                Register & Enter Portal
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
