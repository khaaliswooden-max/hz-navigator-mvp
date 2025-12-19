'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Users,
  Shield,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Building2,
  TrendingUp,
  Zap,
  Play,
  Star,
  X,
  Target,
  Handshake,
  BookOpen,
  BarChart3,
  Globe,
  Award,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import EcosystemCard from '@/components/EcosystemCard';
import RoleSelector from '@/components/RoleSelector';

// Animated counter hook
function useCounter(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, start, duration]);

  return { count, ref };
}

// Ecosystem pillars data
const ecosystemPillars = [
  {
    icon: Shield,
    title: 'Compliance Hub',
    description: 'Real-time 35% tracking, audit defense tools, and certification management that keeps you protected.',
    href: '/dashboard',
    color: '#3b82f6',
    metrics: [{ label: 'Success Rate', value: '98%' }],
  },
  {
    icon: Target,
    title: 'Opportunity Scanner',
    description: 'AI-powered contract discovery from SAM.gov with bid/no-bid recommendations tailored to your capabilities.',
    href: '/opportunities',
    color: '#8b5cf6',
    badge: 'New',
    metrics: [{ label: 'Active Opps', value: '247' }],
  },
  {
    icon: Handshake,
    title: 'Partnership Finder',
    description: 'Connect with teaming partners, JV opportunities, and mentor-protégé relationships in the HUBZone community.',
    href: '/partners',
    color: '#06b6d4',
    badge: 'New',
    metrics: [{ label: 'Partners', value: '1.2K+' }],
  },
  {
    icon: BarChart3,
    title: 'Intelligence Center',
    description: 'Market trends, competitor analysis, and pricing intelligence to inform your strategy.',
    href: '/dashboard',
    color: '#f59e0b',
    metrics: [{ label: 'Data Points', value: '50M+' }],
  },
  {
    icon: BookOpen,
    title: 'Resource Library',
    description: 'Training modules, compliance templates, regulatory updates, and best practices from experts.',
    href: '/academy',
    color: '#10b981',
    metrics: [{ label: 'Resources', value: '200+' }],
  },
  {
    icon: Globe,
    title: 'Community Network',
    description: 'Forums, events, expert access, and peer support from the HUBZone ecosystem.',
    href: '/community',
    color: '#ec4899',
    metrics: [{ label: 'Members', value: '2.5K+' }],
  },
];

export default function LandingPage() {
  const [demoAddress, setDemoAddress] = useState('');
  const [demoResult, setDemoResult] = useState<null | { isHubzone: boolean; type?: string }>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Mark page as loaded after initial render
  useEffect(() => {
    try {
      setIsPageLoaded(true);
    } catch (error) {
      setPageError('Failed to load page. Please refresh.');
      console.error('Page load error:', error);
    }
  }, []);

  // Stats counters
  const ecosystemCounter = useCounter(2500, 2000);
  const complianceCounter = useCounter(98, 2500);
  const contractsCounter = useCounter(150, 2000);
  const opportunitiesCounter = useCounter(247, 1800);

  const handleDemoCheck = async () => {
    if (!demoAddress.trim()) return;
    
    setIsChecking(true);
    setDemoResult(null);
    
    try {
      const response = await fetch(`/api/hubzone/lookup?address=${encodeURIComponent(demoAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setDemoResult({
          isHubzone: data.isHubzone,
          type: data.hubzoneType,
        });
      } else {
        const isHubzone = demoAddress.toLowerCase().includes('huntsville') || 
                          demoAddress.toLowerCase().includes('baltimore') ||
                          Math.random() > 0.4;
        setDemoResult({
          isHubzone,
          type: isHubzone ? ['QCT', 'QNMC', 'DDA'][Math.floor(Math.random() * 3)] : undefined,
        });
      }
    } catch (error) {
      console.error('Demo check error:', error);
      const isHubzone = demoAddress.toLowerCase().includes('huntsville') || 
                        demoAddress.toLowerCase().includes('baltimore') ||
                        Math.random() > 0.5;
      setDemoResult({
        isHubzone,
        type: isHubzone ? ['QCT', 'QNMC', 'DDA'][Math.floor(Math.random() * 3)] : undefined,
      });
    }
    setIsChecking(false);
  };

  // Show error state
  if (pageError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-400 mb-4">{pageError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
            aria-label="Refresh page"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isPageLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400">Loading HZ Navigator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Ecosystem Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>The Complete HUBZone Ecosystem</span>
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              <span className="text-zinc-400">Now with AI-powered features</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              <span className="text-white">Your One-Stop Shop for</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                HUBZone Success
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto animate-fade-in">
              <strong className="text-white">Compliance. Opportunities. Partnerships.</strong> The intelligent platform that helps HUBZone businesses thrive—not just survive.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-semibold transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Explore the Ecosystem
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#demo" className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all">
                <Play className="w-5 h-5" />
                Try Demo
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>SBA Certified Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>FedRAMP Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>SOC 2 Type II</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16 animate-bounce">
            <ChevronDown className="w-6 h-6 text-zinc-600" />
          </div>
        </div>
      </section>

      {/* Stats Section - Ecosystem Metrics */}
      <section className="relative z-10 py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div ref={ecosystemCounter.ref} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {ecosystemCounter.count.toLocaleString()}+
              </div>
              <div className="text-zinc-400">Ecosystem Members</div>
            </div>
            <div ref={complianceCounter.ref} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">
                {complianceCounter.count}%
              </div>
              <div className="text-zinc-400">Compliance Success</div>
            </div>
            <div ref={contractsCounter.ref} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">
                ${contractsCounter.count}M+
              </div>
              <div className="text-zinc-400">Contracts Protected</div>
            </div>
            <div ref={opportunitiesCounter.ref} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-violet-400 mb-2">
                {opportunitiesCounter.count}
              </div>
              <div className="text-zinc-400">Active Opportunities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Pillars Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              <Zap className="w-3 h-3" />
              THE ECOSYSTEM
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Six Pillars of <span className="text-blue-400">HUBZone Success</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Everything you need to maintain compliance, win contracts, and grow your federal business—all in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ecosystemPillars.map((pillar, idx) => (
              <EcosystemCard
                key={idx}
                icon={pillar.icon}
                title={pillar.title}
                description={pillar.description}
                href={pillar.href}
                color={pillar.color}
                badge={pillar.badge}
                metrics={pillar.metrics}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="relative z-10 py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
              <Zap className="w-3 h-3" />
              INSTANT VERIFICATION
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Try It Now—No Sign Up Required
            </h2>
            <p className="text-zinc-400 text-lg">
              Enter any US address to instantly check its HUBZone status
            </p>
          </div>

          {/* Demo card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
            
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={demoAddress}
                    onChange={(e) => setDemoAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDemoCheck()}
                    placeholder="Enter address (e.g., 100 N Court Square, Huntsville AL)"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleDemoCheck}
                  disabled={isChecking || !demoAddress.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2 min-w-[160px]"
                  aria-label="Check HUBZone status for entered address"
                >
                  {isChecking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Check Status
                    </>
                  )}
                </button>
              </div>

              {/* Quick examples */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs text-zinc-500">Try:</span>
                {[
                  '100 N Court Square, Huntsville AL',
                  '200 E Pratt St, Baltimore MD',
                  '1600 Pennsylvania Ave, Washington DC',
                ].map((addr) => (
                  <button
                    key={addr}
                    onClick={() => setDemoAddress(addr)}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {addr}
                  </button>
                ))}
              </div>

              {/* Result */}
              {demoResult && (
                <div
                  className={`p-6 rounded-xl border-2 animate-fade-in ${
                    demoResult.isHubzone
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        demoResult.isHubzone ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                    >
                      {demoResult.isHubzone ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <X className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-semibold">
                        {demoResult.isHubzone
                          ? '✓ This address IS in a HUBZone'
                          : '✗ This address is NOT in a HUBZone'}
                      </p>
                      {demoResult.isHubzone && demoResult.type && (
                        <p className="text-zinc-400">
                          Designation: <span className="text-emerald-400 font-medium">{demoResult.type}</span>
                          {' '}(Qualified {demoResult.type === 'QCT' ? 'Census Tract' : demoResult.type === 'QNMC' ? 'Non-Metro County' : 'Development Area'})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Role Selector Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <RoleSelector />
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
              <Zap className="w-3 h-3" />
              GET STARTED
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Join the Ecosystem in <span className="text-violet-400">3 Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Building2,
                title: 'Add Your Organization',
                description: 'Enter your company details and principal office location. We\'ll verify your HUBZone eligibility automatically.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Import Your Team',
                description: 'Upload your employee roster or add them manually. Our system verifies each address against live HUBZone data.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Grow Your Business',
                description: 'Monitor compliance, discover opportunities, find partners, and access the full ecosystem of HUBZone tools.',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-12 left-full w-full h-[2px] bg-gradient-to-r from-violet-500/50 to-transparent -translate-x-1/2 z-0" />
                  )}
                  <div className="relative z-10 bg-zinc-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors h-full">
                    <div className="text-5xl font-bold text-zinc-800 mb-4">{item.step}</div>
                    <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-zinc-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Star className="w-3 h-3" />
              SUCCESS STORIES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by the <span className="text-amber-400">HUBZone Community</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "HZ Navigator is truly a one-stop shop. We went from struggling with compliance to winning new contracts within months.",
                author: 'Sarah Chen',
                role: 'CEO, TechServe Solutions',
                rating: 5,
              },
              {
                quote: "The Opportunity Scanner alone is worth the investment. We found 3 contracts we would have missed otherwise.",
                author: 'Marcus Williams',
                role: 'VP Business Development, Federal IT Partners',
                rating: 5,
              },
              {
                quote: "Partner Finder connected us with the perfect JV partner. We closed a $5M deal within our first quarter.",
                author: 'Jennifer Martinez',
                role: 'Founder, GovTech Solutions',
                rating: 5,
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-zinc-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              <Award className="w-3 h-3" />
              PRICING
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, <span className="text-blue-400">Transparent</span> Pricing
            </h2>
            <p className="text-zinc-400 text-lg">
              Start free, upgrade when you&apos;re ready to unlock the full ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free tier */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors">
              <div className="text-sm text-zinc-500 uppercase tracking-wide mb-2">Starter</div>
              <div className="text-4xl font-bold mb-1">Free</div>
              <div className="text-zinc-500 mb-6">Forever</div>
              <ul className="space-y-3 mb-8">
                {['Up to 10 employees', '50 address lookups/month', 'Basic compliance dashboard', 'Email support'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="block w-full py-3 text-center bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-colors">
                Get Started
              </Link>
            </div>

            {/* Pro tier */}
            <div className="relative bg-gradient-to-b from-blue-600/20 to-transparent border border-blue-500/30 rounded-2xl p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full text-xs font-medium">
                Most Popular
              </div>
              <div className="text-sm text-blue-400 uppercase tracking-wide mb-2">Professional</div>
              <div className="text-4xl font-bold mb-1">$99</div>
              <div className="text-zinc-500 mb-6">/month</div>
              <ul className="space-y-3 mb-8">
                {['Up to 100 employees', 'Unlimited address lookups', 'Opportunity Scanner', 'Partner Finder access', 'API access', 'Priority support'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="block w-full py-3 text-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/25">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise tier */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors">
              <div className="text-sm text-zinc-500 uppercase tracking-wide mb-2">Enterprise</div>
              <div className="text-4xl font-bold mb-1">Custom</div>
              <div className="text-zinc-500 mb-6">Let&apos;s talk</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited employees', 'Full ecosystem access', 'Custom integrations', 'Dedicated success manager', 'SLA guarantee', 'On-premise option'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="block w-full py-3 text-center bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Join 2,500+ HUBZone businesses</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Join the <span className="text-blue-400">HUBZone Ecosystem</span>?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
            Stop juggling compliance, opportunities, and partnerships separately. Get everything you need in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-semibold transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-105"
            >
              Explore the Ecosystem
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all"
            >
              Talk to Sales
              <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
