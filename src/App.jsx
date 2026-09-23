import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LiveAuctionStadium from './components/LiveAuctionStadium';
import CaptainPortal from './components/CaptainPortal';
import PlayerDashboard from './components/PlayerDashboard';
import TeamSquadsRoster from './components/TeamSquadsRoster';
import AdminHQ from './components/AdminHQ';
import AuthModal from './components/AuthModal';
import RulesModal from './components/RulesModal';
import CertViewerModal from './components/CertViewerModal';
import { getActiveAuctionRoomState, subscribeToAuctionUpdates } from './services/db';

export default function App() {
  const [currentView, setCurrentView] = useState('stadium'); // 'stadium', 'squads', 'dashboard', 'captain', 'admin'
  
  // Realtime Auction State
  const [auctionRoomState, setAuctionRoomState] = useState(getActiveAuctionRoomState());

  // Active Student Session
  const [activeStudent, setActiveStudent] = useState(null);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certModalName, setCertModalName] = useState('');
  const [certModalData, setCertModalData] = useState('');

  // Session sync & Realtime listener
  useEffect(() => {
    // Restore student session
    const savedStudent = localStorage.getItem('unibox_student_session');
    if (savedStudent) {
      try {
        setActiveStudent(JSON.parse(savedStudent));
      } catch (e) {}
    }

    // Subscribe to realtime auction events
    const unsubscribe = subscribeToAuctionUpdates(() => {
      const updated = getActiveAuctionRoomState();
      setAuctionRoomState(updated);
    });

    return () => unsubscribe();
  }, []);

  // Global Shortcut Listener for Secret Admin Portal (Ctrl + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setCurrentView('admin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleOpenRulesModal = () => {
    setIsRulesModalOpen(true);
  };

  const handleCloseRulesModal = () => {
    setIsRulesModalOpen(false);
  };

  const handleOpenCertViewer = (name, data) => {
    setCertModalName(name);
    setCertModalData(data);
    setIsCertModalOpen(true);
  };

  const handleCloseCertViewer = () => {
    setIsCertModalOpen(false);
  };

  const handleStudentLoginSuccess = (studentData) => {
    setActiveStudent(studentData);
    localStorage.setItem('unibox_student_session', JSON.stringify(studentData));
    setIsAuthModalOpen(false);
    setCurrentView('dashboard');
  };

  const handleLogoutStudent = () => {
    localStorage.removeItem('unibox_student_session');
    setActiveStudent(null);
    setCurrentView('stadium');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased selection:bg-lime-400 selection:text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* Ambient Stadium Light Gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-lime-500/10 blur-[120px]"></div>
        <div className="absolute top-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px]"></div>
      </div>

      {/* Main Top Header Navigation */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeStudent={activeStudent}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenRulesModal={handleOpenRulesModal}
        onLogoutStudent={handleLogoutStudent}
      />

      {/* Main Application Body */}
      <main className="flex-1">
        {currentView === 'stadium' && (
          <LiveAuctionStadium
            auctionRoomState={auctionRoomState}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenCaptainPortal={() => setCurrentView('captain')}
          />
        )}

        {currentView === 'squads' && (
          <TeamSquadsRoster />
        )}

        {currentView === 'captain' && (
          <CaptainPortal auctionRoomState={auctionRoomState} />
        )}

        {currentView === 'admin' && (
          <AdminHQ onOpenCertViewer={handleOpenCertViewer} />
        )}

        {currentView === 'dashboard' && (
          <PlayerDashboard
            student={activeStudent}
            onOpenCertViewer={handleOpenCertViewer}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 backdrop-blur-md py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 UniBox Box Cricket League. All rights reserved.</p>
        </div>
      </footer>

      {/* Global Overlays & Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        initialTab={authModalTab}
        onSuccess={handleStudentLoginSuccess}
      />

      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={handleCloseRulesModal}
      />

      <CertViewerModal
        isOpen={isCertModalOpen}
        onClose={handleCloseCertViewer}
        certName={certModalName}
        certData={certModalData}
      />
    </div>
  );
}
