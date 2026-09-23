import React from 'react';
import { X, FileText, Download } from 'lucide-react';

export default function CertViewerModal({ isOpen, onClose, certName, certData }) {
  if (!isOpen || !certData) return null;

  const isImage = certData.startsWith('data:image/') || certData.match(/\.(jpg|jpeg|png|webp)$/i);
  const isPdf = certData.startsWith('data:application/pdf') || certData.match(/\.pdf$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative p-4 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="relative bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{certName || 'Sports Certificate'}</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">Athlete Verification Document</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={certData}
                download={certName || 'sports_certificate'}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white rounded-xl text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Body */}
          <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-950/40 min-h-[320px]">
            {isImage ? (
              <img
                src={certData}
                alt={certName || 'Sports Certificate'}
                className="max-h-[65vh] w-auto object-contain rounded-xl border border-slate-800 shadow-lg"
              />
            ) : isPdf ? (
              <iframe
                src={certData}
                title="Sports Certificate PDF"
                className="w-full h-[65vh] rounded-xl border border-slate-800"
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm font-semibold">No direct preview renderer available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
