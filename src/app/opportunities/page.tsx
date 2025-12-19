'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  DollarSign,
  Building2,
  MapPin,
  Clock,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Bookmark,
  ChevronDown,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

interface Opportunity {
  id: string;
  title: string;
  agency: string;
  value: string;
  deadline: string;
  daysLeft: number;
  location: string;
  naics: string;
  setAside: string;
  matchScore: number;
  status: 'hot' | 'new' | 'closing' | 'normal';
  description: string;
}

const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'IT Infrastructure Modernization Services',
    agency: 'Department of Veterans Affairs',
    value: '$3.2M - $5.5M',
    deadline: '2024-02-15',
    daysLeft: 12,
    location: 'Washington, DC',
    naics: '541512',
    setAside: 'HUBZone',
    matchScore: 95,
    status: 'hot',
    description: 'Cloud migration and infrastructure modernization for VA healthcare systems.',
  },
  {
    id: '2',
    title: 'Cybersecurity Operations Support',
    agency: 'Department of Defense',
    value: '$1.8M - $2.5M',
    deadline: '2024-02-20',
    daysLeft: 17,
    location: 'Arlington, VA',
    naics: '541519',
    setAside: 'HUBZone',
    matchScore: 88,
    status: 'new',
    description: 'SOC operations and incident response support for defense networks.',
  },
  {
    id: '3',
    title: 'Healthcare IT Support Services',
    agency: 'Health and Human Services',
    value: '$850K - $1.2M',
    deadline: '2024-02-08',
    daysLeft: 5,
    location: 'Bethesda, MD',
    naics: '541511',
    setAside: 'HUBZone',
    matchScore: 92,
    status: 'closing',
    description: 'Technical support and maintenance for healthcare information systems.',
  },
  {
    id: '4',
    title: 'Data Analytics Platform Development',
    agency: 'General Services Administration',
    value: '$2.1M - $3.0M',
    deadline: '2024-03-01',
    daysLeft: 26,
    location: 'Remote',
    naics: '541511',
    setAside: 'HUBZone',
    matchScore: 85,
    status: 'normal',
    description: 'Design and development of enterprise analytics dashboard.',
  },
  {
    id: '5',
    title: 'Network Engineering Services',
    agency: 'Department of Energy',
    value: '$1.5M - $2.0M',
    deadline: '2024-02-25',
    daysLeft: 22,
    location: 'Oak Ridge, TN',
    naics: '541513',
    setAside: 'HUBZone',
    matchScore: 78,
    status: 'new',
    description: 'Network design, implementation, and optimization services.',
  },
  {
    id: '6',
    title: 'Software Development - FOIA System',
    agency: 'Department of Justice',
    value: '$4.0M - $6.0M',
    deadline: '2024-03-15',
    daysLeft: 40,
    location: 'Washington, DC',
    naics: '541511',
    setAside: 'HUBZone',
    matchScore: 90,
    status: 'normal',
    description: 'Development of next-generation FOIA processing system.',
  },
];

const agencies = [
  'All Agencies',
  'Department of Defense',
  'Department of Veterans Affairs',
  'Health and Human Services',
  'General Services Administration',
  'Department of Energy',
  'Department of Justice',
];

const naicsCodes = [
  'All NAICS',
  '541511 - Custom Computer Programming',
  '541512 - Computer Systems Design',
  '541513 - Computer Facilities Management',
  '541519 - Other Computer Related Services',
];

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('All Agencies');
  const [selectedNaics, setSelectedNaics] = useState('All NAICS');
  const [opportunities, setOpportunities] = useState(mockOpportunities);
  const [savedOpps, setSavedOpps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAgency = selectedAgency === 'All Agencies' || opp.agency === selectedAgency;
    const matchesNaics = selectedNaics === 'All NAICS' || selectedNaics.startsWith(opp.naics);
    return matchesSearch && matchesAgency && matchesNaics;
  });

  const stats = {
    total: opportunities.length,
    totalValue: '$15.4M+',
    closing: opportunities.filter((o) => o.status === 'closing').length,
    avgMatch: Math.round(opportunities.reduce((a, b) => a + b.matchScore, 0) / opportunities.length),
  };

  const toggleSaved = (id: string) => {
    setSavedOpps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hot':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
            <Zap className="w-3 h-3" /> Hot
          </span>
        );
      case 'new':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
            <Sparkles className="w-3 h-3" /> New
          </span>
        );
      case 'closing':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" /> Closing Soon
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <Navigation />

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Opportunity Scanner</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
                <Target className="w-3 h-3" />
                AI-POWERED DISCOVERY
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Opportunity <span className="text-violet-400">Scanner</span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl">
                Discover HUBZone set-aside contracts matched to your capabilities. AI-powered recommendations help you win more.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-zinc-500">Active Opps</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-emerald-400">{stats.totalValue}</div>
                <div className="text-xs text-zinc-500">Total Value</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-amber-400">{stats.closing}</div>
                <div className="text-xs text-zinc-500">Closing Soon</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-violet-400">{stats.avgMatch}%</div>
                <div className="text-xs text-zinc-500">Avg Match</div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search opportunities by keyword, agency, or NAICS..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>
              <select
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {agencies.map((agency) => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
              <select
                value={selectedNaics}
                onChange={(e) => setSelectedNaics(e.target.value)}
                className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {naicsCodes.map((naics) => (
                  <option key={naics} value={naics}>{naics}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Opportunities List */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No opportunities found</h3>
              <p className="text-zinc-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="group bg-zinc-900/50 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        {getStatusBadge(opp.status)}
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                          <Shield className="w-3 h-3 inline mr-1" />
                          {opp.setAside}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
                        {opp.title}
                      </h3>

                      <p className="text-zinc-400 text-sm mb-4">{opp.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {opp.agency}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {opp.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {new Date(opp.deadline).toLocaleDateString()}
                        </span>
                        <span className="text-zinc-600">NAICS: {opp.naics}</span>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex flex-col items-end gap-4 min-w-[200px]">
                      {/* Match Score */}
                      <div className="text-right">
                        <div className="text-xs text-zinc-500 mb-1">Match Score</div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                opp.matchScore >= 90 ? 'bg-emerald-500' :
                                opp.matchScore >= 75 ? 'bg-amber-500' : 'bg-zinc-500'
                              )}
                              style={{ width: `${opp.matchScore}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-lg font-bold',
                            opp.matchScore >= 90 ? 'text-emerald-400' :
                            opp.matchScore >= 75 ? 'text-amber-400' : 'text-zinc-400'
                          )}>
                            {opp.matchScore}%
                          </span>
                        </div>
                      </div>

                      {/* Value & Deadline */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{opp.value}</div>
                        <div className={cn(
                          'text-sm',
                          opp.daysLeft <= 7 ? 'text-red-400' :
                          opp.daysLeft <= 14 ? 'text-amber-400' : 'text-zinc-500'
                        )}>
                          {opp.daysLeft} days left
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleSaved(opp.id)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            savedOpps.includes(opp.id)
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          )}
                          aria-label={savedOpps.includes(opp.id) ? 'Remove from saved' : 'Save opportunity'}
                        >
                          <Bookmark className={cn('w-5 h-5', savedOpps.includes(opp.id) && 'fill-current')} />
                        </button>
                        <Link
                          href={`/opportunities/${opp.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-medium transition-colors"
                        >
                          View Details
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Want personalized opportunity alerts?</h2>
          <p className="text-zinc-400 mb-6">
            Upgrade to Professional to get AI-powered recommendations delivered to your inbox daily.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 rounded-xl font-medium transition-all"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
