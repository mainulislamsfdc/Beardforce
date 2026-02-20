import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">RunwayCRM</span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Who We Are</h2>
            <p>RunwayCRM ("we", "our", "us") operates www.runwaycrm.com, an AI-powered CRM platform. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-gray-200 mb-2">Information you provide:</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Account details (email address, password hash)</li>
              <li>CRM data you enter (leads, contacts, opportunities, notes)</li>
              <li>Integration credentials you configure (API keys stored encrypted server-side)</li>
              <li>Support communications</li>
            </ul>
            <h3 className="text-base font-medium text-gray-200 mb-2">Information we collect automatically:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Usage logs (which features you use, frequency of AI agent calls)</li>
              <li>Error and performance telemetry</li>
              <li>IP address and browser type for security purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the Service</li>
              <li>To process AI agent requests on your behalf</li>
              <li>To manage subscriptions and billing (via Stripe)</li>
              <li>To send transactional emails (account verification, invoices)</li>
              <li>To improve the Service and fix bugs</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do <strong className="text-white">not</strong> sell your personal data to third parties. We do not use your CRM data to train AI models.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. AI Processing</h2>
            <p>When you interact with AI agents, your messages and relevant CRM data are sent to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-white">Google Gemini API</strong> — for agent responses (via our secure server-side proxy; your API key is never exposed)</li>
              <li><strong className="text-white">Anthropic Claude API</strong> — for IT agent code generation tasks only</li>
            </ul>
            <p className="mt-3">These providers process data under their own privacy policies. We recommend reviewing <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Google's Privacy Policy</a> and <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Anthropic's Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage & Security</h2>
            <p>Your data is stored in Supabase (PostgreSQL on AWS infrastructure). We implement:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Row-level security (RLS) so each user can only access their own data</li>
              <li>Encrypted connections (TLS) in transit</li>
              <li>Encrypted storage at rest</li>
              <li>Server-side API key storage — AI provider keys never reach the browser</li>
            </ul>
            <p className="mt-3">Despite our measures, no system is 100% secure. In the event of a data breach, we will notify affected users as required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Third-Party Services</h2>
            <p>We use the following third parties to operate the Service:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 pr-6 text-gray-400 font-medium">Service</th>
                    <th className="text-left py-2 pr-6 text-gray-400 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    ['Supabase', 'Database, auth, serverless functions'],
                    ['Stripe', 'Payment processing and subscriptions'],
                    ['SendGrid', 'Transactional email (if configured)'],
                    ['Vercel', 'Hosting and CDN'],
                    ['Google Gemini', 'AI agent responses'],
                    ['Anthropic Claude', 'IT agent code generation'],
                  ].map(([svc, purpose]) => (
                    <tr key={svc}>
                      <td className="py-2 pr-6 text-white font-medium">{svc}</td>
                      <td className="py-2 text-gray-400">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
            <p>We use session cookies for authentication (Supabase JWT). We do not use tracking cookies or analytics cookies. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Data Retention</h2>
            <p>We retain your data while your account is active. If you delete your account, we will delete your personal data within 30 days, except where required to retain it for legal or billing purposes (e.g., invoices are retained for 7 years).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-white">Correction:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your account and data</li>
              <li><strong className="text-white">Portability:</strong> Export your CRM data via the Database Explorer</li>
              <li><strong className="text-white">Objection:</strong> Object to processing of your data</li>
            </ul>
            <p className="mt-3">To exercise these rights, email us at <a href="mailto:privacy@runwaycrm.com" className="text-orange-400 hover:text-orange-300">privacy@runwaycrm.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
            <p>The Service is not directed to children under 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or in-app notification. Continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>For privacy-related questions or requests: <a href="mailto:privacy@runwaycrm.com" className="text-orange-400 hover:text-orange-300">privacy@runwaycrm.com</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-300 transition-colors">← Back to RunwayCRM</Link>
      </footer>
    </div>
  );
}
