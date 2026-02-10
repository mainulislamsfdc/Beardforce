import React from 'react';
import { getAvatarById } from './index';
import type { AvatarProps } from '../../types';

interface AvatarRendererProps extends AvatarProps {
  avatarId: string;
  fallbackInitial?: string;
  fallbackBg?: string;
}

const SIZE_CLASS = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-32 h-32 text-4xl',
};

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  avatarId,
  size,
  speaking = false,
  color,
  fallbackInitial = '?',
  fallbackBg = 'bg-gray-600',
}) => {
  const avatarDef = getAvatarById(avatarId);

  if (avatarDef) {
    const Component = avatarDef.component;
    return (
      <div className={`flex items-center justify-center ${speaking ? 'avatar-speaking' : ''}`}>
        <Component size={size} speaking={speaking} color={color} />
      </div>
    );
  }

  // Fallback: colored circle with initial
  return (
    <div
      className={`${SIZE_CLASS[size]} ${fallbackBg} rounded-full flex items-center justify-center font-bold text-white ${speaking ? 'avatar-speaking' : ''}`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {fallbackInitial}
    </div>
  );
};

export default AvatarRenderer;
