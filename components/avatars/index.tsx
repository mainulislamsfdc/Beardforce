import React from 'react';
import type { AvatarProps, AvatarDefinition } from '../../types';

const SIZE_MAP = { sm: 32, md: 48, lg: 80, xl: 128 };

// ============================================================================
// PROFESSIONAL AVATARS
// ============================================================================

export const AvatarExec: React.FC<AvatarProps> = ({ size, speaking, color = '#f59e0b' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.15" />
      <circle cx="50" cy="35" r="18" fill={color} opacity="0.7" />
      <ellipse cx="50" cy="80" rx="30" ry="20" fill={color} opacity="0.5" />
      <rect x="38" y="55" width="24" height="12" rx="3" fill={color} opacity="0.6" />
      {/* Tie */}
      <polygon points="47,55 53,55 50,72" fill={color} opacity="0.8" />
    </svg>
  );
};

export const AvatarBusiness: React.FC<AvatarProps> = ({ size, speaking, color = '#22c55e' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.15" />
      <circle cx="50" cy="33" r="17" fill={color} opacity="0.7" />
      <path d="M25 85 Q25 60 50 58 Q75 60 75 85" fill={color} opacity="0.5" />
      {/* Collar */}
      <path d="M38 58 L50 68 L62 58" fill="none" stroke={color} strokeWidth="2.5" opacity="0.8" />
    </svg>
  );
};

export const AvatarCreative: React.FC<AvatarProps> = ({ size, speaking, color = '#a855f7' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.15" />
      <circle cx="50" cy="35" r="17" fill={color} opacity="0.7" />
      {/* Beret */}
      <ellipse cx="50" cy="22" rx="22" ry="8" fill={color} opacity="0.6" />
      <circle cx="50" cy="18" r="4" fill={color} opacity="0.9" />
      <ellipse cx="50" cy="80" rx="28" ry="20" fill={color} opacity="0.5" />
    </svg>
  );
};

export const AvatarAnalyst: React.FC<AvatarProps> = ({ size, speaking, color = '#3b82f6' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.15" />
      <circle cx="50" cy="35" r="17" fill={color} opacity="0.7" />
      {/* Glasses */}
      <circle cx="42" cy="34" r="7" fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
      <circle cx="58" cy="34" r="7" fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
      <line x1="49" y1="34" x2="51" y2="34" stroke={color} strokeWidth="2" opacity="0.9" />
      <ellipse cx="50" cy="80" rx="28" ry="20" fill={color} opacity="0.5" />
    </svg>
  );
};

export const AvatarManager: React.FC<AvatarProps> = ({ size, speaking, color = '#ef4444' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.15" />
      <circle cx="50" cy="33" r="17" fill={color} opacity="0.7" />
      <path d="M25 85 Q25 60 50 58 Q75 60 75 85" fill={color} opacity="0.5" />
      {/* Badge */}
      <circle cx="65" cy="65" r="6" fill={color} opacity="0.9" />
      <text x="65" y="68" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">M</text>
    </svg>
  );
};

// ============================================================================
// ROBOT AVATARS
// ============================================================================

export const AvatarRobot01: React.FC<AvatarProps> = ({ size, speaking, color = '#3b82f6' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Antenna */}
      <line x1="50" y1="15" x2="50" y2="25" stroke={color} strokeWidth="2" />
      <circle cx="50" cy="13" r="3" fill={color} opacity="0.9" />
      {/* Head */}
      <rect x="28" y="25" width="44" height="35" rx="8" fill={color} opacity="0.6" />
      {/* Eyes */}
      <circle cx="40" cy="40" r="5" fill="white" />
      <circle cx="60" cy="40" r="5" fill="white" />
      <circle cx="40" cy="40" r="2.5" fill={color} />
      <circle cx="60" cy="40" r="2.5" fill={color} />
      {/* Mouth */}
      <rect x="38" y="50" width="24" height="4" rx="2" fill={color} opacity="0.8"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
      {/* Body */}
      <rect x="32" y="63" width="36" height="25" rx="6" fill={color} opacity="0.4" />
    </svg>
  );
};

export const AvatarRobot02: React.FC<AvatarProps> = ({ size, speaking, color = '#22c55e' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Head - rounded */}
      <circle cx="50" cy="38" r="22" fill={color} opacity="0.6" />
      {/* Visor */}
      <rect x="32" y="32" width="36" height="12" rx="6" fill="white" opacity="0.9" />
      <circle cx="42" cy="38" r="3" fill={color} />
      <circle cx="58" cy="38" r="3" fill={color} />
      {/* Mouth speaker */}
      <rect x="42" y="48" width="16" height="3" rx="1.5" fill={color} opacity="0.8"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
      {/* Body */}
      <rect x="35" y="62" width="30" height="28" rx="8" fill={color} opacity="0.4" />
      {/* Arms */}
      <rect x="22" y="65" width="10" height="6" rx="3" fill={color} opacity="0.4" />
      <rect x="68" y="65" width="10" height="6" rx="3" fill={color} opacity="0.4" />
    </svg>
  );
};

export const AvatarRobot03: React.FC<AvatarProps> = ({ size, speaking, color = '#f59e0b' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Head - hexagonal feel */}
      <rect x="30" y="20" width="40" height="38" rx="10" fill={color} opacity="0.6" />
      {/* Eyes - LED style */}
      <rect x="36" y="32" width="10" height="6" rx="2" fill="white" opacity="0.9" />
      <rect x="54" y="32" width="10" height="6" rx="2" fill="white" opacity="0.9" />
      {/* Mouth - LED bar */}
      <rect x="38" y="46" width="24" height="4" rx="2" fill="white" opacity="0.7"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
      {/* Ears */}
      <rect x="24" y="30" width="6" height="16" rx="3" fill={color} opacity="0.5" />
      <rect x="70" y="30" width="6" height="16" rx="3" fill={color} opacity="0.5" />
      {/* Body */}
      <path d="M34 60 L32 88 L68 88 L66 60 Z" fill={color} opacity="0.4" />
    </svg>
  );
};

export const AvatarRobot04: React.FC<AvatarProps> = ({ size, speaking, color = '#a855f7' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Dome head */}
      <ellipse cx="50" cy="35" rx="24" ry="20" fill={color} opacity="0.6" />
      {/* Single visor eye */}
      <ellipse cx="50" cy="35" rx="18" ry="6" fill="white" opacity="0.9" />
      <circle cx="50" cy="35" r="4" fill={color} />
      {/* Mouth grill */}
      <line x1="40" y1="47" x2="60" y2="47" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <line x1="40" y1="50" x2="60" y2="50" stroke={color} strokeWidth="1.5" opacity="0.7"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
      <line x1="40" y1="53" x2="60" y2="53" stroke={color} strokeWidth="1.5" opacity="0.7" />
      {/* Body */}
      <rect x="34" y="58" width="32" height="30" rx="10" fill={color} opacity="0.4" />
    </svg>
  );
};

export const AvatarRobot05: React.FC<AvatarProps> = ({ size, speaking, color = '#ef4444' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Monitor head */}
      <rect x="28" y="18" width="44" height="32" rx="4" fill={color} opacity="0.6" />
      <rect x="32" y="22" width="36" height="24" rx="2" fill="#0f172a" opacity="0.8" />
      {/* Screen face */}
      <text x="40" y="38" fill={color} fontSize="10">^</text>
      <text x="52" y="38" fill={color} fontSize="10">^</text>
      <path d="M42 42 Q50 48 58 42" fill="none" stroke={color} strokeWidth="1.5"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
      {/* Neck */}
      <rect x="46" y="50" width="8" height="8" fill={color} opacity="0.4" />
      {/* Body */}
      <rect x="32" y="58" width="36" height="30" rx="6" fill={color} opacity="0.4" />
    </svg>
  );
};

// ============================================================================
// ANIMAL AVATARS
// ============================================================================

export const AvatarLion: React.FC<AvatarProps> = ({ size, speaking, color = '#f59e0b' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Mane */}
      <circle cx="50" cy="45" r="32" fill={color} opacity="0.3" />
      {/* Face */}
      <circle cx="50" cy="45" r="22" fill={color} opacity="0.6" />
      {/* Eyes */}
      <circle cx="42" cy="40" r="3" fill="white" />
      <circle cx="58" cy="40" r="3" fill="white" />
      <circle cx="42" cy="40" r="1.5" fill="#1e293b" />
      <circle cx="58" cy="40" r="1.5" fill="#1e293b" />
      {/* Nose */}
      <ellipse cx="50" cy="48" rx="4" ry="3" fill={color} opacity="0.9" />
      {/* Mouth */}
      <path d="M46 52 Q50 56 54 52" fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
    </svg>
  );
};

export const AvatarOwl: React.FC<AvatarProps> = ({ size, speaking, color = '#a855f7' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Body */}
      <ellipse cx="50" cy="55" rx="28" ry="32" fill={color} opacity="0.5" />
      {/* Ear tufts */}
      <polygon points="30,28 35,40 25,40" fill={color} opacity="0.6" />
      <polygon points="70,28 75,40 65,40" fill={color} opacity="0.6" />
      {/* Eyes */}
      <circle cx="40" cy="42" r="10" fill="white" opacity="0.9" />
      <circle cx="60" cy="42" r="10" fill="white" opacity="0.9" />
      <circle cx="40" cy="42" r="5" fill={color} />
      <circle cx="60" cy="42" r="5" fill={color} />
      <circle cx="40" cy="42" r="2" fill="#1e293b" />
      <circle cx="60" cy="42" r="2" fill="#1e293b" />
      {/* Beak */}
      <polygon points="47,52 53,52 50,58" fill={color} opacity="0.9"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
    </svg>
  );
};

export const AvatarFox: React.FC<AvatarProps> = ({ size, speaking, color = '#f97316' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Ears */}
      <polygon points="28,20 35,45 20,42" fill={color} opacity="0.6" />
      <polygon points="72,20 65,45 80,42" fill={color} opacity="0.6" />
      {/* Face */}
      <ellipse cx="50" cy="48" rx="24" ry="22" fill={color} opacity="0.6" />
      {/* White muzzle */}
      <ellipse cx="50" cy="55" rx="14" ry="12" fill="white" opacity="0.3" />
      {/* Eyes */}
      <ellipse cx="40" cy="44" rx="3" ry="4" fill="white" />
      <ellipse cx="60" cy="44" rx="3" ry="4" fill="white" />
      <circle cx="40" cy="44" r="1.5" fill="#1e293b" />
      <circle cx="60" cy="44" r="1.5" fill="#1e293b" />
      {/* Nose */}
      <circle cx="50" cy="52" r="3" fill="#1e293b" opacity="0.7" />
      {/* Mouth */}
      <path d="M47 56 Q50 60 53 56" fill="none" stroke={color} strokeWidth="1.5"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
    </svg>
  );
};

export const AvatarBear: React.FC<AvatarProps> = ({ size, speaking, color = '#78716c' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Ears */}
      <circle cx="30" cy="28" r="10" fill={color} opacity="0.6" />
      <circle cx="70" cy="28" r="10" fill={color} opacity="0.6" />
      <circle cx="30" cy="28" r="5" fill={color} opacity="0.3" />
      <circle cx="70" cy="28" r="5" fill={color} opacity="0.3" />
      {/* Head */}
      <circle cx="50" cy="48" r="26" fill={color} opacity="0.6" />
      {/* Muzzle */}
      <ellipse cx="50" cy="55" rx="12" ry="10" fill={color} opacity="0.3" />
      {/* Eyes */}
      <circle cx="40" cy="44" r="3" fill="#1e293b" opacity="0.7" />
      <circle cx="60" cy="44" r="3" fill="#1e293b" opacity="0.7" />
      {/* Nose */}
      <ellipse cx="50" cy="52" rx="4" ry="3" fill="#1e293b" opacity="0.6" />
      {/* Mouth */}
      <path d="M46 57 Q50 62 54 57" fill="none" stroke="#1e293b" strokeWidth="1.5" opacity="0.5"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
    </svg>
  );
};

export const AvatarWolf: React.FC<AvatarProps> = ({ size, speaking, color = '#6366f1' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      {/* Ears */}
      <polygon points="30,15 38,42 22,38" fill={color} opacity="0.6" />
      <polygon points="70,15 62,42 78,38" fill={color} opacity="0.6" />
      {/* Head */}
      <ellipse cx="50" cy="46" rx="24" ry="26" fill={color} opacity="0.5" />
      {/* Eyes */}
      <ellipse cx="40" cy="40" rx="4" ry="3" fill="#fcd34d" opacity="0.9" />
      <ellipse cx="60" cy="40" rx="4" ry="3" fill="#fcd34d" opacity="0.9" />
      <circle cx="40" cy="40" r="1.5" fill="#1e293b" />
      <circle cx="60" cy="40" r="1.5" fill="#1e293b" />
      {/* Snout */}
      <ellipse cx="50" cy="54" rx="10" ry="8" fill={color} opacity="0.3" />
      <circle cx="50" cy="50" r="3" fill="#1e293b" opacity="0.6" />
      <path d="M46 56 Q50 60 54 56" fill="none" stroke="#1e293b" strokeWidth="1.5" opacity="0.5"
        className={speaking ? 'avatar-mouth-speaking' : ''} />
    </svg>
  );
};

// ============================================================================
// ABSTRACT AVATARS
// ============================================================================

export const AvatarGem: React.FC<AvatarProps> = ({ size, speaking, color = '#ec4899' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      <polygon points="50,12 80,40 65,85 35,85 20,40" fill={color} opacity="0.5" />
      <polygon points="50,12 65,40 50,85 35,40" fill={color} opacity="0.3" />
      <line x1="20" y1="40" x2="80" y2="40" stroke={color} opacity="0.6" strokeWidth="1" />
    </svg>
  );
};

export const AvatarOrb: React.FC<AvatarProps> = ({ size, speaking, color = '#06b6d4' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      <circle cx="50" cy="50" r="35" fill={color} opacity="0.4" />
      <circle cx="50" cy="50" r="22" fill={color} opacity="0.3" />
      <circle cx="50" cy="50" r="10" fill={color} opacity="0.6" />
      {/* Orbital ring */}
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5"
        transform="rotate(-30, 50, 50)" />
    </svg>
  );
};

export const AvatarShield: React.FC<AvatarProps> = ({ size, speaking, color = '#22c55e' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      <path d="M50 10 L82 28 L82 58 Q82 82 50 95 Q18 82 18 58 L18 28 Z" fill={color} opacity="0.4" />
      <path d="M50 22 L72 36 L72 56 Q72 74 50 84 Q28 74 28 56 L28 36 Z" fill={color} opacity="0.3" />
      {/* Check */}
      <polyline points="38,52 46,62 64,40" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};

export const AvatarFlame: React.FC<AvatarProps> = ({ size, speaking, color = '#f59e0b' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      <path d="M50 10 Q70 35 62 55 Q58 45 50 50 Q55 65 50 85 Q30 70 35 50 Q42 55 40 45 Q38 30 50 10 Z"
        fill={color} opacity="0.5" />
      <path d="M50 30 Q58 45 54 58 Q52 50 50 55 Q53 65 50 78 Q40 65 42 55 Q46 58 44 48 Q42 38 50 30 Z"
        fill={color} opacity="0.3" />
    </svg>
  );
};

export const AvatarBolt: React.FC<AvatarProps> = ({ size, speaking, color = '#eab308' }) => {
  const s = SIZE_MAP[size];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={speaking ? 'avatar-speaking' : ''}>
      <circle cx="50" cy="50" r="48" fill={color} opacity="0.1" />
      <circle cx="50" cy="50" r="36" fill={color} opacity="0.2" />
      <polygon points="55,10 30,55 48,55 42,90 70,42 52,42" fill={color} opacity="0.7" />
    </svg>
  );
};

// ============================================================================
// AVATAR REGISTRY
// ============================================================================

export const AVATAR_REGISTRY: (AvatarDefinition & { component: React.FC<AvatarProps> })[] = [
  // Professional
  { id: 'exec', name: 'Executive', category: 'professional', component: AvatarExec },
  { id: 'business', name: 'Business', category: 'professional', component: AvatarBusiness },
  { id: 'creative', name: 'Creative', category: 'professional', component: AvatarCreative },
  { id: 'analyst', name: 'Analyst', category: 'professional', component: AvatarAnalyst },
  { id: 'manager', name: 'Manager', category: 'professional', component: AvatarManager },
  // Robots
  { id: 'robot-01', name: 'Bot Classic', category: 'robot', component: AvatarRobot01 },
  { id: 'robot-02', name: 'Bot Friendly', category: 'robot', component: AvatarRobot02 },
  { id: 'robot-03', name: 'Bot Tech', category: 'robot', component: AvatarRobot03 },
  { id: 'robot-04', name: 'Bot Cyclops', category: 'robot', component: AvatarRobot04 },
  { id: 'robot-05', name: 'Bot Screen', category: 'robot', component: AvatarRobot05 },
  // Animals
  { id: 'lion', name: 'Lion', category: 'animal', component: AvatarLion },
  { id: 'owl', name: 'Owl', category: 'animal', component: AvatarOwl },
  { id: 'fox', name: 'Fox', category: 'animal', component: AvatarFox },
  { id: 'bear', name: 'Bear', category: 'animal', component: AvatarBear },
  { id: 'wolf', name: 'Wolf', category: 'animal', component: AvatarWolf },
  // Abstract
  { id: 'gem', name: 'Gem', category: 'abstract', component: AvatarGem },
  { id: 'orb', name: 'Orb', category: 'abstract', component: AvatarOrb },
  { id: 'shield', name: 'Shield', category: 'abstract', component: AvatarShield },
  { id: 'flame', name: 'Flame', category: 'abstract', component: AvatarFlame },
  { id: 'bolt', name: 'Bolt', category: 'abstract', component: AvatarBolt },
];

export function getAvatarById(id: string) {
  return AVATAR_REGISTRY.find(a => a.id === id) || null;
}
