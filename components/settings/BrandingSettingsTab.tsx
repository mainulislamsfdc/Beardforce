import React, { useState, useEffect } from 'react';
import { Save, Loader2, Eye } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import type { OrgBranding } from '../../types';

const COLOR_PRESETS = [
  { label: 'Orange', value: '#f97316' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
];

export const BrandingSettingsTab: React.FC = () => {
  const { branding, updateBranding } = useBranding();
  const [draft, setDraft] = useState<Partial<OrgBranding>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setDraft({
      app_name: branding.app_name,
      tagline: branding.tagline,
      accent_color: branding.accent_color,
      logo_initial: branding.logo_initial,
    });
  }, [branding]);

  const isDirty =
    draft.app_name !== branding.app_name ||
    draft.tagline !== branding.tagline ||
    draft.accent_color !== branding.accent_color ||
    draft.logo_initial !== branding.logo_initial;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateBranding(draft);
      setMessage({ type: 'success', text: 'Branding saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const previewName = draft.app_name || 'RunwayCRM';
  const previewInitial = draft.logo_initial || previewName.charAt(0);
  const previewColor = draft.accent_color || '#f97316';

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 mb-1 block font-medium">App Name</label>
            <input
              value={draft.app_name || ''}
              onChange={e => setDraft(p => ({ ...p, app_name: e.target.value }))}
              placeholder="RunwayCRM"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block font-medium">Tagline</label>
            <input
              value={draft.tagline || ''}
              onChange={e => setDraft(p => ({ ...p, tagline: e.target.value }))}
              placeholder="AI-Powered CRM"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block font-medium">Logo Initial</label>
            <input
              value={draft.logo_initial || ''}
              onChange={e => setDraft(p => ({ ...p, logo_initial: e.target.value.substring(0, 2) }))}
              maxLength={2}
              placeholder="R"
              className="w-20 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center text-lg font-bold focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-2 block font-medium">Accent Color</label>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setDraft(p => ({ ...p, accent_color: c.value }))}
                  className={`w-8 h-8 rounded-full ring-2 transition-all ${
                    draft.accent_color === c.value ? 'ring-white scale-110' : 'ring-transparent hover:ring-gray-400'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <input
                type="color"
                value={draft.accent_color || '#f97316'}
                onChange={e => setDraft(p => ({ ...p, accent_color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                title="Custom color"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <Eye size={14} />
            <span>Preview</span>
          </div>

          {/* Sidebar preview */}
          <div className="bg-gray-950 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: previewColor }}
              >
                {previewInitial}
              </div>
              <span className="text-white font-semibold text-sm">{previewName}</span>
            </div>
            <div className="text-gray-500 text-xs">{draft.tagline || 'AI-Powered CRM'}</div>
            <div className="space-y-1 mt-2">
              {['Dashboard', 'IT Manager', 'Sales Manager', 'Settings'].map(item => (
                <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded text-gray-400 text-xs">
                  <div className="w-3 h-3 rounded bg-gray-700" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Login preview */}
          <div className="mt-4 bg-gray-950 rounded-lg p-4 text-center">
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: previewColor }}
            >
              {previewInitial}
            </div>
            <div className="text-white font-bold text-sm">{previewName}</div>
            <div className="text-gray-500 text-xs">{draft.tagline || 'AI-Powered CRM'}</div>
          </div>
        </div>
      </div>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Branding
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandingSettingsTab;
