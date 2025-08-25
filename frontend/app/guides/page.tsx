import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, User, CheckCircle, Download, Star, Lightbulb } from 'lucide-react'

export const metadata = {
  title: 'Cold Email Guides - OPhir Platform',
  description: 'Comprehensive cold email guides covering best practices, deliverability, compliance, and advanced strategies to maximize your outreach success.',
}

export default function GuidesPage() {
  const featuredGuide = {
    title: "The Complete Cold Email Deliverability Masterclass",
    description: "Master email deliverability from domain setup to reputation management. This comprehensive guide covers everything you need to achieve 95%+ inbox placement rates.",
    readTime: "45 min read",
    difficulty: "Intermediate",
    sections: 12,
    downloads: "15,420"
  }

  const guides = [
    {
      title: "Cold Email Fundamentals: A Beginner's Guide",
      description: "Start your cold email journey with this comprehensive beginner's guide covering all the basics.",
      difficulty: "Beginner",
      readTime: "25 min read",
      sections: 8,
      category: "Fundamentals"
    },
    {
      title: "Advanced Personalization Strategies",
      description: "Go beyond first names with advanced personalization techniques that dramatically increase response rates.",
      difficulty: "Advanced",
      readTime: "35 min read",
      sections: 10,
      category: "Personalization"
    },
    {
      title: "Email Sequence Psychology: What Really Works",
      description: "Understanding prospect psychology to create email sequences that convert at the highest rates.",
      difficulty: "Intermediate",
      readTime: "30 min read",
      sections: 9,
      category: "Psychology"
    },
    {
      title: "GDPR-Compliant Cold Email: Complete Guide",
      description: "Navigate GDPR compliance while maintaining effective cold email campaigns with practical examples.",
      difficulty: "Intermediate",
      readTime: "20 min read",
      sections: 6,
      category: "Compliance"
    },
    {
      title: "A/B Testing for Cold Email: Scientific Approach",
      description: "Design and execute A/B tests that provide actionable insights for email optimization.",
      difficulty: "Advanced",
      readTime: "40 min read",
      sections: 11,
      category: "Optimization"
    },
    {
      title: "Industry-Specific Cold Email Strategies",
      description: "Tailored approaches for different industries including SaaS, real estate, finance, and more.",
      difficulty: "Intermediate",
      readTime: "50 min read",
      sections: 15,
      category: "Industry-Specific"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <span className="text-2xl font-bold gradient-text cursor-pointer">OPhir</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</Link>
              <Link href="/resources" className="text-gray-600 hover:text-gray-900 transition">Resources</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
              <Link href="/register">
                <button className="btn-primary">Start Free Trial</button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-bg">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Cold Email <span className="gradient-text">Mastery Guides</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Comprehensive guides to master every aspect of cold email - from beginner fundamentals 
            to advanced strategies used by top-performing sales teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="#featured">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <button className="btn-secondary text-lg px-8 py-4 flex items-center justify-center">
              <Download className="mr-2 h-5 w-5" />
              Download All PDFs
            </button>
          </div>
        </div>
      </section>

      {/* Featured Guide */}
      <section id="featured" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured <span className="gradient-text">Guide</span>
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-6">📚</div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/50 rounded-lg p-4">
                      <div className="font-bold text-2xl">{featuredGuide.sections}</div>
                      <div className="text-sm text-gray-600">Sections</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-4">
                      <div className="font-bold text-2xl">{featuredGuide.downloads}</div>
                      <div className="text-sm text-gray-600">Downloads</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-12">
                <div className="flex items-center mb-4">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium ml-2">
                    {featuredGuide.difficulty}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">{featuredGuide.title}</h3>
                <p className="text-gray-600 mb-6">{featuredGuide.description}</p>
                <div className="flex items-center text-sm text-gray-500 mb-6 space-x-6">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {featuredGuide.readTime}
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {featuredGuide.sections} sections
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-500" />
                    4.9/5 rating
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="btn-primary flex items-center">
                    Read Guide
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                  <button className="btn-secondary flex items-center">
                    <Download className="mr-2 w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Guides */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Guide <span className="gradient-text">Library</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to master cold email, organized by difficulty and topic
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map((guide, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg card-hover">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {guide.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    guide.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                    guide.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {guide.difficulty}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{guide.title}</h3>
                <p className="text-gray-600 mb-6">{guide.description}</p>
                <div className="flex items-center text-sm text-gray-500 mb-6 space-x-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {guide.readTime}
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {guide.sections} sections
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="btn-primary flex-1 text-sm">
                    Read Guide
                  </button>
                  <button className="btn-secondary p-2">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Path */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Recommended <span className="gradient-text">Learning Path</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Follow our structured path to go from beginner to cold email expert
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Foundation Level</h3>
                  <p className="text-gray-600">Master the fundamentals</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Cold Email Basics</h4>
                  <p className="text-sm text-gray-600">Understanding cold email fundamentals</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    Completed by 95% of users
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Legal & Compliance</h4>
                  <p className="text-sm text-gray-600">GDPR, CAN-SPAM, and best practices</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    15 min read
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">First Campaign</h4>
                  <p className="text-sm text-gray-600">Setting up your first campaign</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Practical examples
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Advanced Techniques</h3>
                  <p className="text-gray-600">Optimization and scaling</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Deliverability Mastery</h4>
                  <p className="text-sm text-gray-600">Advanced deliverability techniques</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Personalization at Scale</h4>
                  <p className="text-sm text-gray-600">AI-powered personalization strategies</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Multi-channel Approach</h4>
                  <p className="text-sm text-gray-600">Integrating social and phone outreach</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Expert Level</h3>
                  <p className="text-gray-600">Advanced automation and scaling</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Enterprise Automation</h4>
                  <p className="text-sm text-gray-600">Complex workflows and integrations</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Team Management</h4>
                  <p className="text-sm text-gray-600">Managing large-scale operations</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Advanced Analytics</h4>
                  <p className="text-sm text-gray-600">Attribution and performance analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Apply <span className="gradient-text">What You've Learned?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Put these strategies into practice with the most powerful cold email platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="btn-secondary text-lg px-8 py-4">
                Talk to Expert
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="text-2xl font-bold mb-4">OPhir</div>
              <p className="text-gray-400 mb-4">
                The most powerful cold email platform for modern sales teams.
              </p>
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
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 OPhir. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}