import Link from 'next/link'
import { ArrowRight, Calendar, Clock, User, Tag, TrendingUp, BookOpen, Lightbulb, Target } from 'lucide-react'

export const metadata = {
  title: 'Blog - OPhir Cold Email Platform',
  description: 'Latest insights, tips, and strategies for cold email marketing. Learn best practices, case studies, and industry trends from the OPhir team.',
}

export default function BlogPage() {
  const featuredPost = {
    title: "The Complete Cold Email Deliverability Guide for 2025",
    excerpt: "Master email deliverability with our comprehensive guide covering everything from domain setup to reputation management.",
    author: "Sarah Chen",
    date: "January 20, 2025",
    readTime: "12 min read",
    category: "Deliverability",
    image: "🚀",
    featured: true
  }

  const blogPosts = [
    {
      title: "10 Cold Email Templates That Actually Get Responses",
      excerpt: "Proven email templates across different industries with response rates and optimization tips.",
      author: "Mike Johnson",
      date: "January 18, 2025",
      readTime: "8 min read",
      category: "Templates",
      image: "📧"
    },
    {
      title: "How to Scale Your Cold Outreach to 10,000+ Prospects",
      excerpt: "A step-by-step guide to scaling your cold email campaigns without sacrificing deliverability or personalization.",
      author: "Lisa Park",
      date: "January 15, 2025",
      readTime: "15 min read",
      category: "Strategy",
      image: "📈"
    },
    {
      title: "AI Personalization: 300% Better Response Rates",
      excerpt: "How AI-powered personalization is revolutionizing cold email and why it's essential for modern sales teams.",
      author: "Alex Rodriguez",
      date: "January 12, 2025",
      readTime: "10 min read",
      category: "AI & Automation",
      image: "🤖"
    },
    {
      title: "Email Warmup: Everything You Need to Know",
      excerpt: "Complete guide to email warmup strategies, timelines, and best practices for maximum deliverability.",
      author: "Emily Davis",
      date: "January 10, 2025",
      readTime: "12 min read",
      category: "Deliverability",
      image: "🔥"
    },
    {
      title: "GDPR and Cold Email: Staying Compliant in 2025",
      excerpt: "Navigate GDPR compliance for cold email campaigns with practical tips and real-world examples.",
      author: "David Kim",
      date: "January 8, 2025",
      readTime: "9 min read",
      category: "Compliance",
      image: "⚖️"
    },
    {
      title: "Building Multi-Touch Sequences That Convert",
      excerpt: "Design effective email sequences that nurture prospects through your funnel with timing and content strategies.",
      author: "Rachel Thompson",
      date: "January 5, 2025",
      readTime: "11 min read",
      category: "Strategy",
      image: "🎯"
    },
    {
      title: "Cold Email Metrics That Actually Matter",
      excerpt: "Focus on the KPIs that drive results: open rates, response rates, conversion rates, and attribution.",
      author: "Tom Wilson",
      date: "January 3, 2025",
      readTime: "7 min read",
      category: "Analytics",
      image: "📊"
    },
    {
      title: "Industry Benchmarks: Cold Email Performance 2024 Report",
      excerpt: "Comprehensive analysis of cold email performance across industries with actionable insights.",
      author: "Jennifer Lee",
      date: "December 30, 2024",
      readTime: "14 min read",
      category: "Research",
      image: "📋"
    },
    {
      title: "From 50 to 500: Scaling Your Sales Team's Outreach",
      excerpt: "Case study of how a SaaS company scaled their cold email program 10x while maintaining quality.",
      author: "Mark Chen",
      date: "December 28, 2024",
      readTime: "13 min read",
      category: "Case Studies",
      image: "🚀"
    }
  ]

  const categories = [
    { name: "All Posts", count: 47, active: true },
    { name: "Strategy", count: 12 },
    { name: "Deliverability", count: 8 },
    { name: "Templates", count: 15 },
    { name: "AI & Automation", count: 6 },
    { name: "Case Studies", count: 4 },
    { name: "Compliance", count: 2 }
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
                <button className="btn-primary">
                  Start Free Trial
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-bg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Cold Email <span className="gradient-text">Insights & Strategies</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Stay ahead with the latest cold email trends, best practices, and proven strategies 
              from industry experts and successful campaigns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="#latest">
                <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                  Read Latest Posts
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <button className="btn-secondary text-lg px-8 py-4">
                Subscribe to Newsletter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured <span className="gradient-text">Article</span>
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-lg overflow-hidden card-hover">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-12 flex items-center justify-center">
                <div className="text-8xl">{featuredPost.image}</div>
              </div>
              <div className="p-12">
                <div className="flex items-center mb-4">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    Featured
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium ml-2">
                    {featuredPost.category}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">{featuredPost.title}</h3>
                <p className="text-gray-600 mb-6">{featuredPost.excerpt}</p>
                <div className="flex items-center text-sm text-gray-500 mb-6">
                  <User className="w-4 h-4 mr-2" />
                  <span className="mr-4">{featuredPost.author}</span>
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="mr-4">{featuredPost.date}</span>
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{featuredPost.readTime}</span>
                </div>
                <button className="btn-primary flex items-center">
                  Read Full Article
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section id="latest" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-2xl p-8 shadow-lg sticky top-24">
                <h3 className="text-xl font-bold mb-6">Categories</h3>
                <div className="space-y-3">
                  {categories.map((category, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                      category.active ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}>
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm text-gray-500">({category.count})</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-xl font-bold mb-4">Newsletter</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Get the latest cold email insights delivered to your inbox weekly.
                  </p>
                  <div className="space-y-3">
                    <input 
                      type="email" 
                      placeholder="Your email" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    />
                    <button className="btn-primary w-full text-sm">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Blog Posts */}
            <div className="lg:w-3/4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-bold text-gray-900">
                  Latest <span className="gradient-text">Posts</span>
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Sort by:</span>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-600 focus:border-transparent">
                    <option>Latest</option>
                    <option>Most Popular</option>
                    <option>Most Viewed</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {blogPosts.map((post, index) => (
                  <article key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover">
                    <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-8 text-center">
                      <div className="text-4xl">{post.image}</div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center mb-3">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          {post.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h3>
                      <p className="text-gray-600 mb-4">{post.excerpt}</p>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <User className="w-4 h-4 mr-2" />
                        <span className="mr-4">{post.author}</span>
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {post.readTime}
                        </div>
                        <button className="text-purple-600 font-medium flex items-center hover:text-purple-700 transition">
                          Read More <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Load More */}
              <div className="text-center mt-12">
                <button className="btn-secondary px-8 py-3">
                  Load More Articles
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Popular <span className="gradient-text">Topics</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore our most read content across key cold email topics
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Link href="/blog/category/strategy" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition">
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Strategy</h3>
                <p className="text-gray-600 mb-4">Campaign planning, sequencing, and optimization strategies.</p>
                <div className="text-purple-600 font-medium">12 Articles</div>
              </div>
            </Link>

            <Link href="/blog/category/deliverability" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Deliverability</h3>
                <p className="text-gray-600 mb-4">Email warmup, domain setup, and inbox placement optimization.</p>
                <div className="text-purple-600 font-medium">8 Articles</div>
              </div>
            </Link>

            <Link href="/blog/category/templates" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition">
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Templates</h3>
                <p className="text-gray-600 mb-4">High-converting email templates and copywriting tips.</p>
                <div className="text-purple-600 font-medium">15 Articles</div>
              </div>
            </Link>

            <Link href="/blog/category/ai-automation" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-200 transition">
                  <Lightbulb className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI & Automation</h3>
                <p className="text-gray-600 mb-4">AI personalization, automation workflows, and smart features.</p>
                <div className="text-purple-600 font-medium">6 Articles</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 px-4 gradient-bg">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Never Miss an <span className="gradient-text">Update</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get the latest cold email insights, strategies, and case studies delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="flex-1 px-6 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent text-lg"
            />
            <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
              Subscribe Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Join 15,000+ sales professionals getting weekly insights • Unsubscribe anytime
          </p>
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
              © 2025 OPhir. All rights reserved.
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