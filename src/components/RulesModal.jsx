import React from 'react';
import { X, BookOpen } from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase">Tournament Rules & Guidelines</h3>
              <p className="text-xs text-slate-400">Official Sunstone Premier League Code of Conduct</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-lime-400 mb-1">1. Squad Composition & Overs</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Each squad fields 7 active players with up to 2 rolling substitutes. Matches are played over 6 overs per side, with a 2-over bowling cap per bowler.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-lime-400 mb-1">2. Box Boundaries & Scoring</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Direct hit on the back boundary wall without bouncing = 6 runs. Grounded hit on the back wall = 4 runs. Ball hitting side nets requires running between wickets.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-lime-400 mb-1">3. Dismissal Guidelines</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Bowled, Caught, Run-out, and Stumped apply. No LBW. One-hand, one-bounce catches off nets or walls count as Out.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-lime-400 mb-1">4. Campus ID & Fair Play</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Valid university ID verification is required prior to toss. The umpire's on-field decision is final.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="bg-lime-400 hover:bg-lime-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
          >
            Understood & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
