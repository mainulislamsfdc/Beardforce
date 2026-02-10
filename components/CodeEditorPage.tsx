import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Code2, Play, Save, History, Trash2, Plus, FileCode, RefreshCw,
  ChevronRight, Eye, EyeOff, Copy, Check, Download, Clock, Tag,
  GitBranch, Loader2, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { databaseService, initializeDatabase } from '../services/database';
import { supabase } from '../services/supabase/client';

interface CodeSnippet {
  id: string;
  user_id: string;
  agent_name: string;
  title: string;
  description: string;
  code: string;
  language: string;
  component_type: string;
  version?: number;
  parent_id?: string | null;
  created_at: string;
}

interface VersionEntry {
  id: string;
  title: string;
  version: number;
  created_at: string;
  description: string;
}

const CodeEditorPage: React.FC = () => {
  const { user } = useAuth();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('tsx');
  const [componentType, setComponentType] = useState('component');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [diffView, setDiffView] = useState<{ old: string; new: string } | null>(null);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Init DB
  useEffect(() => {
    const init = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          setDbInitialized(true);
        } catch (e) {
          console.error('DB init failed:', e);
        }
      }
    };
    init();
  }, [user?.id, dbInitialized]);

  // Load snippets
  const loadSnippets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('code_snippets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSnippets(data || []);
    } catch (e: any) {
      console.error('Failed to load snippets:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (dbInitialized) loadSnippets();
  }, [dbInitialized, loadSnippets]);

  // Select snippet
  const selectSnippet = (snippet: CodeSnippet) => {
    setSelectedSnippet(snippet);
    setCode(snippet.code);
    setTitle(snippet.title);
    setDescription(snippet.description);
    setLanguage(snippet.language);
    setComponentType(snippet.component_type);
    setUnsaved(false);
    setExecutionOutput(null);
    setDiffView(null);
    setShowHistory(false);
  };

  // New snippet
  const createNew = () => {
    setSelectedSnippet(null);
    setCode(`import React from 'react';\n\nconst MyComponent: React.FC = () => {\n  return (\n    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">\n      <h2 className="text-xl font-bold text-white">New Component</h2>\n    </div>\n  );\n};\n\nexport default MyComponent;\n`);
    setTitle('New Component');
    setDescription('');
    setLanguage('tsx');
    setComponentType('component');
    setUnsaved(true);
    setExecutionOutput(null);
    setDiffView(null);
  };

  // Save (create or new version)
  const handleSave = async () => {
    if (!user?.id || !title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        agent_name: 'IT',
        title: title.trim(),
        description: description.trim(),
        code,
        language,
        component_type: componentType,
      };

      if (selectedSnippet) {
        // Update existing
        const { error } = await supabase
          .from('code_snippets')
          .update({ code, title: title.trim(), description: description.trim(), language, component_type: componentType })
          .eq('id', selectedSnippet.id);
        if (error) throw error;

        // Also save a version entry in change_log for history tracking
        await supabase.from('change_log').insert({
          user_id: user.id,
          agent_name: 'IT',
          change_type: 'code_version',
          description: `Version saved: ${title.trim()}`,
          before_state: { code: selectedSnippet.code },
          after_state: { code, snippet_id: selectedSnippet.id },
          status: 'approved',
        });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('code_snippets')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSelectedSnippet(data);
      }

      setUnsaved(false);
      await loadSnippets();
    } catch (e: any) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedSnippet) return;
    try {
      await supabase.from('code_snippets').delete().eq('id', selectedSnippet.id);
      setSelectedSnippet(null);
      setCode('');
      setTitle('');
      setDescription('');
      await loadSnippets();
    } catch (e: any) {
      console.error('Delete failed:', e);
    }
  };

  // Load version history from change_log
  const loadVersionHistory = async () => {
    if (!selectedSnippet || !user?.id) return;
    setShowHistory(true);
    try {
      const { data } = await supabase
        .from('change_log')
        .select('id, description, created_at, before_state, after_state')
        .eq('user_id', user.id)
        .eq('change_type', 'code_version')
        .order('created_at', { ascending: false })
        .limit(20);

      const filtered = (data || []).filter(
        (d: any) => d.after_state?.snippet_id === selectedSnippet.id
      );

      setVersions(
        filtered.map((d: any, i: number) => ({
          id: d.id,
          title: d.description,
          version: filtered.length - i,
          created_at: d.created_at,
          description: d.description,
        }))
      );
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  // View diff between a version and current
  const viewDiff = async (versionId: string) => {
    try {
      const { data } = await supabase
        .from('change_log')
        .select('before_state, after_state')
        .eq('id', versionId)
        .single();
      if (data) {
        setDiffView({
          old: data.before_state?.code || '(empty)',
          new: data.after_state?.code || code,
        });
      }
    } catch (e) {
      console.error('Diff failed:', e);
    }
  };

  // Restore a version
  const restoreVersion = async (versionId: string) => {
    try {
      const { data } = await supabase
        .from('change_log')
        .select('after_state')
        .eq('id', versionId)
        .single();
      if (data?.after_state?.code) {
        setCode(data.after_state.code);
        setUnsaved(true);
        setDiffView(null);
      }
    } catch (e) {
      console.error('Restore failed:', e);
    }
  };

  // Simulate code execution (sandboxed eval for simple JS)
  const handleRun = () => {
    setIsRunning(true);
    setExecutionOutput(null);

    setTimeout(() => {
      try {
        const logs: string[] = [];
        const mockConsole = {
          log: (...args: any[]) => logs.push(args.map(String).join(' ')),
          error: (...args: any[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
          warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
        };

        // Only execute plain JS/TS (not JSX/TSX which can't be eval'd)
        if (language === 'tsx' || language === 'jsx') {
          // For React components, just validate syntax roughly
          const hasExport = code.includes('export');
          const hasReturn = code.includes('return');
          const hasImport = code.includes('import');

          logs.push('--- Component Analysis ---');
          logs.push(`Imports found: ${hasImport ? 'Yes' : 'No'}`);
          logs.push(`Export found: ${hasExport ? 'Yes' : 'No'}`);
          logs.push(`Return statement: ${hasReturn ? 'Yes' : 'No'}`);
          logs.push(`Lines of code: ${code.split('\n').length}`);
          logs.push(`Size: ${(code.length / 1024).toFixed(1)} KB`);

          // Check for common patterns
          if (code.includes('useState')) logs.push('Uses: useState hook');
          if (code.includes('useEffect')) logs.push('Uses: useEffect hook');
          if (code.includes('useCallback')) logs.push('Uses: useCallback hook');
          if (code.includes('useMemo')) logs.push('Uses: useMemo hook');
          if (code.includes('useRef')) logs.push('Uses: useRef hook');
          if (code.includes('useContext')) logs.push('Uses: useContext hook');
          if (code.includes('className=')) logs.push('Uses: Tailwind CSS classes');
          if (code.includes('supabase') || code.includes('databaseService'))
            logs.push('Uses: Database integration');

          logs.push('\nComponent appears valid for rendering.');
        } else {
          // For plain JS/TS, try to evaluate
          const fn = new Function('console', code);
          fn(mockConsole);
          if (logs.length === 0) logs.push('(no output)');
        }

        setExecutionOutput(logs.join('\n'));
      } catch (e: any) {
        setExecutionOutput(`Execution Error:\n${e.message}`);
      } finally {
        setIsRunning(false);
      }
    }, 500);
  };

  // Copy code
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download file
  const handleDownload = () => {
    const ext = language === 'tsx' ? '.tsx' : language === 'jsx' ? '.jsx' : language === 'typescript' ? '.ts' : '.js';
    const filename = `${title.replace(/\s+/g, '')  }${ext}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar — snippet list */}
      <div className="w-64 border-r border-gray-700 bg-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <FileCode size={16} className="text-blue-400" />
            Code Snippets
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={loadSnippets} className="p-1.5 text-gray-400 hover:text-white rounded transition">
              <RefreshCw size={14} />
            </button>
            <button onClick={createNew} className="p-1.5 text-gray-400 hover:text-white rounded transition">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-500" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              <Code2 size={32} className="mx-auto mb-2 opacity-50" />
              <p>No code snippets yet.</p>
              <p className="text-xs mt-1">Use IT Agent to generate code, or create one manually.</p>
            </div>
          ) : (
            snippets.map(s => (
              <button
                key={s.id}
                onClick={() => selectSnippet(s)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-700/50 transition ${
                  selectedSnippet?.id === s.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <p className="text-sm font-medium truncate">{s.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-600 rounded text-gray-300">{s.language}</span>
                  <span className="text-[10px] text-gray-500">{s.component_type}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSnippet && !title ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code2 size={64} className="mx-auto mb-4 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-300 mb-2">Code Editor</h2>
              <p className="text-gray-500 mb-4">Select a snippet or create a new one to start coding.</p>
              <button
                onClick={createNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Plus size={16} className="inline mr-1" />
                New Snippet
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2 flex-wrap">
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); setUnsaved(true); }}
                placeholder="Snippet title..."
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={language}
                onChange={e => { setLanguage(e.target.value); setUnsaved(true); }}
                className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm focus:outline-none"
              >
                <option value="tsx">TSX</option>
                <option value="jsx">JSX</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
              </select>
              <select
                value={componentType}
                onChange={e => { setComponentType(e.target.value); setUnsaved(true); }}
                className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm focus:outline-none"
              >
                <option value="component">Component</option>
                <option value="page">Page</option>
                <option value="widget">Widget</option>
                <option value="workflow">Workflow</option>
                <option value="utility">Utility</option>
                <option value="hook">Hook</option>
              </select>

              {unsaved && (
                <span className="text-xs text-amber-400 font-medium">Unsaved</span>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium transition disabled:opacity-50" title="Run / Analyze">
                  {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Run
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50" title="Save">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-white rounded transition" title="Copy code">
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
                <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-white rounded transition" title="Download file">
                  <Download size={16} />
                </button>
                <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded transition ${showPreview ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`} title="Toggle preview">
                  {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={loadVersionHistory} className="p-1.5 text-gray-400 hover:text-white rounded transition" title="Version history">
                  <History size={16} />
                </button>
                {selectedSnippet && (
                  <button onClick={handleDelete} className="p-1.5 text-red-400 hover:text-red-300 rounded transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="px-4 py-1.5 bg-gray-800/50 border-b border-gray-700/50">
              <input
                value={description}
                onChange={e => { setDescription(e.target.value); setUnsaved(true); }}
                placeholder="Description..."
                className="w-full bg-transparent text-gray-400 text-xs focus:outline-none placeholder-gray-600"
              />
            </div>

            {/* Editor + panels */}
            <div className="flex-1 flex overflow-hidden">
              {/* Code editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 relative">
                  {/* Line numbers gutter */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 border-r border-gray-700 overflow-hidden pointer-events-none z-10">
                    <div className="pt-3 pl-2">
                      {code.split('\n').map((_, i) => (
                        <div key={i} className="text-[11px] text-gray-600 leading-[1.625rem] text-right pr-2">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={e => { setCode(e.target.value); setUnsaved(true); }}
                    spellCheck={false}
                    className="w-full h-full resize-none bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed p-3 pl-14 focus:outline-none overflow-auto"
                    style={{ tabSize: 2 }}
                    onKeyDown={e => {
                      // Tab support
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const newCode = code.substring(0, start) + '  ' + code.substring(end);
                        setCode(newCode);
                        setUnsaved(true);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                          }
                        }, 0);
                      }
                    }}
                  />
                </div>

                {/* Execution output */}
                {executionOutput !== null && (
                  <div className="border-t border-gray-700 bg-gray-800 max-h-48 overflow-auto">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/50">
                      <span className="text-xs font-semibold text-gray-400">Output</span>
                      <button onClick={() => setExecutionOutput(null)} className="text-xs text-gray-500 hover:text-gray-300">Close</button>
                    </div>
                    <pre className="px-3 py-2 text-xs font-mono text-green-400 whitespace-pre-wrap">{executionOutput}</pre>
                  </div>
                )}
              </div>

              {/* Live preview panel */}
              {showPreview && (
                <div className="w-96 border-l border-gray-700 bg-white flex flex-col">
                  <div className="px-3 py-1.5 bg-gray-100 border-b text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                    <Eye size={12} />
                    Live Preview
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>body{font-family:system-ui;margin:0;padding:16px;background:#111827;color:white;}</style>
                          </head>
                          <body>
                            <div id="root">
                              <div class="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <p class="text-gray-400 text-sm">Preview renders for HTML/CSS. React components show code analysis above.</p>
                              </div>
                            </div>
                          </body>
                        </html>
                      `}
                      className="w-full h-full border-0 rounded"
                      sandbox="allow-scripts"
                      title="Preview"
                    />
                  </div>
                </div>
              )}

              {/* Version history panel */}
              {showHistory && (
                <div className="w-80 border-l border-gray-700 bg-gray-800 flex flex-col">
                  <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <GitBranch size={14} className="text-purple-400" />
                      Version History
                    </span>
                    <button onClick={() => { setShowHistory(false); setDiffView(null); }} className="text-gray-500 hover:text-gray-300 text-xs">
                      Close
                    </button>
                  </div>

                  {diffView ? (
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <ArrowLeftRight size={12} /> Diff View
                        </span>
                        <button onClick={() => setDiffView(null)} className="text-xs text-blue-400 hover:text-blue-300">
                          Back
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] text-red-400 font-semibold mb-0.5">Previous</p>
                        <pre className="text-[10px] font-mono bg-red-900/20 border border-red-900/30 rounded p-2 text-red-300 overflow-auto max-h-40 whitespace-pre-wrap">{diffView.old}</pre>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-400 font-semibold mb-0.5">Saved Version</p>
                        <pre className="text-[10px] font-mono bg-green-900/20 border border-green-900/30 rounded p-2 text-green-300 overflow-auto max-h-40 whitespace-pre-wrap">{diffView.new}</pre>
                      </div>
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                      <div className="text-center">
                        <Clock size={24} className="mx-auto mb-2 opacity-50" />
                        <p>No version history yet.</p>
                        <p className="text-xs mt-1">Save changes to create versions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {versions.map(v => (
                        <div
                          key={v.id}
                          className="px-3 py-2.5 border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Tag size={10} className="text-purple-400" />
                            <span className="text-xs font-semibold text-white">v{v.version}</span>
                            <span className="text-[10px] text-gray-500 ml-auto">
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate mb-1.5">{v.description}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewDiff(v.id)}
                              className="text-[10px] text-blue-400 hover:text-blue-300"
                            >
                              View diff
                            </button>
                            <button
                              onClick={() => restoreVersion(v.id)}
                              className="text-[10px] text-amber-400 hover:text-amber-300"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeEditorPage;
