import React, { useState, useEffect } from 'react';
import { X, Play, Volume2, Award, FastForward } from 'lucide-react';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ isOpen, onClose, onAdCompleted }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(30);
      setCompleted(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkipTest = () => {
    setSecondsRemaining(0);
    setCompleted(true);
  };

  const handleFinish = () => {
    onAdCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 text-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Ad Video Simulator Screen */}
        <div className="relative aspect-video bg-black flex flex-col items-center justify-center p-4 text-center overflow-hidden border-b border-gray-800">
          <div className="absolute top-2 left-2 bg-yellow-400 text-black font-extrabold text-[10px] px-2 py-0.5 rounded">
            PUBLICIDAD
          </div>

          <div className="absolute top-2 right-2 text-xs font-mono text-gray-300 bg-black/60 px-2 py-1 rounded flex items-center gap-1">
            <span>⏱️ {secondsRemaining}s</span>
          </div>

          {/* Animated visual ad content */}
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 bg-linear-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg">
              <Award className="text-white" size={24} />
            </div>
            <h4 className="font-bold text-sm text-white">Google AdMob Rewarded Video</h4>
            <p className="text-xs text-gray-400 max-w-[220px] mx-auto">
              Espacio publicitario oficial para red de anuncios nativos
            </p>
          </div>

          {/* Audio & FastForward controls for testing */}
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <Volume2 size={14} className="text-gray-400" />
            <span className="text-[10px] text-gray-400">Audio simulado</span>
          </div>

          {!completed && (
            <button
              onClick={handleSkipTest}
              className="absolute bottom-2 right-2 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded flex items-center gap-1 font-semibold"
              title="Acelerar para pruebas"
            >
              <FastForward size={12} />
              <span>Adelantar (Test)</span>
            </button>
          )}
        </div>

        {/* Ad Progress Bar */}
        <div className="w-full bg-gray-800 h-1.5">
          <div
            className="bg-[#2C9945] h-full transition-all duration-1000 ease-linear"
            style={{ width: `${((30 - secondsRemaining) / 30) * 100}%` }}
          />
        </div>

        {/* Ad Footer */}
        <div className="p-4 bg-gray-900 space-y-3">
          <div className="text-center text-xs text-gray-300">
            {completed ? (
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                <Award size={16} />
                ¡Recompensa desbloqueada! 12 horas sin anuncios.
              </span>
            ) : (
              <span>Viendo video publicitario para bloquear anuncios por 12 horas...</span>
            )}
          </div>

          {completed ? (
            <button
              id="btn-claim-ad-reward"
              onClick={handleFinish}
              className="w-full bg-[#2C9945] hover:bg-[#25853c] text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md"
            >
              Reclamar 12 horas libres de anuncios
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-gray-800 text-gray-500 py-2 rounded-lg font-semibold text-xs cursor-not-allowed"
            >
              Espera {secondsRemaining}s para reclamar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
