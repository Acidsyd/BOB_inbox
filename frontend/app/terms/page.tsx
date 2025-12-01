import Link from 'next/link'
import { FileText, CheckCircle, AlertTriangle, Shield, Scale, Ban, Mail, Globe } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service - BOBinbox Email Management Platform',
  description: 'Read the Terms of Service for BOBinbox. These terms govern your use of our email management platform.',
}

export default function TermsPage() {
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
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Terms of <span className="gradient-text">Service</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Last updated: December 1, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Acceptance */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using BOBinbox (the &quot;Service&quot;), operated by QQuadro (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
              you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
              please do not use our Service.
            </p>
            <p className="text-gray-600">
              These Terms apply to all users of the Service, including visitors, registered users, and
              paying customers.
            </p>
          </div>

          {/* Service Description */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              BOBinbox is an email management platform that provides:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Unified inbox management for multiple email accounts</li>
              <li>Email composition, scheduling, and sending capabilities</li>
              <li>Email campaign management and automation</li>
              <li>Conversation threading and organization</li>
              <li>Analytics and tracking features</li>
            </ul>
            <p className="text-gray-600 mt-4">
              The Service integrates with third-party email providers, including Google Gmail,
              through their respective APIs.
            </p>
          </div>

          {/* Google API Terms */}
          <div className="mb-12 bg-blue-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Google API Services</h2>
                <p className="text-gray-600 mb-4">
                  When you connect your Google account to BOBinbox, you also agree to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>
                    <a
                      href="https://policies.google.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 underline"
                    >
                      Google Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 underline"
                    >
                      Google Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 underline"
                    >
                      Google API Services User Data Policy
                    </a>
                  </li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Our use of Google user data is limited to providing and improving the Service.
                  We adhere to the Limited Use requirements specified in Google&apos;s policies.
                </p>
              </div>
            </div>
          </div>

          {/* Account Responsibilities */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Account Responsibilities</h2>
            <p className="text-gray-600 mb-4">When you create an account, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security and confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Not share your account with others or transfer it without our consent</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You must be at least 16 years old to use the Service. By using BOBinbox, you represent
              that you meet this age requirement.
            </p>
          </div>

          {/* Acceptable Use */}
          <div className="mb-12 bg-red-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Ban className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use Policy</h2>
                <p className="text-gray-600 mb-4">
                  You agree NOT to use BOBinbox for:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li><strong>Spam:</strong> Sending unsolicited bulk emails or commercial messages without proper consent</li>
                  <li><strong>Phishing:</strong> Attempting to deceive recipients or steal personal information</li>
                  <li><strong>Malware Distribution:</strong> Sending emails containing viruses, malware, or harmful code</li>
                  <li><strong>Harassment:</strong> Sending threatening, abusive, or harassing messages</li>
                  <li><strong>Fraud:</strong> Engaging in deceptive practices or misrepresentation</li>
                  <li><strong>Illegal Activities:</strong> Any activities that violate applicable laws or regulations</li>
                  <li><strong>CAN-SPAM/GDPR Violations:</strong> Sending emails that violate anti-spam laws or privacy regulations</li>
                  <li><strong>Purchased Lists:</strong> Using purchased, rented, or scraped email lists</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 inline mr-2" />
                  Violation of this policy may result in immediate account suspension or termination.
                </p>
              </div>
            </div>
          </div>

          {/* Email Sending Guidelines */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Email Sending Guidelines</h2>
            <p className="text-gray-600 mb-4">When using BOBinbox to send emails, you must:</p>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">Only send emails to recipients who have given consent to receive them</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">Include accurate sender information and a valid physical address</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">Provide clear opt-out mechanisms when required by law</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">Honor unsubscribe requests promptly</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">Comply with all applicable email laws (CAN-SPAM, GDPR, CASL, etc.)</p>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The Service and its original content, features, and functionality are owned by QQuadro
              and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-gray-600">
              You retain ownership of any content you create or upload through the Service.
              By using the Service, you grant us a limited license to process your content
              solely for the purpose of providing the Service.
            </p>
          </div>

          {/* Service Availability */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive to maintain high availability of the Service, but we do not guarantee
              uninterrupted access. The Service may be temporarily unavailable due to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Scheduled maintenance and updates</li>
              <li>Technical issues or server problems</li>
              <li>Third-party service disruptions (including Google API outages)</li>
              <li>Circumstances beyond our reasonable control</li>
            </ul>
          </div>

          {/* Disclaimers */}
          <div className="mb-12 bg-yellow-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
                <p className="text-gray-600 mb-4">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                  EITHER EXPRESS OR IMPLIED.
                </p>
                <p className="text-gray-600 mb-4">
                  We do not warrant that:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>The Service will meet your specific requirements</li>
                  <li>The Service will be uninterrupted, secure, or error-free</li>
                  <li>Email delivery rates or deliverability are guaranteed</li>
                  <li>Any errors in the Service will be corrected</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, QQUADRO SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Loss of profits, revenue, or data</li>
              <li>Business interruption</li>
              <li>Email delivery failures or delays</li>
              <li>Damages resulting from unauthorized access to your account</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Our total liability shall not exceed the amount you paid for the Service in the
              twelve (12) months preceding the claim.
            </p>
          </div>

          {/* Termination */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
            <p className="text-gray-600 mb-4">
              <strong>By You:</strong> You may terminate your account at any time by deleting it
              through your account settings or by contacting us.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>By Us:</strong> We may suspend or terminate your account immediately, without
              prior notice, if:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You violate these Terms or our Acceptable Use Policy</li>
              <li>Your account is used for illegal activities</li>
              <li>We receive valid legal requests requiring termination</li>
              <li>We discontinue the Service (with reasonable notice)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Upon termination, your right to use the Service will cease immediately, and we may
              delete your account data in accordance with our Privacy Policy.
            </p>
          </div>

          {/* Indemnification */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
            <p className="text-gray-600">
              You agree to indemnify and hold harmless QQuadro and its officers, directors, employees,
              and agents from any claims, damages, losses, or expenses (including legal fees) arising
              from your use of the Service, your violation of these Terms, or your violation of any
              third-party rights.
            </p>
          </div>

          {/* Governing Law */}
          <div className="mb-12 bg-purple-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scale className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-600 mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of Italy,
                  without regard to its conflict of law provisions.
                </p>
                <p className="text-gray-600 mb-4">
                  For users in the European Union, nothing in these Terms affects your rights under
                  applicable consumer protection laws, including the GDPR.
                </p>
                <p className="text-gray-600">
                  Any disputes arising from these Terms or your use of the Service shall be subject
                  to the exclusive jurisdiction of the courts of Italy.
                </p>
              </div>
            </div>
          </div>

          {/* Changes to Terms */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of significant
              changes by:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the &quot;Last updated&quot; date</li>
              <li>Sending an email notification for material changes</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Your continued use of the Service after changes become effective constitutes acceptance
              of the modified Terms.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
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
