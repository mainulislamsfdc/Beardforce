import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function TermsPage() {
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

      <main className="max-w-4xl mx-auto px-6 py-16 prose prose-invert prose-gray max-w-none">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using RunwayCRM ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms apply to all visitors, users, and others who access the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>RunwayCRM is an AI-powered customer relationship management platform that provides AI agents (CEO, Sales, Marketing, IT) to manage business data, automate workflows, and support sales and marketing operations. The Service is provided "as is" and may change at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
            <p>You must create an account to use the Service. You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Providing accurate and complete registration information</li>
              <li>Maintaining the security of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
            <p className="mt-3">You must be at least 18 years old to use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Upload malicious code or attempt to compromise the platform's security</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Use the Service for spamming, harassment, or unsolicited communications</li>
              <li>Resell or redistribute the Service without an explicit white-label agreement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. AI-Generated Content</h2>
            <p>The Service uses artificial intelligence to generate responses, recommendations, and content. You acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>AI-generated content may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing and verifying AI outputs before acting on them</li>
              <li>RunwayCRM is not liable for business decisions made based on AI recommendations</li>
              <li>AI agents operate on data you provide — the quality of output depends on your data quality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Subscription & Billing</h2>
            <p>Paid plans are billed monthly. By subscribing, you authorize us to charge your payment method on a recurring basis. You may cancel at any time; cancellation takes effect at the end of the current billing period. We reserve the right to change pricing with 30 days notice. No refunds are provided for partial months.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data & Privacy</h2>
            <p>Your use of the Service is also governed by our <Link to="/privacy" className="text-orange-400 hover:text-orange-300">Privacy Policy</Link>. By using the Service, you consent to our data practices as described therein. You retain ownership of all data you input into the Service. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p>The Service, including its design, code, and branding, is owned by RunwayCRM and protected by applicable intellectual property laws. Nothing in these Terms transfers ownership of any intellectual property to you. You grant us a non-exclusive license to use data you provide solely to operate and improve the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimers & Limitation of Liability</h2>
            <p>The Service is provided "as is" without warranty of any kind. To the fullest extent permitted by law, RunwayCRM disclaims all warranties, express or implied. In no event shall RunwayCRM be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits or revenue, whether incurred directly or indirectly. Our total liability to you shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account at any time if you violate these Terms or if we determine, in our sole discretion, that your use of the Service is harmful. Upon termination, your right to use the Service immediately ceases. You may export your data before account closure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to Terms</h2>
            <p>We may modify these Terms at any time. We will notify you of material changes by email or in-app notification. Continued use of the Service after changes constitute acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>For questions about these Terms, contact us at: <a href="mailto:legal@runwaycrm.com" className="text-orange-400 hover:text-orange-300">legal@runwaycrm.com</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-300 transition-colors">← Back to RunwayCRM</Link>
      </footer>
    </div>
  );
}
