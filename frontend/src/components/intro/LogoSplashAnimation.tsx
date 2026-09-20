import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Radio, Activity, CheckCircle2 } from 'lucide-react';

interface LogoSplashAnimationProps {
  onComplete: () => void;
}

export const LogoSplashAnimation: React.FC<LogoSplashAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<number>(0);
  const [statusText, setStatusText] = useState('INITIALIZING SECURE TELEMETRY NODES...');
  const audioPlayedRef = useRef(false);

  // Play synthetic cinematic sound
  const playCinematicSound = () => {
    if (audioPlayedRef.current) return;
    audioPlayedRef.current = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Deep Sub Bass Drone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.exponentialRampToValueAtTime(110, now + 1.2);
      subGain.gain.setValueAtTime(0.01, now);
      subGain.gain.linearRampToValueAtTime(0.2, now + 0.5);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 2.5);

      // 2. High Resonance EOC Telemetry Chime
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(440, now + 0.6); // A4
      chimeOsc.frequency.setValueAtTime(659.25, now + 0.85); // E5
      chimeOsc.frequency.setValueAtTime(880, now + 1.1); // A5
      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.linearRampToValueAtTime(0.12, now + 0.9);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now + 0.6);
      chimeOsc.stop(now + 2.3);
    } catch (err) {
      // Audio context may be restricted before user gesture; gracefully fallback
    }
  };

  useEffect(() => {
    // Attempt sound on mount (or first interaction)
    playCinematicSound();

    const timer1 = setTimeout(() => {
      setPhase(1);
      setStatusText('ESTABLISHING SECURE EOC ENCRYPTION HANDSHAKE...');
    }, 700);

    const timer2 = setTimeout(() => {
      setPhase(2);
      setStatusText('CITYWIDE MUNICIPAL GRIDS SYNCHRONIZED · ACCESS READY');
    }, 1500);

    const timer3 = setTimeout(() => {
      setPhase(3);
    }, 2400);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 2900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 3 ? 0 : 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] text-white overflow-hidden select-none"
      onClick={playCinematicSound}
    >
      {/* Background Radial Ambient Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[90px]" />
        {/* Subtle high-tech grid coordinate lines */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Center Animated Logo Construct */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-md px-6">
        {/* Expanding Pulsing Radar Waves */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Radar Ring 1 */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border border-indigo-500/40"
          />

          {/* Radar Ring 2 */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 2.4], opacity: [0.4, 0] }}
            transition={{ duration: 2.2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border border-sky-400/30"
          />

          {/* Central 3D Hexagonal / Shield Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              duration: 0.8,
            }}
            className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-400/40 shadow-[0_0_50px_rgba(99,102,241,0.35)] flex items-center justify-center"
          >
            {/* Ambient Inner Glow */}
            <div className="absolute inset-1 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-transparent to-sky-500/20 pointer-events-none" />

            {/* Geometric SVG Shield Paths */}
            <svg
              viewBox="0 0 100 100"
              className="w-14 h-14 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer Shield Path */}
              <motion.path
                d="M50 15 L80 28 V52 C80 72 50 85 50 85 C50 85 20 72 20 52 V28 Z"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                stroke="#818CF8"
              />
              {/* Inner Cross Telemetry Grid */}
              <motion.path
                d="M50 35 V65 M35 50 H65"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeInOut' }}
                stroke="#38BDF8"
                strokeWidth="3.5"
              />
            </svg>

            {/* Top-Right Neon Status Dot */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: 'spring' }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070B14] shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-pulse"
            />
          </motion.div>
        </div>

        {/* Brand Name & Typography Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-sky-300">
              ResQGrid
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              v2.0 EOC
            </span>
          </div>
          <p className="text-xs font-sans tracking-wide text-slate-400 uppercase font-medium">
            Intelligent Emergency Response & Resource Grid
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Vadodara Smart City · Department of Disaster Management
          </p>
        </motion.div>

        {/* Dynamic Telemetry Status & Progress Line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full space-y-3 pt-2"
        >
          {/* Status Message */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-indigo-300 h-5">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <motion.span
              key={statusText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="tracking-wider"
            >
              {statusText}
            </motion.span>
          </div>

          {/* Glowing Animated Loading Bar */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: phase === 0 ? '30%' : phase === 1 ? '70%' : '100%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            />
          </div>
        </motion.div>
      </div>

      {/* Subtle Skip Pill at Top-Right */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={onComplete}
          className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
        >
          Skip [Esc]
        </button>
      </div>
    </motion.div>
  );
};
