'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Search,
  Users,
  Map,
  Target,
  Handshake,
  BookOpen,
  FileText,
  Code,
  Download,
  Building2,
  Calendar,
  Award,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  description?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface MegaMenuProps {
  trigger: string;
  sections: NavSection[];
  featured?: {
    title: string;
    description: string;
    href: string;
    icon?: React.ElementType;
  };
}

const platformSections: NavSection[] = [
  {
    title: 'Core Tools',
    items: [
      { label: 'Compliance Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Track your 35% requirement in real-time' },
      { label: 'Address Verification', href: '/dashboard?tab=lookup', icon: Search, description: 'Instantly verify HUBZone eligibility' },
      { label: 'Employee Tracking', href: '/dashboard?tab=employees', icon: Users, description: 'Manage workforce residency status' },
      { label: 'HUBZone Map', href: '/dashboard?tab=map', icon: Map, description: 'Interactive boundary explorer' },
    ],
  },
  {
    title: 'Growth Tools',
    items: [
      { label: 'Opportunity Scanner', href: '/opportunities', icon: Target, description: 'AI-powered contract discovery', badge: 'New' },
      { label: 'Partner Finder', href: '/partners', icon: Handshake, description: 'Find teaming partners & JVs', badge: 'New' },
    ],
  },
];

const resourcesSections: NavSection[] = [
  {
    title: 'Learn',
    items: [
      { label: 'HUBZone Academy', href: '/academy', icon: BookOpen, description: 'Certification training & courses' },
      { label: 'Compliance Guides', href: '/guides', icon: FileText, description: 'Step-by-step documentation' },
      { label: 'Success Stories', href: '/success-stories', icon: Award, description: 'Customer case studies' },
    ],
  },
  {
    title: 'Developers',
    items: [
      { label: 'API Documentation', href: '/api-docs', icon: Code, description: 'Integrate with your systems' },
      { label: 'Templates', href: '/templates', icon: Download, description: 'Downloadable resources' },
    ],
  },
];

const communitySections: NavSection[] = [
  {
    title: 'Connect',
    items: [
      { label: 'Partner Directory', href: '/directory', icon: Building2, description: 'Browse HUBZone vendors' },
      { label: 'Events & Webinars', href: '/events', icon: Calendar, description: 'Upcoming sessions' },
    ],
  },
];

function MegaMenuDropdown({ trigger, sections, featured }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors py-2"
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 min-w-[500px] animate-slide-down">
            <div className="grid grid-cols-2 gap-6">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item, itemIdx) => {
                      const Icon = item.icon;
                      return (
                        <li key={itemIdx}>
                          <Link
                            href={item.href || '#'}
                            className="group flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            {Icon && (
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                <Icon className="w-4 h-4 text-zinc-400 group-hover:text-blue-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {featured && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <Link
                  href={featured.href}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all"
                >
                  {featured.icon && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <featured.icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{featured.title}</div>
                    <p className="text-xs text-zinc-400">{featured.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white">HZ Navigator</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">The HUBZone Ecosystem</span>
                <Sparkles className="w-3 h-3 text-blue-400" />
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <MegaMenuDropdown
              trigger="Platform"
              sections={platformSections}
              featured={{
                title: 'Explore the Full Ecosystem',
                description: 'See how all tools work together for HUBZone success',
                href: '/dashboard',
                icon: Sparkles,
              }}
            />
            <MegaMenuDropdown
              trigger="Resources"
              sections={resourcesSections}
              featured={{
                title: 'HUBZone Academy',
                description: 'Free certification training and compliance courses',
                href: '/academy',
                icon: BookOpen,
              }}
            />
            <MegaMenuDropdown trigger="Community" sections={communitySections} />
            <Link
              href="/pricing"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
            >
              Join Ecosystem
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5 animate-slide-down">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Platform</h3>
                <div className="space-y-1">
                  {platformSections.flatMap(s => s.items).map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href || '#'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon && <item.icon className="w-4 h-4 text-zinc-500" />}
                      {item.label}
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Resources</h3>
                <div className="space-y-1">
                  {resourcesSections.flatMap(s => s.items).map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href || '#'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon && <item.icon className="w-4 h-4 text-zinc-500" />}
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-2">
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Join Ecosystem
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-4 py-2.5 text-zinc-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
