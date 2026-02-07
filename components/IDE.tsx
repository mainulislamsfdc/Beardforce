import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { DynamicPage } from '../types';
import DynamicPageRenderer from './DynamicPageRenderer';
import { Save, Play, Code, Layout } from 'lucide-react';

const IDE: React.FC = () => {
  const { customPages, addCustomPage } = useStore();
  
  // Default Template
  const defaultTemplate: DynamicPage = {
      id: 'new-module',
      name: 'New Module',
      route: 'new-module',
      description: 'A custom dashboard page.',
      icon: 'box',
      widgets: [
          { id: 'w1', type: 'header', title: 'My New Dashboard', gridColSpan: 3 },
          { id: 'w2', type: 'statCard', title: 'Key Metric', dataSource: 'leads', config: { prefix: '$' } },
          { id: 'w3', type: 'chart', title: 'Trend Analysis', dataSource: 'leads', gridColSpan: 2 }
      ]
  };

  const [code, setCode] = useState(JSON.stringify(defaultTemplate, null, 2));
  const [previewPage, setPreviewPage] = useState<DynamicPage>(defaultTemplate);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = () => {
      try {
          const parsed = JSON.parse(code);
          setPreviewPage(parsed);
          setError(null);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handleSave = async () => {
      try {
          const parsed = JSON.parse(code);
          const res = await addCustomPage(parsed);
          alert(`Module "${parsed.name}" deployed successfully! ${res}`);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const loadExisting = (page: DynamicPage) => {
      setCode(JSON.stringify(page, null, 2));
      setPreviewPage(page);
  };

  return (
    <div className="flex h-full flex-col">
        <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Code size={24} className="text-green-400"/> IT Studio (Low-Code)</h2>
                <p className="text-slate-400 text-xs">Build and deploy new modules via JSON Schema.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm font-bold border border-slate-700">
                    <Play size={16}/> Preview
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold shadow-lg shadow-green-900/50">
                    <Save size={16}/> Deploy Module
                </button>
            </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-48 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase">Existing Pages</p>
                {customPages.map(p => (
                    <button key={p.id} onClick={() => loadExisting(p)} className="text-left px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 truncate">
                        {p.name}
                    </button>
                ))}
                <button onClick={() => loadExisting(defaultTemplate)} className="text-left px-3 py-2 rounded bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 text-xs truncate mt-2 border border-dashed border-blue-800">
                    + New Template
                </button>
            </div>

            {/* Code Editor */}
            <div className="w-1/3 flex flex-col relative">
                <textarea 
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-green-400 focus:border-green-500 outline-none resize-none leading-relaxed"
                    spellCheck={false}
                />
                {error && (
                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-200 text-xs p-2 rounded border border-red-700">
                        JSON Error: {error}
                    </div>
                )}
            </div>

            {/* Preview */}
            <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden flex flex-col">
                <div className="bg-slate-900 p-2 border-b border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Layout size={14}/> Live Preview
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                     <DynamicPageRenderer page={previewPage} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default IDE;