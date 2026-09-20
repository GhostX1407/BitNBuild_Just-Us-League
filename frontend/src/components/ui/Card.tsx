import React, { useRef, useState } from 'react';
import { cn } from '../../utils/format';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tilt?: boolean;
  glow?: 'none' | 'amber' | 'red' | 'teal';
  elevation?: 'flat' | 'raised';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  tilt = true,
  glow = 'none',
  elevation = 'flat',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -3.5;
    const rotY = ((x - centerX) / centerX) * 3.5;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseEnter = () => {
    if (tilt) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (tilt) {
      setIsHovered(false);
      setRotateX(0);
      setRotateY(0);
    }
  };

  const glowStyles = {
    none: '',
    amber: 'border-amber-300 ring-2 ring-amber-100',
    red: 'border-rose-300 ring-2 ring-rose-100',
    teal: 'border-emerald-300 ring-2 ring-emerald-100',
  }[glow];

  const elevationBg = elevation === 'raised' ? 'bg-slate-50/80' : 'bg-white';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered && tilt
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2.5px) scale3d(1.008, 1.008, 1.008)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={cn(
        'relative rounded-2xl border border-slate-200/90 shadow-tile transition-all duration-300 overflow-hidden',
        elevationBg,
        isHovered && 'shadow-tile-hover border-slate-300',
        glowStyles,
        className
      )}
      {...props}
    >
      {/* 3D Specular Highlight Lip (Apple hardware/UI effect) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent rounded-t-2xl pointer-events-none z-10" />
      {children}
    </div>
  );
};
