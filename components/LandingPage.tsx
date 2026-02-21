import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, Zap, CheckCircle, ArrowRight,
  MessageSquare, Database, Plug, Globe, Star,
  PlayCircle, X,
} from 'lucide-react';
import RunwayLogo from './RunwayLogo';

const DEMO_VIDEO_URL =
  'https://4cy8gd5pemhracns.public.blob.vercel-storage.com/RunwayCRM%20%E2%80%94%20The%20AI%20CRM%20That%20Runs%20Your%20Business_720p_caption.mp4';

// ── Pricing tiers ─────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try RunwayCRM with no credit card required.',
    features: [
      '4 AI agents (CEO, Sales, Marketing, IT)',
      '100 AI calls / month',
      'Lead & opportunity management',
      'Multi-agent meeting room',
      'Workflow automation (up to 10)',
      'Audit trail',
    ],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams who need more power.',
    features: [
      'Everything in Free',
      '5,000 AI calls / month',
      'Stripe, SendGrid & Slack integrations',
      'REST API access',
      'Up to 50 active workflows',
      'CSV export',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'White-label for agencies & large teams.',
    features: [
      'Everything in Pro',
      'Unlimited AI calls',
      'White-label branding & custom domain',
      'Custom agent personalities',
      'Tenant provisioning API',
      'Dedicated onboarding',
      'SLA support',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

// ── Feature highlights ────────────────────────────────────────────────────────
const features = [
  {
    icon: <Bot className="w-6 h-6 text-orange-400" />,
    title: 'Four AI Agents, One Team',
    body: 'CEO, Sales, Marketing, and IT agents collaborate in real time. Each has 10–21 tools connected to your live CRM data.',
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
    title: 'Multi-Agent Meeting Room',
    body: '@mention any agent mid-conversation. They hand off context seamlessly — like a real executive team.',
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    title: 'Event-Driven Workflows',
    body: 'Trigger automations on CRM events — new lead, deal won, overdue follow-up. Agents, integrations, and delays all in one flow.',
  },
  {
    icon: <Plug className="w-6 h-6 text-green-400" />,
    title: 'Integration Hub',
    body: 'Connect Stripe, SendGrid, and Slack in minutes. The Sales agent can send real emails. Webhooks fan out to all your tools.',
  },
  {
    icon: <Database className="w-6 h-6 text-purple-400" />,
    title: 'Full Database Explorer',
    body: 'Browse, edit, and export every CRM table. The IT agent can modify schemas, run bulk imports, and create snapshots.',
  },
  {
    icon: <Globe className="w-6 h-6 text-cyan-400" />,
    title: 'White-Label Ready',
    body: 'Custom branding, agent names, and domain. Resell it to your clients as your own AI CRM product.',
  },
];

// ── Social proof ──────────────────────────────────────────────────────────────
const testimonials = [
  {
    quote: 'Our Sales agent qualified 47 leads overnight while we slept. This is genuinely the future of CRM.',
    author: 'Lena M.',
    role: 'Founder, SaaS startup',
  },
  {
    quote: 'I white-labeled it for three agency clients in a weekend. The agent templates saved me weeks of setup.',
    author: 'Raj K.',
    role: 'Digital Agency Owner',
  },
  {
    quote: 'The meeting room is unlike anything else. I can @mention the CEO agent and get a full pipeline review in seconds.',
    author: 'Sara T.',
    role: 'Head of Sales, E-Commerce Brand',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── Video modal ───────────────────────────────────────────────────── */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
              aria-label="Close video"
            >
              <X className="w-4 h-4" />
            </button>
            <video
              src={DEMO_VIDEO_URL}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
            />
          </div>
        </div>
      )}
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <RunwayLogo size={36} showText textClassName="text-white font-bold text-lg tracking-tight" />
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero — full-width GIF background ─────────────────────────────── */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: '560px' }}>

        {/* GIF fills the entire hero */}
        <img
          src="https://media.giphy.com/media/l49JNg634XknnaCvC/giphy.gif"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        />

        {/* Layered overlay: strong at top (blends with nav) + bottom (blends with page),
            lighter in the middle so the GIF shows through */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(3,3,3,0.82) 0%, rgba(3,3,3,0.42) 28%, rgba(3,3,3,0.52) 65%, rgba(3,3,3,0.92) 100%)',
          }}
        />

        {/* Hero content — sits on top of the GIF */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            <Star className="w-3 h-3" />
            AI-powered · Multi-agent · Production ready
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6 drop-shadow-lg">
            Every Business Deserves<br />
            <span className="text-orange-500">a Runway to Take Off.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow">
            RunwayCRM puts four AI agents — CEO, Sales, Marketing, and IT — on your team.
            They collaborate in real time to manage your pipeline, automate your workflows,
            and help your business reach cruising altitude. No complexity. Just results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors shadow-lg shadow-orange-500/30"
            >
              Start free — no card needed
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowVideo(true)}
              className="flex items-center gap-2 border border-white/20 hover:border-orange-400/60 bg-black/30 backdrop-blur-sm text-white hover:text-orange-300 px-8 py-3.5 rounded-xl font-medium text-base transition-colors"
            >
              <PlayCircle className="w-5 h-5 text-orange-400" />
              Watch demo
            </button>
          </div>
        </div>
      </section>

      {/* ── App preview ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-16 -mt-6 relative z-10">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-1 shadow-2xl">
          <div className="rounded-xl bg-gray-900 p-6 flex gap-4 h-64 overflow-hidden">
            {/* Sidebar mock */}
            <div className="w-48 shrink-0 space-y-1">
              {['Meeting Room', 'Lead Management', 'Workflows', 'Audit Trail', 'Settings'].map(item => (
                <div key={item} className={`text-xs px-3 py-2 rounded-lg ${item === 'Meeting Room' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500'}`}>
                  {item}
                </div>
              ))}
            </div>
            {/* Chat mock */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">S</div>
                <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 max-w-md">
                  I qualified 3 new leads this morning. Marcus Chen (TechCorp) has the highest score — I recommend moving him to the proposal stage.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold shrink-0">M</div>
                <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 max-w-md">
                  @CEO our Q3 campaign is tracking 22% above lead targets. I suggest reallocating $2k of the IT budget to paid ads.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold shrink-0">C</div>
                <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 max-w-md">
                  Approved. Sales, generate a proposal for Marcus Chen and draft the opening email.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything your team needs, AI-first</h2>
          <p className="text-gray-400 text-lg">No spreadsheets. No manual entry. Just tell your agents what you need.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="bg-gray-900/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-14">Loved by builders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.author} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-orange-400 fill-orange-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <div className="font-medium text-white text-sm">{t.author}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-lg">Start free. Scale when you need to.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border ${
                plan.highlight
                  ? 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/30'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              {plan.highlight && (
                <div className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-full inline-block mb-3">
                  Most popular
                </div>
              )}
              <div className="mb-4">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-gray-400 text-sm ml-1">{plan.period}</span>
              </div>
              <div className="font-semibold text-lg mb-1">{plan.name}</div>
              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
              <ul className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'border border-gray-700 hover:border-gray-500 text-gray-300'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to hire your AI team?</h2>
          <p className="text-gray-400 mb-8 text-lg">Free forever. No credit card. Up in 2 minutes.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors"
          >
            Create your free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-6 mb-4 flex-wrap">
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
          <a href="mailto:beardforcecare@gmail.com" className="hover:text-gray-300 transition-colors">Support</a>
        </div>
        <p>© {new Date().getFullYear()} RunwayCRM. All rights reserved.</p>
      </footer>
    </div>
  );
}
