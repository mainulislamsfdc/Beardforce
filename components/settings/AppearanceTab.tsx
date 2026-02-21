/**
 * AppearanceTab — lets users pick a theme, font, and accent colour.
 *
 * How it works:
 *  • Writes a `data-theme` attribute on <html> and saves the choice to localStorage.
 *  • CSS custom properties keyed off [data-theme] in index.html / tailwind.css
 *    override the default dark colours.
 *  • For Tailwind projects the simplest path is to write inline CSS variables on
 *    document.documentElement; Tailwind utility classes that use those vars update
 *    automatically where we've opted in (e.g. bg-[var(--bg-base)]).
 *
 * Themes ship as self-contained presets (background, surface, text, accent).
 * We patch `document.documentElement.style` directly so changes are instant.
 */

import { useState, useEffect } from 'react';
import { Check, Palette, Type, Sun, Moon, Waves, Coffee, Leaf } from 'lucide-react';

// ── Theme definitions ──────────────────────────────────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  vars: Record<string, string>;
  /** Tailwind preview swatch colours (bg-hex) */
  swatches: string[];
}

const THEMES: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Dark (Default)',
    description: 'Deep charcoal — easy on the eyes in low light.',
    icon: <Moon className="w-4 h-4" />,
    swatches: ['#111827', '#1f2937', '#374151'],
    vars: {
      '--bg-base':    '#111827',
      '--bg-surface': '#1f2937',
      '--bg-hover':   '#374151',
      '--border':     '#374151',
      '--text-base':  '#f9fafb',
      '--text-muted': '#9ca3af',
      '--accent':     '#f97316',
    },
  },
  {
    id: 'soft-dark',
    name: 'Soft Dark',
    description: 'Warmer tones — less contrast, more comfortable for long sessions.',
    icon: <Coffee className="w-4 h-4" />,
    swatches: ['#1c1917', '#292524', '#44403c'],
    vars: {
      '--bg-base':    '#1c1917',
      '--bg-surface': '#292524',
      '--bg-hover':   '#44403c',
      '--border':     '#44403c',
      '--text-base':  '#fafaf9',
      '--text-muted': '#a8a29e',
      '--accent':     '#fb923c',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue tones — calming and professional.',
    icon: <Waves className="w-4 h-4" />,
    swatches: ['#0c1a2e', '#132035', '#1e3a5f'],
    vars: {
      '--bg-base':    '#0c1a2e',
      '--bg-surface': '#132035',
      '--bg-hover':   '#1e3a5f',
      '--border':     '#1e4080',
      '--text-base':  '#e0f2fe',
      '--text-muted': '#7dd3fc',
      '--accent':     '#38bdf8',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy greens — grounding and focused.',
    icon: <Leaf className="w-4 h-4" />,
    swatches: ['#0a1f0e', '#112318', '#1a3a22'],
    vars: {
      '--bg-base':    '#0a1f0e',
      '--bg-surface': '#112318',
      '--bg-hover':   '#1a3a22',
      '--border':     '#2d5016',
      '--text-base':  '#f0fdf4',
      '--text-muted': '#86efac',
      '--accent':     '#4ade80',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean white — classic SaaS look, great in bright rooms.',
    icon: <Sun className="w-4 h-4" />,
    swatches: ['#f9fafb', '#ffffff', '#f3f4f6'],
    vars: {
      '--bg-base':    '#f9fafb',
      '--bg-surface': '#ffffff',
      '--bg-hover':   '#f3f4f6',
      '--border':     '#e5e7eb',
      '--text-base':  '#111827',
      '--text-muted': '#6b7280',
      '--accent':     '#ea580c',
    },
  },
];

const FONT_OPTIONS = [
  { id: 'inter',   label: 'Inter',   style: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' } },
  { id: 'mono',    label: 'Mono',    style: { fontFamily: 'ui-monospace, "Fira Code", monospace' } },
  { id: 'serif',   label: 'Serif',   style: { fontFamily: 'Georgia, ui-serif, serif' } },
  { id: 'system',  label: 'System',  style: { fontFamily: 'system-ui, -apple-system, sans-serif' } },
];

const DENSITY_OPTIONS = [
  { id: 'comfortable', label: 'Comfortable', desc: 'More padding, easier to scan' },
  { id: 'compact',     label: 'Compact',     desc: 'Tighter layout, more content visible' },
];

const STORAGE_KEY = 'runwaycrm_appearance';

function loadPrefs(): { themeId: string; fontId: string; densityId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { themeId: 'dark', fontId: 'inter', densityId: 'comfortable' };
}

function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', theme.id);
}

function applyFont(fontId: string) {
  const opt = FONT_OPTIONS.find(f => f.id === fontId) ?? FONT_OPTIONS[0];
  document.documentElement.style.setProperty('--font-sans', opt.style.fontFamily);
  document.body.style.fontFamily = opt.style.fontFamily;
}

function applyDensity(densityId: string) {
  document.documentElement.setAttribute('data-density', densityId);
}

// Call once on app boot (from main.tsx or App.tsx) so theme persists on reload
export function initAppearance() {
  const prefs = loadPrefs();
  const theme = THEMES.find(t => t.id === prefs.themeId) ?? THEMES[0];
  applyTheme(theme);
  applyFont(prefs.fontId);
  applyDensity(prefs.densityId);
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AppearanceTab() {
  const saved = loadPrefs();
  const [themeId,   setThemeId]   = useState(saved.themeId);
  const [fontId,    setFontId]    = useState(saved.fontId);
  const [densityId, setDensityId] = useState(saved.densityId);
  const [saved2,    setSaved2]    = useState(false);

  // Apply live preview on every change
  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
    applyTheme(theme);
  }, [themeId]);

  useEffect(() => { applyFont(fontId); }, [fontId]);
  useEffect(() => { applyDensity(densityId); }, [densityId]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, fontId, densityId }));
    setSaved2(true);
    setTimeout(() => setSaved2(false), 2000);
  };

  const handleReset = () => {
    setThemeId('dark');
    setFontId('inter');
    setDensityId('comfortable');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Theme presets ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold">Colour Theme</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => setThemeId(theme.id)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                themeId === theme.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              {themeId === theme.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2 text-gray-300">
                {theme.icon}
                <span className="font-medium text-sm">{theme.name}</span>
              </div>
              {/* Colour swatches */}
              <div className="flex gap-1.5 mb-2">
                {theme.swatches.map(hex => (
                  <div
                    key={hex}
                    className="w-6 h-6 rounded-md border border-white/10 flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <div
                  className="w-6 h-6 rounded-md border border-white/10 flex-shrink-0"
                  style={{ backgroundColor: theme.vars['--accent'] }}
                />
              </div>
              <p className="text-gray-500 text-xs leading-snug">{theme.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Font family ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold">Font Family</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONT_OPTIONS.map(font => (
            <button
              key={font.id}
              onClick={() => setFontId(font.id)}
              className={`py-3 px-4 rounded-xl border-2 text-sm transition-all ${
                fontId === font.id
                  ? 'border-orange-500 bg-orange-500/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
              style={font.style}
            >
              {font.label}
              <span className="block text-xs opacity-60 mt-0.5">Aa</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout density ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold">Layout Density</h3>
        </div>
        <div className="flex gap-3">
          {DENSITY_OPTIONS.map(d => (
            <button
              key={d.id}
              onClick={() => setDensityId(d.id)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                densityId === d.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className={`text-sm font-medium mb-0.5 ${densityId === d.id ? 'text-white' : 'text-gray-300'}`}>
                {d.label}
              </div>
              <div className="text-xs text-gray-500">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Note ── */}
      <p className="text-xs text-gray-600 leading-relaxed">
        Theme changes apply instantly as a live preview. Click <strong className="text-gray-400">Save</strong> to persist them across sessions.
        Preferences are stored locally in your browser.
      </p>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saved2 ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Preferences'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg text-sm transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
