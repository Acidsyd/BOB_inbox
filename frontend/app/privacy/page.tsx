import Link from 'next/link'
import { Shield, Lock, Eye, Mail, Trash2, Settings, Globe, FileText } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy - BOBinbox Email Management Platform',
  description: 'Learn how BOBinbox collects, uses, and protects your data. Our privacy policy explains our data practices and your rights under GDPR.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold gradient-text">BOBinbox</Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
              <Link href="/register">
                <button className="btn-primary">Start Free Trial</button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 gradient-bg">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Last updated: December 1, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Introduction */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              QQuadro (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates BOBinbox (the &quot;Service&quot;), an email management platform
              accessible at qquadro.com. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our Service.
            </p>
            <p className="text-gray-600">
              We are committed to protecting your privacy and complying with the General Data Protection Regulation
              (GDPR) and other applicable data protection laws.
            </p>
          </div>

          {/* Google API Disclosure */}
          <div className="mb-12 bg-blue-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Google API Services Usage Disclosure</h2>
                <p className="text-gray-600 mb-4">
                  BOBinbox uses Google API Services to provide email management functionality. Our use and transfer
                  of information received from Google APIs adheres to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 underline"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>

                <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Google OAuth2 Scopes We Request:</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lock className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-900">gmail.send</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Allows BOBinbox to send emails on your behalf. This is used for composing and sending
                      new emails, replying to conversations, and scheduling email campaigns.
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">gmail.readonly</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Allows BOBinbox to read your emails. This is used to display your inbox, sync
                      conversations, detect replies, and provide the unified inbox functionality.
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Settings className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">gmail.modify</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Allows BOBinbox to modify email labels and message status. This is used for
                      organizing emails, marking messages as read/unread, and managing conversation threads.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Collection */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Email address and name (provided during registration)</li>
              <li>Account credentials (passwords are hashed, never stored in plain text)</li>
              <li>Organization and team information</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Email Data (via Google OAuth2)</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Email content, subject lines, and metadata for display in our interface</li>
              <li>Email addresses of senders and recipients</li>
              <li>Attachment information</li>
              <li>Email labels and folder organization</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Technical Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>IP addresses and browser information</li>
              <li>Device type and operating system</li>
              <li>Usage data and analytics</li>
            </ul>
          </div>

          {/* How We Use Data */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and maintain the BOBinbox email management service</li>
              <li>Display your emails in a unified inbox interface</li>
              <li>Send emails on your behalf when you compose messages</li>
              <li>Sync your email accounts and maintain conversation threads</li>
              <li>Provide email scheduling and campaign management features</li>
              <li>Detect and track email replies and bounces</li>
              <li>Improve and optimize our Service</li>
              <li>Communicate with you about service updates</li>
            </ul>
          </div>

          {/* Data Security */}
          <div className="mb-12 bg-green-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-600 mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li><strong>OAuth2 Authentication:</strong> We use Google&apos;s OAuth2 protocol - we never see or store your Google password</li>
                  <li><strong>Token Encryption:</strong> OAuth2 access tokens are encrypted at rest using AES-256 encryption</li>
                  <li><strong>Secure Transmission:</strong> All data is transmitted over HTTPS/TLS</li>
                  <li><strong>Database Security:</strong> Data is stored in Supabase with row-level security policies</li>
                  <li><strong>Access Controls:</strong> Multi-tenant architecture ensures users can only access their own data</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Sharing */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              <strong>We do not sell, trade, or rent your personal information to third parties.</strong>
            </p>
            <p className="text-gray-600 mb-4">We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform (e.g., Supabase for database hosting)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>
          </div>

          {/* GDPR Rights */}
          <div className="mb-12 bg-purple-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights (GDPR)</h2>
                <p className="text-gray-600 mb-4">
                  Under the General Data Protection Regulation (GDPR), you have the following rights:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing</li>
                  <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  To exercise these rights, please contact us at{' '}
                  <a href="mailto:difelice@qquadro.com" className="text-purple-600 hover:text-purple-700 underline">
                    difelice@qquadro.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Revoking Access */}
          <div className="mb-12">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Revoking Google Access</h2>
                <p className="text-gray-600 mb-4">
                  You can revoke BOBinbox&apos;s access to your Google account at any time:
                </p>
                <ol className="list-decimal pl-6 text-gray-600 space-y-2">
                  <li>Visit your Google Account&apos;s Security settings at{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 underline"
                    >
                      myaccount.google.com/permissions
                    </a>
                  </li>
                  <li>Find &quot;BOBinbox&quot; or &quot;bobinbogoogleauth&quot; in the list of connected apps</li>
                  <li>Click on it and select &quot;Remove Access&quot;</li>
                </ol>
                <p className="text-gray-600 mt-4">
                  Once revoked, BOBinbox will no longer be able to access your Gmail data. You can also
                  delete your account from within the BOBinbox settings to remove all stored data.
                </p>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your personal data for as long as your account is active or as needed to provide
              you with our services. Email data synced from your Google account is retained to provide
              the unified inbox functionality.
            </p>
            <p className="text-gray-600">
              Upon account deletion, we will delete your personal data within 30 days, except where we
              are required to retain it for legal or regulatory purposes.
            </p>
          </div>

          {/* Cookies */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-4">
              We use essential cookies to maintain your session and provide core functionality.
              We may also use analytics cookies to understand how users interact with our Service.
            </p>
            <p className="text-gray-600">
              You can control cookie settings through your browser preferences.
            </p>
          </div>

          {/* Children */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Children&apos;s Privacy</h2>
            <p className="text-gray-600">
              BOBinbox is not intended for use by children under the age of 16. We do not knowingly
              collect personal information from children under 16. If you become aware that a child
              has provided us with personal data, please contact us.
            </p>
          </div>

          {/* Changes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              We encourage you to review this Privacy Policy periodically.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy or our data practices,
                  please contact us:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li><strong>Company:</strong> QQuadro</li>
                  <li><strong>Email:</strong>{' '}
                    <a href="mailto:difelice@qquadro.com" className="text-purple-600 hover:text-purple-700 underline">
                      difelice@qquadro.com
                    </a>
                  </li>
                  <li><strong>Website:</strong>{' '}
                    <a href="https://qquadro.com" className="text-purple-600 hover:text-purple-700 underline">
                      qquadro.com
                    </a>
                  </li>
                </ul>
                <p className="text-gray-600 mt-4">
                  <strong>Data Protection Authority:</strong> You also have the right to lodge a complaint
                  with the Italian Data Protection Authority (Garante per la protezione dei dati personali)
                  if you believe your rights have been violated.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="text-2xl font-bold mb-4">BOBinbox</div>
              <p className="text-gray-400 mb-4">
                The smart email client that unifies all your email accounts in one place.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">in</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">tw</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition">Integrations</Link></li>
                <li><Link href="/api" className="hover:text-white transition">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/guides" className="hover:text-white transition">Guides</Link></li>
                <li><Link href="/templates" className="hover:text-white transition">Templates</Link></li>
                <li><Link href="/case-studies" className="hover:text-white transition">Case Studies</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                <li><Link href="/careers" className="hover:text-white transition">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 BOBinbox. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-400 text-sm hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition">Privacy</Link>
              <Link href="/cookies" className="text-gray-400 text-sm hover:text-white transition">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
