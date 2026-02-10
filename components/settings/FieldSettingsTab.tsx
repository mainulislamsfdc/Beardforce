import React, { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useFieldConfig } from '../../context/FieldConfigContext';
import { agentConfigService } from '../../services/agentConfigService';
import type { FieldConfig } from '../../types';

export const FieldSettingsTab: React.FC = () => {
  const { fields, refresh } = useFieldConfig();
  const [drafts, setDrafts] = useState<FieldConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setDrafts(fields.map(f => ({ ...f })));
  }, [fields]);

  const updateDraft = (idx: number, field: string, value: any) => {
    setDrafts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const isDirty = JSON.stringify(drafts) !== JSON.stringify(fields);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      for (const draft of drafts) {
        if (draft.id) {
          const orig = fields.find(f => f.id === draft.id);
          if (JSON.stringify(orig) !== JSON.stringify(draft)) {
            await agentConfigService.updateFieldConfig(draft.id, {
              display_name: draft.display_name,
              field_type: draft.field_type,
              options: draft.options,
              is_visible: draft.is_visible,
              sort_order: draft.sort_order,
            });
          }
        }
      }
      await refresh();
      setMessage({ type: 'success', text: 'Field settings saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p>No configurable fields found.</p>
        <p className="text-sm mt-1">Field configuration will be available after running the SQL migrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'}`}>
          {message.text}
        </div>
      )}

      <p className="text-sm text-gray-400">
        Configure how fields appear in the lead management form. You can rename, hide, or change the options for each field.
      </p>

      <div className="space-y-3">
        {drafts.map((draft, idx) => (
          <div key={draft.field_key} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-start gap-4">
              {/* Visibility Toggle */}
              <button
                onClick={() => updateDraft(idx, 'is_visible', !draft.is_visible)}
                className={`mt-1 p-2 rounded-lg transition-colors ${draft.is_visible ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}
                title={draft.is_visible ? 'Visible' : 'Hidden'}
              >
                {draft.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Database Field</label>
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm font-mono">
                      {draft.field_key}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Display Name</label>
                    <input
                      value={draft.display_name}
                      onChange={e => updateDraft(idx, 'display_name', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Field Type</label>
                    <select
                      value={draft.field_type}
                      onChange={e => updateDraft(idx, 'field_type', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="number">Number</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>

                {draft.field_type === 'select' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Options (comma-separated)</label>
                    <input
                      value={(draft.options || []).join(', ')}
                      onChange={e => updateDraft(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Option A, Option B, Option C"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Field Config
          </button>
        </div>
      )}
    </div>
  );
};

export default FieldSettingsTab;
