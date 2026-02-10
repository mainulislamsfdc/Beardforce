import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AVATAR_REGISTRY } from './index';
import type { AvatarDefinition } from '../../types';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  currentAvatarId?: string;
  color?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'professional', label: 'Professional' },
  { id: 'robot', label: 'Robots' },
  { id: 'animal', label: 'Animals' },
  { id: 'abstract', label: 'Abstract' },
] as const;

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen, onClose, onSelect, currentAvatarId, color,
}) => {
  const [category, setCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = category === 'all'
    ? AVATAR_REGISTRY
    : AVATAR_REGISTRY.filter(a => a.category === category);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Choose Avatar</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-3 border-b border-gray-700 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                category === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Avatar Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-5 gap-3">
            {/* Default (initials) option */}
            <button
              onClick={() => { onSelect('default'); onClose(); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                currentAvatarId === 'default' || !currentAvatarId
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                AB
              </div>
              <span className="text-[10px] text-gray-400">Initials</span>
            </button>

            {filtered.map(avatar => {
              const Component = avatar.component;
              return (
                <button
                  key={avatar.id}
                  onClick={() => { onSelect(avatar.id); onClose(); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                    currentAvatarId === avatar.id
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <Component size="md" color={color} />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">{avatar.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
