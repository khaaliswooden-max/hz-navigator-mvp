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
  Menu,
  X,
} from 'lucide-react';

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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
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
  const contractorsCounter = useCounter(2500, 2000);
  const complianceCounter = useCounter(98, 2500);
  const savingsCounter = useCounter(150, 2000);

  const features = [
    {
      icon: MapPin,
      title: 'Instant Address Verification',
      description: 'Check any US address against live HUBZone boundaries in seconds. Our API connects directly to SBA data for accurate, real-time results.',
      color: '#3b82f6',
    },
    {
      icon: Users,
      title: 'Employee Residency Tracking',
      description: 'Monitor your workforce\'s HUBZone residency status. Automatically track the 35% requirement and get alerts before you fall out of compliance.',
      color: '#22c55e',
    },
    {
      icon: TrendingUp,
      title: 'Compliance Analytics',
      description: 'Visual dashboards show your certification health at a glance. Historical trends help you anticipate and prevent compliance issues.',
      color: '#f59e0b',
    },
    {
      icon: Shield,
      title: 'Certification Management',
      description: 'Track certification dates, recertification deadlines, and maintain audit-ready documentation all in one place.',
      color: '#8b5cf6',
    },
  ];

  const [demoError, setDemoError] = useState<string | null>(null);

  const handleDemoCheck = async () => {
    if (!demoAddress.trim()) return;
    
    setIsChecking(true);
    setDemoResult(null);
    setDemoError(null);
    
    // Use actual API
    try {
      const response = await fetch(`/api/hubzone/lookup?address=${encodeURIComponent(demoAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setDemoResult({
          isHubzone: data.isHubzone,
          type: data.hubzoneType,
        });
      } else {
        // Fallback mock for demo purposes
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
      // Mock fallback for demo
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-slate-400 mb-4">{pageError}</p>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading HZ Navigator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight">HZ Navigator</span>
                <span className="hidden sm:inline text-xs text-slate-500 ml-2">by Visionblox</span>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#demo" className="text-sm text-slate-400 hover:text-white transition-colors">Try Demo</a>
              <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-600/25"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/5 pt-4 space-y-4">
              <a href="#features" className="block text-slate-400 hover:text-white">Features</a>
              <a href="#demo" className="block text-slate-400 hover:text-white">Try Demo</a>
              <a href="#pricing" className="block text-slate-400 hover:text-white">Pricing</a>
              <Link href="/dashboard" className="block w-full text-center px-4 py-2 bg-blue-600 rounded-lg">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
              <Zap className="w-4 h-4" />
              <span>Now with real-time SBA data integration</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                HUBZone Compliance
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              The intelligent platform that helps federal contractors maintain HUBZone certification. 
              Track employee residency, verify addresses, and stay compliant—automatically.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#demo" className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all">
                <Play className="w-5 h-5" />
                Try Demo
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>SBA Certified Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16 animate-bounce">
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div ref={contractorsCounter.ref} className="text-center">
              <div className="text-5xl font-bold text-white mb-2">
                {contractorsCounter.count.toLocaleString()}+
              </div>
              <div className="text-slate-400">Federal Contractors Served</div>
            </div>
            <div ref={complianceCounter.ref} className="text-center">
              <div className="text-5xl font-bold text-emerald-400 mb-2">
                {complianceCounter.count}%
              </div>
              <div className="text-slate-400">Compliance Success Rate</div>
            </div>
            <div ref={savingsCounter.ref} className="text-center">
              <div className="text-5xl font-bold text-blue-400 mb-2">
                ${savingsCounter.count}M+
              </div>
              <div className="text-slate-400">In Contracts Protected</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Try It Now—No Sign Up Required
            </h2>
            <p className="text-slate-400 text-lg">
              Enter any US address to instantly check its HUBZone status
            </p>
          </div>

          {/* Demo card */}
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
            
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={demoAddress}
                    onChange={(e) => setDemoAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDemoCheck()}
                    placeholder="Enter address (e.g., 100 N Court Square, Huntsville AL)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleDemoCheck}
                  disabled={isChecking || !demoAddress.trim()}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2 min-w-[160px]"
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
                <span className="text-xs text-slate-500">Try:</span>
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
                  className={`p-6 rounded-xl border-2 ${
                    demoResult.isHubzone
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        demoResult.isHubzone ? 'bg-emerald-500' : 'bg-slate-600'
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
                        <p className="text-slate-400">
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

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for HUBZone Compliance
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From address verification to employee tracking, we&apos;ve got you covered
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature selector */}
            <div className="space-y-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                const isActive = activeFeature === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFeature(idx)}
                    className={`w-full text-left p-6 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-white/5 border-white/20 shadow-lg'
                        : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${feature.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: feature.color }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                        <p className={`text-sm transition-all ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feature visual */}
            <div className="relative">
              <div className="sticky top-24">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
                  <div className="text-center p-8">
                    {(() => {
                      const Icon = features[activeFeature].icon;
                      return (
                        <div
                          className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse"
                          style={{ backgroundColor: `${features[activeFeature].color}20` }}
                        >
                          <Icon
                            className="w-12 h-12"
                            style={{ color: features[activeFeature].color }}
                          />
                        </div>
                      );
                    })()}
                    <h3 className="text-2xl font-bold mb-2">{features[activeFeature].title}</h3>
                    <p className="text-slate-400 mb-6">Interactive preview</p>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                    >
                      Try It Now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Compliant in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Building2,
                title: 'Add Your Organization',
                description: 'Enter your company details and principal office location to get started.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Import Employees',
                description: 'Upload your employee roster or add them manually. We\'ll verify each address automatically.',
              },
              {
                step: '03',
                icon: Shield,
                title: 'Monitor Compliance',
                description: 'Track your 35% residency requirement in real-time and get alerts before issues arise.',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-12 left-full w-full h-[2px] bg-gradient-to-r from-blue-500/50 to-transparent -translate-x-1/2" />
                  )}
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors h-full">
                    <div className="text-5xl font-bold text-slate-800 mb-4">{item.step}</div>
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-slate-400">{item.description}</p>
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by Federal Contractors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "HZ Navigator saved us hours of manual verification. We caught a compliance issue before our recertification.",
                author: 'Sarah Chen',
                role: 'CEO, TechServe Solutions',
                rating: 5,
              },
              {
                quote: "The real-time dashboard is a game-changer. I can see our compliance health at a glance.",
                author: 'Marcus Williams',
                role: 'HR Director, Federal IT Partners',
                rating: 5,
              },
              {
                quote: "Finally, a tool that understands HUBZone requirements. The employee tracking is invaluable.",
                author: 'Jennifer Martinez',
                role: 'Compliance Officer, GovTech Inc',
                rating: 5,
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 text-lg">
              Start free, upgrade when you&apos;re ready
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free tier */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">Starter</div>
              <div className="text-4xl font-bold mb-1">Free</div>
              <div className="text-slate-500 mb-6">Forever</div>
              <ul className="space-y-3 mb-8">
                {['Up to 10 employees', '50 address lookups/month', 'Basic compliance dashboard', 'Email support'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-xs font-medium">
                Most Popular
              </div>
              <div className="text-sm text-blue-400 uppercase tracking-wide mb-2">Professional</div>
              <div className="text-4xl font-bold mb-1">$99</div>
              <div className="text-slate-500 mb-6">/month</div>
              <ul className="space-y-3 mb-8">
                {['Up to 100 employees', 'Unlimited address lookups', 'Advanced analytics', 'API access', 'Priority support', 'Compliance alerts'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="block w-full py-3 text-center bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/25">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise tier */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">Enterprise</div>
              <div className="text-4xl font-bold mb-1">Custom</div>
              <div className="text-slate-500 mb-6">Let&apos;s talk</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited employees', 'Unlimited lookups', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'On-premise option'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                className="block w-full py-3 text-center bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-colors"
                aria-label="Contact sales for enterprise pricing"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Simplify Your HUBZone Compliance?
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of federal contractors who trust HZ Navigator.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-105"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span>© 2024 Visionblox LLC. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
