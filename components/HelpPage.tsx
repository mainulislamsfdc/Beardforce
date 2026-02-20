import React, { useState } from 'react';
import { BookOpen, Users, Shield, Bot, Wrench, HelpCircle, ChevronDown, ChevronRight, ExternalLink, AlertTriangle, CheckCircle, Lightbulb, Terminal } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useBranding } from '../context/BrandingContext';

type Tab = 'getting-started' | 'user-guide' | 'agents' | 'admin-guide' | 'troubleshooting';

interface FAQItem {
  question: string;
  answer: string;
}

interface Section {
  title: string;
  content: React.ReactNode;
}

const HelpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { isAdmin } = useOrg();
  const { branding } = useBranding();
  const appName = branding.app_name || 'RunwayCRM';

  const tabs: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'user-guide', label: 'User Guide', icon: Users },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'admin-guide', label: 'Admin Guide', icon: Shield, adminOnly: true },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Collapsible Section Component ───
  const CollapsibleSection: React.FC<{ id: string; title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ id, title, children, defaultOpen }) => {
    const isOpen = expandedSections[id] ?? (defaultOpen || false);
    return (
      <div className="border border-gray-700 rounded-lg mb-3 overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition text-left"
        >
          <span className="text-white font-medium text-sm">{title}</span>
          {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
        {isOpen && <div className="px-4 py-3 bg-gray-800/50 text-gray-300 text-sm leading-relaxed">{children}</div>}
      </div>
    );
  };

  // ─── Tip / Warning Boxes ───
  const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-3 bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 my-3">
      <Lightbulb size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="text-blue-200 text-sm">{children}</div>
    </div>
  );

  const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-3 bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 my-3">
      <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="text-yellow-200 text-sm">{children}</div>
    </div>
  );

  const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex gap-4 mb-4">
      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <div className="text-gray-400 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );

  const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
    <pre className="bg-gray-900 border border-gray-700 rounded-lg p-3 my-2 overflow-x-auto">
      <code className="text-green-400 text-xs font-mono">{children}</code>
    </pre>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB: GETTING STARTED
  // ═══════════════════════════════════════════════════════════════
  const renderGettingStarted = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to {appName}</h2>
        <p className="text-gray-400 leading-relaxed">
          {appName} is an AI-powered CRM where you interact with specialized AI agents instead of
          navigating complex menus. Each agent has deep expertise in its domain and can execute real
          operations — from creating leads and managing pipelines to generating production-ready code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">Chat-First CRM</h3>
          </div>
          <p className="text-gray-400 text-sm">Tell your agents what you need in plain English. They handle database operations, analytics, email sending, and code generation.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">4 Specialized Agents</h3>
          </div>
          <p className="text-gray-400 text-sm">CEO for strategy, Sales for pipeline & email, Marketing for campaigns, IT for code & database. 53+ tools total.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">Integration Hub</h3>
          </div>
          <p className="text-gray-400 text-sm">Connect Stripe, SendGrid, and Slack. Agents can send real emails, process payments, and notify your team automatically.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">Workflow Automation</h3>
          </div>
          <p className="text-gray-400 text-sm">Event-driven workflows with agent steps, integration actions, and conditions. Pre-built templates for common use cases.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">Billing & Subscriptions</h3>
          </div>
          <p className="text-gray-400 text-sm">Free, Pro ($29/mo), and Enterprise ($99/mo) plans with AI usage metering. Upgrade in-app via Stripe Checkout.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <h3 className="text-white font-medium">White-Label & Marketplace</h3>
          </div>
          <p className="text-gray-400 text-sm">Custom branding, industry agent templates (Real Estate, SaaS, Healthcare…), and pre-built workflow recipes for your vertical.</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Quick Start Guide</h3>
        <Step number={1} title="Start at the Meeting Room">
          The Meeting Room (Dashboard) is your home base. It shows an executive overview of your CRM data and lets you launch multi-agent meetings where agents collaborate on complex tasks.
        </Step>
        <Step number={2} title="Chat with an Agent">
          Navigate to any agent using the sidebar. Type your request naturally — for example, tell the Sales Agent: "Create a new lead named John Smith from Acme Corp" and it will create the record in your database.
        </Step>
        <Step number={3} title="Manage Your Data">
          Use the <strong>Database</strong> section in the sidebar to browse your Leads, Contacts, Accounts, Opportunities, Orders, and Products directly. The <strong>Lead Management</strong> page gives you a visual kanban-style interface.
        </Step>
        <Step number={4} title="Review Agent Actions">
          The <strong>Audit Trail</strong> logs every action agents take. The <strong>Approval Queue</strong> shows changes that need your review before they're applied.
        </Step>
      </div>

      <Tip>
        Each agent remembers your conversation history within a session. You can have a back-and-forth conversation just like chatting with a colleague.
      </Tip>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB: USER GUIDE
  // ═══════════════════════════════════════════════════════════════
  const renderUserGuide = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">User Guide</h2>
      <p className="text-gray-400 text-sm mb-4">Complete reference for every feature in {appName}.</p>

      <CollapsibleSection id="ug-meeting" title="Meeting Room (Dashboard)" defaultOpen>
        <p>The Meeting Room is your executive dashboard that provides:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li><strong className="text-white">KPI Cards</strong> — Live counts of your leads, contacts, opportunities, and revenue</li>
          <li><strong className="text-white">Pipeline Chart</strong> — Visual breakdown of your sales pipeline stages</li>
          <li><strong className="text-white">Multi-Agent Meetings</strong> — Start a meeting where multiple agents collaborate on a topic (e.g., "Plan our Q3 growth strategy")</li>
          <li><strong className="text-white">Recent Activity</strong> — Latest changes and agent actions across the platform</li>
        </ul>
        <Tip>Use the Teams Meeting feature for complex decisions that need input from multiple agents simultaneously.</Tip>
      </CollapsibleSection>

      <CollapsibleSection id="ug-agents" title="Chatting with Agents">
        <p>Every agent chat works the same way:</p>
        <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-400">
          <li>Type your request in the message box at the bottom</li>
          <li>The agent processes your request, potentially executing database operations</li>
          <li>Results appear in the chat — data tables, generated code, analytics, etc.</li>
          <li>You can ask follow-up questions; the agent maintains context</li>
        </ol>

        <h4 className="text-white font-medium mt-4 mb-2">Example Requests:</h4>
        <div className="bg-gray-900 rounded-lg p-3 space-y-2">
          <p className="text-gray-400"><span className="text-orange-400">Sales:</span> "Create a lead for Jane Doe at TechCorp, email jane@techcorp.com"</p>
          <p className="text-gray-400"><span className="text-orange-400">Sales:</span> "Show me all leads with status qualified"</p>
          <p className="text-gray-400"><span className="text-orange-400">Marketing:</span> "Create an email campaign for our summer promotion"</p>
          <p className="text-gray-400"><span className="text-orange-400">CEO:</span> "Generate an executive dashboard for this month"</p>
          <p className="text-gray-400"><span className="text-orange-400">IT:</span> "Show me the schema for the leads table"</p>
          <p className="text-gray-400"><span className="text-orange-400">IT:</span> "Generate a component called CustomerProfile with API calls"</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="ug-leads" title="Lead Management">
        <p>The Lead Management page provides a dedicated interface for managing your sales leads:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li><strong className="text-white">Add leads</strong> using the form (name, email, phone, company, source, status)</li>
          <li><strong className="text-white">Filter</strong> by status: New, Contacted, Qualified, Proposal, Won, Lost</li>
          <li><strong className="text-white">Search</strong> across all lead fields</li>
          <li><strong className="text-white">View details</strong> and edit individual leads</li>
        </ul>
        <Tip>You can also create leads by asking the Sales Agent — it will fill in the fields from your natural language description.</Tip>
      </CollapsibleSection>

      <CollapsibleSection id="ug-database" title="Database Browser">
        <p>The Database section in the sidebar lets you browse all CRM tables directly:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li><strong className="text-white">Leads, Contacts, Accounts</strong> — Your core CRM entities</li>
          <li><strong className="text-white">Opportunities</strong> — Sales pipeline with stages and amounts</li>
          <li><strong className="text-white">Orders</strong> — Customer orders with status tracking</li>
          <li><strong className="text-white">Products</strong> — Your product catalog</li>
        </ul>
        <p className="mt-2">Each table view shows sortable columns with all record data. Click any row to see full details.</p>
      </CollapsibleSection>

      <CollapsibleSection id="ug-workflows" title="Workflows & Automation">
        <p>The Workflows page lets you build automation rules that trigger on events:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li><strong className="text-white">Triggers</strong> — When a lead is created, stage changes, etc.</li>
          <li><strong className="text-white">Actions</strong> — Send notifications, update fields, log events</li>
          <li><strong className="text-white">Conditions</strong> — Only run when specific criteria are met</li>
        </ul>
        <Tip>Ask the IT Agent to generate complex workflows — it can create complete automation code using the smart_code_task tool.</Tip>
      </CollapsibleSection>

      <CollapsibleSection id="ug-approvals" title="Approval Queue">
        <p>When agents make significant changes (schema modifications, data imports, etc.), they appear in the Approval Queue for your review. You can:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li><strong className="text-white">Approve</strong> — Apply the change</li>
          <li><strong className="text-white">Reject</strong> — Discard the proposed change</li>
          <li><strong className="text-white">Review details</strong> — See the before/after state of each change</li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection id="ug-audit" title="Audit Trail">
        <p>Every agent action is logged in the Audit Trail with full details:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li>Which agent performed the action</li>
          <li>What type of change was made (data, schema, code, etc.)</li>
          <li>Timestamp and before/after state</li>
          <li>Approval status</li>
        </ul>
        <p className="mt-2">Use this to maintain full transparency over what your AI agents are doing.</p>
      </CollapsibleSection>

      <CollapsibleSection id="ug-voice" title="Voice Interface">
        <p>The Voice Interface lets you talk to agents using your microphone. It uses the Web Speech API for speech-to-text and converts agent responses to spoken audio. Speak naturally and the active agent will process your request just like a typed message.</p>
        <Warning>Voice interface requires a modern browser (Chrome, Edge) with microphone permissions enabled.</Warning>
      </CollapsibleSection>

      <CollapsibleSection id="ug-code-editor" title="Code Editor">
        <p>The Code Editor page displays code snippets generated by the IT Agent. You can:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li>View all generated components and workflows</li>
          <li>Copy code to your clipboard</li>
          <li>Filter by component type (component, workflow, AI task)</li>
          <li>See which engine generated the code (Claude AI vs template)</li>
        </ul>
      </CollapsibleSection>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB: AI AGENTS
  // ═══════════════════════════════════════════════════════════════
  const renderAgents = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">AI Agent Reference</h2>
      <p className="text-gray-400 text-sm mb-4">Each agent has specialized tools and expertise. Here's what each can do for you.</p>

      <CollapsibleSection id="ag-ceo" title="CEO Agent — Strategic Oversight (10 tools)" defaultOpen>
        <p className="mb-3">Your executive-level strategist. Provides KPI dashboards, budget oversight, agent coordination, and strategic reports.</p>
        <h4 className="text-white font-medium mb-2">What to ask:</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>"Generate an executive dashboard for this quarter"</li>
          <li>"Review our AI budget status and spending projections"</li>
          <li>"Run a system health check"</li>
          <li>"Coordinate a lead-to-customer workflow across agents"</li>
          <li>"Set a sales goal of $100K for this quarter"</li>
          <li>"Generate a monthly strategic report focusing on revenue and growth"</li>
          <li>"Show me performance analytics for conversion rates"</li>
        </ul>
        <h4 className="text-white font-medium mb-2">Key Tools:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">generate_executive_dashboard</span> — KPI overview</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">monitor_agent_activity</span> — Agent tracking</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">review_budget_status</span> — AI spending</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">coordinate_agents</span> — Cross-agent workflows</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">system_health_check</span> — Full diagnostics</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">generate_strategic_report</span> — Reports</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">set_goals_and_kpis</span> — Goal setting</div>
          <div className="bg-gray-900 rounded px-2 py-1"><span className="text-orange-400">performance_analytics</span> — Trend analysis</div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="ag-sales" title="Sales Agent — Pipeline Management (12 tools)">
        <p className="mb-3">Your sales team lead. Manages the full sales lifecycle from lead creation to closed deals.</p>
        <h4 className="text-white font-medium mb-2">What to ask:</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>"Create a lead for John Smith at Acme Corp, email john@acme.com"</li>
          <li>"Show me all qualified leads"</li>
          <li>"Qualify lead [id] and score them"</li>
          <li>"Create an opportunity from lead [id] worth $50,000"</li>
          <li>"Move opportunity [id] to negotiation stage"</li>
          <li>"Generate a revenue forecast for this quarter"</li>
          <li>"Draft a follow-up email for Sarah at TechCo"</li>
          <li>"Create a quote for opportunity [id] with 10% discount"</li>
        </ul>
        <h4 className="text-white font-medium mb-2">Pipeline Stages:</h4>
        <div className="flex gap-2 flex-wrap mb-3">
          <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">Prospecting (10%)</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">Qualification (25%)</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">Proposal (50%)</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">Negotiation (75%)</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-green-900 px-2 py-1 rounded text-xs text-green-300">Won (100%)</span>
        </div>
        <h4 className="text-white font-medium mb-2">Lead Scoring:</h4>
        <p className="text-gray-400 text-sm">Leads are scored 0-100 based on data completeness: +20 for email, +20 for phone, +20 for company, +20 for industry/type, +10 for source, +10 for notes. Score above 60 = auto-qualified.</p>
      </CollapsibleSection>

      <CollapsibleSection id="ag-marketing" title="Marketing Agent — Campaigns & Content (10 tools)">
        <p className="mb-3">Your creative marketing manager. Creates campaigns, segments audiences, drafts content, and analyzes performance.</p>
        <h4 className="text-white font-medium mb-2">What to ask:</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>"Create an email campaign for our product launch"</li>
          <li>"Segment our audience by qualified leads"</li>
          <li>"Draft a promotional email about our summer sale"</li>
          <li>"Schedule a social media post for Twitter and LinkedIn"</li>
          <li>"Create a lead magnet — a beginner's guide ebook"</li>
          <li>"Set up an A/B test for our email subject lines"</li>
          <li>"Plan a content calendar for the next 4 weeks"</li>
          <li>"Set up a Google Ads campaign with $50/day budget targeting 'CRM software'"</li>
        </ul>
        <h4 className="text-white font-medium mb-2">Campaign Types:</h4>
        <div className="flex gap-2 flex-wrap">
          <span className="bg-purple-900/30 border border-purple-700 px-2 py-1 rounded text-xs text-purple-300">Email</span>
          <span className="bg-purple-900/30 border border-purple-700 px-2 py-1 rounded text-xs text-purple-300">Social</span>
          <span className="bg-purple-900/30 border border-purple-700 px-2 py-1 rounded text-xs text-purple-300">Ads</span>
          <span className="bg-purple-900/30 border border-purple-700 px-2 py-1 rounded text-xs text-purple-300">Content</span>
          <span className="bg-purple-900/30 border border-purple-700 px-2 py-1 rounded text-xs text-purple-300">Webinar</span>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="ag-it" title="IT Agent — Database & Code (21 tools)">
        <p className="mb-3">Your technical expert. Manages database schemas, generates production-ready code, creates system snapshots, and can leverage Claude AI for context-aware code generation.</p>
        <h4 className="text-white font-medium mb-2">What to ask:</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>"List all database tables"</li>
          <li>"Show me the schema for the contacts table"</li>
          <li>"Read all records from the leads table"</li>
          <li>"Insert a product: name 'Premium Oil', price 29.99, category 'oils'"</li>
          <li>"Create a restore point labeled 'before-migration'"</li>
          <li>"Generate a React component called CustomerDashboard with state and API calls"</li>
          <li>"Use smart_code_task to add a filter feature to the leads page"</li>
          <li>"Run a database performance report"</li>
        </ul>

        <h4 className="text-white font-medium mb-2">Claude AI Code Generation:</h4>
        <p className="text-gray-400 text-sm mb-2">
          The IT Agent uses a hybrid AI system: <strong className="text-white">Gemini</strong> handles chat routing and tool selection, while <strong className="text-white">Claude</strong> generates production-ready code with full project context. The <code className="bg-gray-900 px-1 rounded text-orange-400">smart_code_task</code> tool is the most powerful — it can generate features, fix bugs, refactor code, or explain architecture.
        </p>
        <Warning>Claude code generation requires an Anthropic API key with available credits. If Claude is unavailable, all code tools automatically fall back to template generators.</Warning>

        <h4 className="text-white font-medium mt-3 mb-2">Tool Categories:</h4>
        <div className="space-y-2">
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-white text-xs font-medium mb-1">Database (14 tools)</p>
            <p className="text-gray-500 text-xs">list_tables, get_table_schema, read_all_records, insert_record, search_records, analyze_table, create_table, add_column, modify_column, drop_column, create_index, backup_table, import_data, performance_report</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-white text-xs font-medium mb-1">Code Generation (5 tools) — Claude-Powered</p>
            <p className="text-gray-500 text-xs">generate_component, generate_workflow, modify_component, smart_code_task, list_code_snippets</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-white text-xs font-medium mb-1">System (2 tools)</p>
            <p className="text-gray-500 text-xs">create_restore_point, list_restore_points</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="ag-meetings" title="Multi-Agent Meetings">
        <p className="mb-3">The Teams Meeting feature lets multiple agents collaborate on complex requests. Instead of chatting with agents individually, you can bring them together in a virtual meeting room where they discuss and coordinate.</p>
        <h4 className="text-white font-medium mb-2">How it works:</h4>
        <ol className="list-decimal list-inside space-y-1 text-gray-400">
          <li>Go to Teams Meeting from the sidebar</li>
          <li>Select which agents should participate</li>
          <li>Describe the topic or problem to solve</li>
          <li>Watch as agents take turns contributing their expertise</li>
          <li>Each agent uses their specialized tools to provide data and insights</li>
        </ol>
        <Tip>Great for cross-functional planning: "Plan a product launch campaign" can have the CEO set goals, Marketing create the campaign, Sales prepare the pipeline, and IT generate the required components.</Tip>
      </CollapsibleSection>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB: ADMIN GUIDE
  // ═══════════════════════════════════════════════════════════════
  const renderAdminGuide = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">Administrator Guide</h2>
      <p className="text-gray-400 text-sm mb-4">
        This guide is for techno-functional administrators responsible for operating and maintaining {appName}.
        It covers platform configuration, user management, AI setup, and operational best practices.
      </p>

      <CollapsibleSection id="admin-access" title="1. Access Control & User Management" defaultOpen>
        <h4 className="text-white font-medium mb-2">Role-Based Access Control (RBAC)</h4>
        <p className="text-gray-400 mb-3">{appName} uses a three-tier role system enforced both client-side (UI gating) and server-side (Supabase Row Level Security):</p>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
            <span className="w-20 text-orange-400 text-sm font-medium">Admin</span>
            <span className="text-gray-400 text-sm">Full access. Can manage members, configure settings, access all data, approve changes, and customize branding/agents. First user is auto-provisioned as admin.</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
            <span className="w-20 text-blue-400 text-sm font-medium">Editor</span>
            <span className="text-gray-400 text-sm">Can use all agents, create/edit data, run workflows. Cannot access Settings or manage team members.</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
            <span className="w-20 text-gray-400 text-sm font-medium">Viewer</span>
            <span className="text-gray-400 text-sm">Read-only access. Can view dashboards, browse data, and chat with agents (read operations only).</span>
          </div>
        </div>

        <h4 className="text-white font-medium mb-2">Managing Team Members</h4>
        <p className="text-gray-400 mb-2">Go to <strong className="text-white">Settings &rarr; Access</strong> to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Invite new members by email</li>
          <li>Change a member's role (admin, editor, viewer)</li>
          <li>Remove members from the organization</li>
        </ul>

        <Warning>
          <strong>Auto-provisioning caveat:</strong> When a new user registers, the system attempts to automatically create an organization and assign them as admin. This can fail silently due to RLS policies. If a new user sees "MEMBER" instead of "ADMIN" in the sidebar, manually insert their organization and membership via Supabase SQL Editor (see Setup docs).
        </Warning>
      </CollapsibleSection>

      <CollapsibleSection id="admin-settings" title="2. Settings Overview (9 Tabs)">
        <p className="text-gray-400 mb-3">The Settings page is admin-only and contains 9 configuration tabs:</p>

        <div className="space-y-3">
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Access</h5>
            <p className="text-gray-500 text-xs">Team member management — invite, change roles, remove. Shows all org members with their roles and join dates.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Agents</h5>
            <p className="text-gray-500 text-xs">Customize AI agents — rename, change colors, pick avatars, set personality prompts. Changes are reflected throughout the UI.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Billing <span className="ml-1 text-orange-400 text-[10px] uppercase font-bold">New</span></h5>
            <p className="text-gray-500 text-xs">Subscription management — view current plan (Free / Pro / Enterprise), AI usage meter, upgrade via Stripe Checkout, or cancel. AI calls reset monthly.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Branding</h5>
            <p className="text-gray-500 text-xs">White-label configuration — set your app name, logo initial, and accent color. Applied globally across the login page, sidebar, and all UI.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Fields</h5>
            <p className="text-gray-500 text-xs">Dynamic field configuration — customize which fields appear for each entity type. Add industry-specific fields without changing code.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Integrations <span className="ml-1 text-orange-400 text-[10px] uppercase font-bold">New</span></h5>
            <p className="text-gray-500 text-xs">Plug-and-play integrations — connect Stripe (payments), SendGrid (email), or Slack (notifications). Credentials are stored server-side via Edge Functions.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Manifest</h5>
            <p className="text-gray-500 text-xs">Codebase Manifest management — generate, store, and lock the compressed project specification that Claude uses for code generation.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">System</h5>
            <p className="text-gray-500 text-xs">System information — database status, table counts, environment info, and agent performance diagnostics.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Rollback</h5>
            <p className="text-gray-500 text-xs">Snapshot management — view all system restore points created by agents, with the ability to restore to a previous state.</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="admin-integrations" title="3. Integration Hub">
        <p className="text-gray-400 mb-3">Connect third-party services via <strong className="text-white">Settings → Integrations</strong>. All credentials are stored server-side — never in the browser.</p>

        <div className="space-y-3">
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Stripe — Payments</h5>
            <p className="text-gray-500 text-xs">Accept payments, create checkout sessions, view invoices, and issue refunds. The Sales agent's <code className="text-orange-400">create_quote</code> tool can trigger a real Stripe checkout once connected.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">SendGrid — Email</h5>
            <p className="text-gray-500 text-xs">Send transactional and marketing emails. Once connected, the Sales agent's <code className="text-orange-400">draft_email</code> tool can send real emails — just ask "send this email to john@example.com now".</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <h5 className="text-white text-sm font-medium mb-1">Slack — Notifications</h5>
            <p className="text-gray-500 text-xs">Send workflow alerts, deal win celebrations, and meeting summaries to Slack channels. Uses an Incoming Webhook URL — no OAuth required.</p>
          </div>
        </div>
        <Tip>Integrations can also be triggered automatically by workflows. Example: when a lead is created → qualify with Sales agent → if score &gt; 80 → send Slack alert.</Tip>
      </CollapsibleSection>

      <CollapsibleSection id="admin-billing" title="4. Billing & Plans">
        <p className="text-gray-400 mb-3">Three plan tiers control AI usage limits and feature access:</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { name: 'Free', price: '$0', calls: '100 calls/mo', color: 'text-gray-400' },
            { name: 'Pro', price: '$29/mo', calls: '5,000 calls/mo', color: 'text-orange-400' },
            { name: 'Enterprise', price: '$99/mo', calls: 'Unlimited', color: 'text-amber-400' },
          ].map(p => (
            <div key={p.name} className="bg-gray-900 rounded-lg p-3 text-center">
              <p className={`text-sm font-bold ${p.color}`}>{p.name}</p>
              <p className="text-white text-xs font-medium mt-1">{p.price}</p>
              <p className="text-gray-500 text-xs mt-0.5">{p.calls}</p>
            </div>
          ))}
        </div>
        <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
          <li>AI call counter resets on the 1st of each month</li>
          <li>Upgrade opens a Stripe Checkout session (requires Stripe integration)</li>
          <li>Downgrade takes effect at the end of the billing period</li>
          <li>Pro unlocks: Integrations, REST API, CSV Export, Approval Queue</li>
          <li>Enterprise adds: White-label, custom agent prompts, unlimited API keys</li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection id="admin-api" title="5. REST API Access">
        <p className="text-gray-400 mb-3">Pro and Enterprise plans get programmatic API access to all CRM data.</p>
        <h4 className="text-white text-sm font-medium mb-2">Endpoints</h4>
        <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
          <p>GET    /functions/v1/api/leads</p>
          <p>POST   /functions/v1/api/leads</p>
          <p>PATCH  /functions/v1/api/leads/:id</p>
          <p>DELETE /functions/v1/api/leads/:id</p>
        </div>
        <p className="text-gray-400 text-sm mt-2">Same pattern for: <code className="text-orange-400">contacts</code>, <code className="text-orange-400">orders</code>, <code className="text-orange-400">opportunities</code>, <code className="text-orange-400">accounts</code>, <code className="text-orange-400">products</code></p>
        <h4 className="text-white text-sm font-medium mt-3 mb-2">Authentication</h4>
        <CodeBlock>{`curl https://<project>.supabase.co/functions/v1/api/leads \\
  -H "X-API-Key: rk_your_api_key" \\
  -H "Content-Type: application/json"`}</CodeBlock>
        <Tip>Generate API keys in Settings → System. Keys are hashed server-side — store the full key immediately, it won't be shown again.</Tip>
      </CollapsibleSection>

      <CollapsibleSection id="admin-claude" title="3. Claude AI Setup & Management">
        <p className="text-gray-400 mb-3">The IT Agent's code generation is powered by Claude AI via a Supabase Edge Function proxy. Here's how to set it up and maintain it:</p>

        <h4 className="text-white font-medium mb-2">Initial Setup</h4>
        <Step number={1} title="Get an Anthropic API Key">
          Sign up at <span className="text-blue-400">console.anthropic.com</span> and generate an API key. Load credits onto your account ($5-20 recommended for initial testing).
        </Step>
        <Step number={2} title="Deploy the Edge Function">
          <CodeBlock>{`npx supabase login\nnpx supabase link --project-ref YOUR_PROJECT_REF\nnpx supabase functions deploy claude-proxy --no-verify-jwt`}</CodeBlock>
        </Step>
        <Step number={3} title="Set the API Key as a Secret">
          <CodeBlock>{`npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key`}</CodeBlock>
        </Step>
        <Step number={4} title="Store & Lock the Manifest">
          Go to <strong className="text-white">Settings &rarr; Manifest</strong>, click <em>Generate & Store</em>, then <em>Lock as Baseline</em>.
        </Step>

        <h4 className="text-white font-medium mt-4 mb-2">Monitoring & Cost Control</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Claude calls are logged in the <code className="bg-gray-900 px-1 rounded text-xs">structured_changes</code> table with category <code className="bg-gray-900 px-1 rounded text-xs">ai_generated</code></li>
          <li>Use the CEO Agent's <code className="bg-gray-900 px-1 rounded text-xs">review_budget_status</code> tool to monitor AI spending</li>
          <li>Each Claude call uses approximately 3,000 manifest tokens + 500-2,000 prompt tokens + generated output</li>
          <li>Template fallback activates automatically if credits run out — no downtime</li>
        </ul>

        <Warning>
          The API key is stored as a Supabase Edge Function secret, never exposed to the browser. However, any authenticated user can trigger Claude calls through the IT Agent chat. Consider implementing rate limiting if costs are a concern.
        </Warning>
      </CollapsibleSection>

      <CollapsibleSection id="admin-db" title="4. Database Administration">
        <h4 className="text-white font-medium mb-2">Schema Overview</h4>
        <p className="text-gray-400 mb-3">{appName} uses 13+ PostgreSQL tables on Supabase, all protected by Row Level Security (RLS). The key tables are:</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900 rounded p-2">
            <p className="text-orange-400 text-xs font-medium">CRM Data</p>
            <p className="text-gray-500 text-xs">leads, contacts, accounts, opportunities, orders, products</p>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <p className="text-orange-400 text-xs font-medium">System</p>
            <p className="text-gray-500 text-xs">change_log, ai_budget, system_config, system_snapshots, code_snippets</p>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <p className="text-orange-400 text-xs font-medium">Organization</p>
            <p className="text-gray-500 text-xs">organizations, org_members</p>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <p className="text-orange-400 text-xs font-medium">AI Context</p>
            <p className="text-gray-500 text-xs">codebase_manifest, structured_changes</p>
          </div>
        </div>

        <h4 className="text-white font-medium mb-2">RLS Best Practices</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>All CRM tables use <code className="bg-gray-900 px-1 rounded text-xs">user_id = auth.uid()</code> for data isolation</li>
          <li>Organization tables use a <code className="bg-gray-900 px-1 rounded text-xs">SECURITY DEFINER</code> function to avoid circular references</li>
          <li>Never disable RLS in production — it's your primary data isolation layer</li>
          <li>When adding new tables, always create RLS policies before inserting data</li>
        </ul>

        <h4 className="text-white font-medium mt-3 mb-2">Backup & Recovery</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Use the IT Agent: "Create a restore point labeled 'weekly-backup'" before major changes</li>
          <li>Snapshots are stored in the <code className="bg-gray-900 px-1 rounded text-xs">system_snapshots</code> table as JSONB</li>
          <li>To restore: go to <strong className="text-white">Settings &rarr; Rollback</strong> and select a snapshot</li>
          <li>For full database backups, use Supabase Dashboard &rarr; Database &rarr; Backups</li>
        </ul>

        <Warning>
          Agent-created snapshots capture CRM data only (leads, contacts, etc.), not schema or system configuration. For full disaster recovery, rely on Supabase's built-in point-in-time recovery.
        </Warning>
      </CollapsibleSection>

      <CollapsibleSection id="admin-security" title="5. Security Considerations">
        <h4 className="text-white font-medium mb-2">Architecture Security Layers</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li><strong className="text-white">Supabase Auth</strong> — Email/password authentication with JWT sessions. Sessions auto-refresh. No OAuth configured by default.</li>
          <li><strong className="text-white">Row Level Security (RLS)</strong> — Every table has policies ensuring users only see their own data. This is server-enforced and cannot be bypassed from the client.</li>
          <li><strong className="text-white">Organization Scoping</strong> — Org members see shared data within their organization via the <code className="bg-gray-900 px-1 rounded text-xs">get_user_org_id()</code> function.</li>
          <li><strong className="text-white">Client-Side Role Gating</strong> — Admin-only UI (Settings) is conditionally rendered based on the user's role. This is a UX convenience — the real enforcement is RLS.</li>
          <li><strong className="text-white">API Key Isolation</strong> — The Anthropic API key is stored as a Supabase Edge Function secret, never sent to the browser. Gemini API key is in the client bundle (necessary for direct API calls from the browser).</li>
        </ol>

        <h4 className="text-white font-medium mt-4 mb-2">Recommendations</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">Rotate API keys periodically</strong> — Update Gemini and Anthropic keys quarterly</li>
          <li><strong className="text-white">Monitor the Audit Trail</strong> — Review agent actions weekly for unexpected operations</li>
          <li><strong className="text-white">Use Approval Queue</strong> — Don't let agents auto-approve schema changes. Review them first</li>
          <li><strong className="text-white">Restrict admin role</strong> — Only give admin access to users who need to configure settings</li>
          <li><strong className="text-white">Review code snippets</strong> — AI-generated code should be reviewed before deployment to production</li>
        </ul>

        <Tip>
          The Gemini API key is visible in the client-side bundle. While it's protected by Google's API key restrictions, consider adding HTTP referrer restrictions in the Google Cloud Console to limit usage to your domain only.
        </Tip>
      </CollapsibleSection>

      <CollapsibleSection id="admin-perf" title="6. Performance & Scaling">
        <h4 className="text-white font-medium mb-2">Current Architecture Constraints</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>All AI calls are client-side (browser &rarr; Gemini API). Each agent chat session holds history in memory</li>
          <li>Database queries go through the Supabase client SDK — no connection pooling needed for typical usage</li>
          <li>The codebase manifest is loaded once per IT Agent code generation call (~3K tokens)</li>
          <li>Lazy loading splits the bundle into ~20 chunks for fast initial load</li>
        </ul>

        <h4 className="text-white font-medium mb-2">Scaling Recommendations</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">50+ users</strong> — Monitor Supabase connection limits (free tier: 60 connections). Consider upgrading to Supabase Pro</li>
          <li><strong className="text-white">High AI usage</strong> — Gemini's free tier has rate limits (15 RPM). For production, use a paid Google AI plan</li>
          <li><strong className="text-white">Large datasets</strong> — Add database indexes on frequently queried columns. Use the IT Agent's <code className="bg-gray-900 px-1 rounded text-xs">create_index</code> tool</li>
          <li><strong className="text-white">International deployment</strong> — Supabase regions can be configured for latency optimization</li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection id="admin-custom" title="7. Customization Best Practices">
        <h4 className="text-white font-medium mb-2">Adapting for a New Industry</h4>
        <p className="text-gray-400 mb-3">Follow these steps to repurpose {appName} for a different vertical:</p>

        <Step number={1} title="Update Branding">
          Go to <strong className="text-white">Settings &rarr; Branding</strong>. Change the app name, logo initial, and accent color to match your brand identity.
        </Step>
        <Step number={2} title="Rename Agents">
          Go to <strong className="text-white">Settings &rarr; Agents</strong>. Rename agents to fit your domain — e.g., "IT Manager" to "Technical Architect", "Sales Manager" to "Business Development Lead".
        </Step>
        <Step number={3} title="Configure Fields">
          Go to <strong className="text-white">Settings &rarr; Fields</strong>. Add industry-specific fields to your entities. Remove irrelevant default fields (e.g., remove "beard_type" for a non-grooming business).
        </Step>
        <Step number={4} title="Update the Manifest">
          After configuration changes, go to <strong className="text-white">Settings &rarr; Manifest</strong> and regenerate the manifest so Claude AI understands your updated project context.
        </Step>

        <Tip>
          The platform's default data model (leads, contacts, accounts, opportunities, orders, products) follows standard CRM conventions. It works for most B2B and B2C industries without structural changes.
        </Tip>
      </CollapsibleSection>

      <CollapsibleSection id="admin-ops" title="8. Operational Checklist">
        <h4 className="text-white font-medium mb-2">Daily</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>Review the Approval Queue for pending agent actions</li>
          <li>Check the Meeting Room dashboard for KPI anomalies</li>
        </ul>

        <h4 className="text-white font-medium mb-2">Weekly</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>Review the Audit Trail for unusual agent activity</li>
          <li>Ask the CEO Agent for a weekly strategic report</li>
          <li>Create a system restore point via the IT Agent</li>
          <li>Monitor AI budget usage via the CEO Agent's budget tool</li>
        </ul>

        <h4 className="text-white font-medium mb-2">Monthly</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li>Review and rotate API keys if needed</li>
          <li>Check Supabase usage metrics (storage, bandwidth, connections)</li>
          <li>Regenerate the codebase manifest if significant changes were made</li>
          <li>Review code snippets generated by the IT Agent for quality</li>
          <li>Clean up old restore points to save database storage</li>
        </ul>

        <h4 className="text-white font-medium mb-2">On User Onboarding</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Verify their org membership was created (check <code className="bg-gray-900 px-1 rounded text-xs">org_members</code>)</li>
          <li>Assign appropriate role (admin/editor/viewer)</li>
          <li>Share this Help guide with them (accessible from the sidebar)</li>
          <li>Recommend they start with the Getting Started tab</li>
        </ul>
      </CollapsibleSection>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB: TROUBLESHOOTING
  // ═══════════════════════════════════════════════════════════════
  const faqItems: FAQItem[] = [
    {
      question: 'Agent says "Database not connected" or "User ID not set"',
      answer: 'This means the database service hasn\'t been initialized for your session. This usually resolves by refreshing the page. If it persists, check that your Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are correctly set.'
    },
    {
      question: 'I registered but my role shows "MEMBER" instead of "ADMIN"',
      answer: 'Auto-provisioning of the first user\'s organization can fail silently due to RLS policies. An existing admin needs to go to Settings → Access and update your role, or the organization needs to be manually created via the Supabase SQL Editor. See the Setup documentation for the exact SQL commands.'
    },
    {
      question: 'Settings page is missing from the sidebar',
      answer: 'Settings is only visible to users with the "admin" role. Check your role in the bottom-left of the sidebar. If it shows "VIEWER" or "EDITOR", ask your administrator to upgrade your role to "admin" via Settings → Access.'
    },
    {
      question: 'Claude AI returns "credit balance too low" error',
      answer: 'Your Anthropic API key is valid but the account has no credits. Go to console.anthropic.com → Settings → Billing to add credits. The IT Agent\'s code generation will automatically fall back to template generators until credits are available — no functionality is lost, only the quality of generated code.'
    },
    {
      question: 'Claude AI shows "unavailable" in the Manifest tab',
      answer: 'The Claude proxy edge function isn\'t deployed or the API key isn\'t set. Deploy with: npx supabase functions deploy claude-proxy --no-verify-jwt. Then set the key: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...'
    },
    {
      question: 'Agent responses are slow or timing out',
      answer: 'AI responses depend on Gemini API latency (typically 2-5 seconds). If responses consistently take longer than 10 seconds, check: (1) Your internet connection, (2) Google AI rate limits (free tier: 15 requests/minute), (3) The complexity of the request — multi-tool calls take longer as the agent executes operations sequentially.'
    },
    {
      question: 'I see "GoTrueClient instances detected" warnings in the console',
      answer: 'This is a known non-critical warning from the Supabase Auth library when multiple components initialize the client. It doesn\'t affect functionality. You can safely ignore it.'
    },
    {
      question: 'Data I created in one agent isn\'t visible in another',
      answer: 'All agents share the same database and user context. If data appears missing, try: (1) Refreshing the page, (2) Checking that you\'re looking at the right table, (3) Verifying the data was actually created (check Audit Trail or Database Browser). All data is scoped to your user_id — you won\'t see data created by other users.'
    },
    {
      question: 'The IT Agent generated code but it has errors',
      answer: 'Template-generated code includes TODO placeholders that need to be completed. Claude-generated code is more complete but should still be reviewed before use in production. Always check the "engine" field in the response — "claude" means AI-generated, "template" means scaffold-only.'
    },
    {
      question: 'I accidentally deleted data or broke something',
      answer: 'Check if there\'s a restore point: go to Settings → Rollback (admin only) or ask the IT Agent "list restore points". If a recent snapshot exists, you can restore from it. For database-level recovery, use Supabase Dashboard → Database → Backups (requires Supabase Pro plan).'
    },
    {
      question: 'How do I add a new database table?',
      answer: 'Ask the IT Agent: "Create a table called [name] with columns: [column1] text, [column2] integer, etc." The agent will handle the SQL creation. Important: new tables created through the agent won\'t have RLS policies by default. An admin should add RLS policies via the Supabase SQL Editor for security.'
    },
    {
      question: 'Can I use this CRM for a non-beard/grooming business?',
      answer: 'Yes! RunwayCRM is fully white-label. Go to Settings → Branding to change the app name and colors. Settings → Fields to add industry-specific fields. Settings → Agents to rename the AI agents. The Marketplace has 5 industry agent templates (Real Estate, SaaS, E-Commerce, Healthcare, Finance).'
    },
    {
      question: 'Integration shows "connected" but emails/payments are not working',
      answer: 'Integration credentials are proxied through Supabase Edge Functions. Ensure: (1) The Edge Function is deployed (stripe-proxy, email-proxy), (2) The secret key is set via supabase secrets set, (3) The integration is toggled ON in Settings → Integrations. Check the webhook_events table in Database Browser for any error payloads.'
    },
    {
      question: 'Workflow triggered but no action occurred',
      answer: 'Check workflow_runs in the Database Browser to see the run log. Common causes: (1) Condition step evaluated to false (check the "passed" field in the result), (2) Integration step failed because integration is not connected, (3) Agent step failed because VITE_GEMINI_API_KEY is not set. The workflow engine catches errors per-step without stopping the run.'
    },
    {
      question: 'Billing tab shows "Free" even after upgrading',
      answer: 'After a Stripe Checkout session, the webhook must fire to update the subscription. Ensure the webhook-handler Edge Function is deployed and registered in your Stripe dashboard. Until the webhook fires, manually update via Supabase SQL: UPDATE subscriptions SET plan=\'pro\', ai_calls_limit=5000 WHERE user_id=\'your-uid\'.'
    },
    {
      question: 'REST API returns 401 Unauthorized',
      answer: 'Check that: (1) The api Edge Function is deployed, (2) You are sending the X-API-Key header (not Authorization), (3) The API key is active (check api_keys table in Database Browser), (4) The key has not expired. Generate new keys via the Supabase SQL Editor if needed.'
    }
  ];

  const renderTroubleshooting = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-2">Troubleshooting & FAQ</h2>
      <p className="text-gray-400 text-sm mb-4">Common questions and solutions for {appName}.</p>

      <div className="space-y-2">
        {faqItems.map((item, index) => (
          <div key={index} className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition text-left"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={16} className="text-orange-400 flex-shrink-0" />
                <span className="text-white text-sm font-medium">{item.question}</span>
              </div>
              {expandedFAQ === index ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
            </button>
            {expandedFAQ === index && (
              <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                <p className="text-gray-300 text-sm leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2">Still Need Help?</h3>
        <p className="text-gray-400 text-sm mb-3">Try these resources:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
          <li>Ask the <strong className="text-white">IT Agent</strong> — it can diagnose database issues and run system checks</li>
          <li>Ask the <strong className="text-white">CEO Agent</strong> — "Run a system health check" provides comprehensive diagnostics</li>
          <li>Check the <strong className="text-white">Audit Trail</strong> for recent changes that may have caused issues</li>
          <li>Review your <strong className="text-white">Supabase Dashboard</strong> for database logs and error details</li>
        </ul>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto bg-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <BookOpen size={22} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Help & Documentation</h1>
            <p className="text-gray-400 text-sm">Learn how to use {appName} effectively</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6 overflow-x-auto">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'getting-started' && renderGettingStarted()}
        {activeTab === 'user-guide' && renderUserGuide()}
        {activeTab === 'agents' && renderAgents()}
        {activeTab === 'admin-guide' && renderAdminGuide()}
        {activeTab === 'troubleshooting' && renderTroubleshooting()}
      </div>
    </div>
  );
};

export default HelpPage;
