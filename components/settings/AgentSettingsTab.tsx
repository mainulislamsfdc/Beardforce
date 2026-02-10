import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAgentConfig } from '../../context/AgentConfigContext';
import { AvatarRenderer } from '../avatars/AvatarRenderer';
import { AvatarPickerModal } from '../avatars/AvatarPickerModal';
import type { AgentId, AgentConfig } from '../../types';

const AGENT_IDS: AgentId[] = ['ceo', 'sales', 'marketing', 'it'];

const GRADIENT_PRESETS = [
  { label: 'Amber', value: 'from-amber-600 to-orange-700', primary: '#f59e0b' },
  { label: 'Green', value: 'from-green-600 to-blue-700', primary: '#22c55e' },
  { label: 'Purple', value: 'from-purple-600 to-pink-700', primary: '#a855f7' },
  { label: 'Blue', value: 'from-blue-600 to-indigo-700', primary: '#3b82f6' },
  { label: 'Red', value: 'from-red-600 to-rose-700', primary: '#ef4444' },
  { label: 'Cyan', value: 'from-cyan-600 to-teal-700', primary: '#06b6d4' },
  { label: 'Pink', value: 'from-pink-600 to-fuchsia-700', primary: '#ec4899' },
  { label: 'Emerald', value: 'from-emerald-600 to-green-700', primary: '#10b981' },
  { label: 'Indigo', value: 'from-indigo-600 to-violet-700', primary: '#6366f1' },
  { label: 'Slate', value: 'from-slate-600 to-gray-700', primary: '#64748b' },
];

export const AgentSettingsTab: React.FC = () => {
  const { agents, updateAgent } = useAgentConfig();
  const [editState, setEditState] = useState<Record<AgentId, Partial<AgentConfig>>>({} as any);
  const [saving, setSaving] = useState<AgentId | null>(null);
  const [pickerAgent, setPickerAgent] = useState<AgentId | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getEdited = (id: AgentId): AgentConfig => ({
    ...agents[id],
    ...editState[id],
  });

  const setField = (id: AgentId, field: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (id: AgentId) => {
    setSaving(id);
    setMessage(null);
    try {
      const edits = editState[id];
      if (edits && Object.keys(edits).length > 0) {
        await updateAgent(id, edits);
        setEditState(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setMessage({ type: 'success', text: `${getEdited(id).custom_name} saved!` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'}`}>
          {message.text}
        </div>
      )}

      {AGENT_IDS.map(id => {
        const agent = getEdited(id);
        const isDirty = editState[id] && Object.keys(editState[id]).length > 0;
        return (
          <div key={id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <button
                onClick={() => setPickerAgent(id)}
                className="flex-shrink-0 rounded-full ring-2 ring-gray-600 hover:ring-orange-500 transition-all p-1"
                title="Change avatar"
              >
                <AvatarRenderer
                  avatarId={agent.avatar_id}
                  size="lg"
                  color={agent.color_primary}
                  fallbackInitial={agent.custom_name.substring(0, 2)}
                />
              </button>

              {/* Fields */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Agent Name</label>
                    <input
                      value={agent.custom_name}
                      onChange={e => setField(id, 'custom_name', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Title / Role</label>
                    <input
                      value={agent.custom_title}
                      onChange={e => setField(id, 'custom_title', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Color Gradient */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Color Theme</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setField(id, 'color_gradient', preset.value);
                          setField(id, 'color_primary', preset.primary);
                        }}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${preset.value} ring-2 transition-all ${
                          agent.color_gradient === preset.value ? 'ring-white scale-110' : 'ring-transparent hover:ring-gray-400'
                        }`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Personality */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Personality Prompt (optional)</label>
                  <textarea
                    value={agent.personality_prompt || ''}
                    onChange={e => setField(id, 'personality_prompt', e.target.value || null)}
                    placeholder="e.g. Speak with a friendly, casual tone. Use analogies..."
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Voice Config */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Voice Pitch ({agent.voice_pitch})</label>
                    <input
                      type="range" min="0.5" max="2" step="0.05"
                      value={agent.voice_pitch}
                      onChange={e => setField(id, 'voice_pitch', parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Voice Rate ({agent.voice_rate})</label>
                    <input
                      type="range" min="0.5" max="2" step="0.05"
                      value={agent.voice_rate}
                      onChange={e => setField(id, 'voice_rate', parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Voice Name</label>
                    <input
                      value={agent.voice_name || ''}
                      onChange={e => setField(id, 'voice_name', e.target.value || null)}
                      placeholder="Google US English"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Save */}
                {isDirty && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave(id)}
                      disabled={saving === id}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {saving === id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save {agent.custom_name}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Avatar Picker Modal */}
      {pickerAgent && (
        <AvatarPickerModal
          isOpen={true}
          onClose={() => setPickerAgent(null)}
          onSelect={avatarId => setField(pickerAgent, 'avatar_id', avatarId)}
          currentAvatarId={getEdited(pickerAgent).avatar_id}
          color={getEdited(pickerAgent).color_primary}
        />
      )}
    </div>
  );
};

export default AgentSettingsTab;
