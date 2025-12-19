'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Handshake,
  Search,
  MapPin,
  Building2,
  CheckCircle2,
  Star,
  Users,
  Award,
  ArrowRight,
  Filter,
  Grid3X3,
  List,
  MessageSquare,
  ExternalLink,
  Shield,
  Briefcase,
  Globe,
  Sparkles,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  type: 'vendor' | 'contractor' | 'both';
  logo?: string;
  location: string;
  hubzoneStatus: 'certified' | 'pending';
  certificationDate: string;
  capabilities: string[];
  naicsCodes: string[];
  pastPerformance: number;
  employees: number;
  revenue: string;
  description: string;
  seeking: string[];
  verified: boolean;
}

const mockPartners: Partner[] = [
  {
    id: '1',
    name: 'TechServe Solutions',
    type: 'vendor',
    location: 'Huntsville, AL',
    hubzoneStatus: 'certified',
    certificationDate: '2022-03-15',
    capabilities: ['Cloud Computing', 'Cybersecurity', 'DevOps', 'AI/ML'],
    naicsCodes: ['541511', '541512', '541519'],
    pastPerformance: 4.8,
    employees: 85,
    revenue: '$8M - $12M',
    description: 'Full-service IT solutions provider specializing in federal cloud migrations and cybersecurity.',
    seeking: ['JV Partner', 'Subcontractor Opportunities'],
    verified: true,
  },
  {
    id: '2',
    name: 'Federal IT Partners',
    type: 'both',
    location: 'Arlington, VA',
    hubzoneStatus: 'certified',
    certificationDate: '2021-08-22',
    capabilities: ['Systems Integration', 'Network Engineering', 'Help Desk', 'PMO'],
    naicsCodes: ['541512', '541513', '541611'],
    pastPerformance: 4.6,
    employees: 120,
    revenue: '$15M - $20M',
    description: 'Enterprise systems integrator with deep DoD experience and active security clearances.',
    seeking: ['Prime Contract Partner', 'Mentor-Protégé'],
    verified: true,
  },
  {
    id: '3',
    name: 'GovTech Solutions',
    type: 'vendor',
    location: 'Baltimore, MD',
    hubzoneStatus: 'certified',
    certificationDate: '2023-01-10',
    capabilities: ['Software Development', 'Data Analytics', 'Mobile Apps', 'UX Design'],
    naicsCodes: ['541511', '541430', '541512'],
    pastPerformance: 4.9,
    employees: 45,
    revenue: '$4M - $6M',
    description: 'Agile software development firm focused on citizen-facing government applications.',
    seeking: ['Teaming Partner', 'Subcontractor Opportunities'],
    verified: true,
  },
  {
    id: '4',
    name: 'Defense Logix',
    type: 'contractor',
    location: 'San Antonio, TX',
    hubzoneStatus: 'certified',
    certificationDate: '2020-11-30',
    capabilities: ['Logistics', 'Supply Chain', 'Warehousing', 'Transportation'],
    naicsCodes: ['541614', '493110', '484121'],
    pastPerformance: 4.5,
    employees: 200,
    revenue: '$25M - $35M',
    description: 'Full-service defense logistics provider with nationwide warehouse network.',
    seeking: ['IT Subcontractor', 'JV Partner'],
    verified: true,
  },
  {
    id: '5',
    name: 'ClearPath Consulting',
    type: 'vendor',
    location: 'Washington, DC',
    hubzoneStatus: 'certified',
    certificationDate: '2022-06-18',
    capabilities: ['Management Consulting', 'Strategy', 'Change Management', 'Training'],
    naicsCodes: ['541611', '541612', '611430'],
    pastPerformance: 4.7,
    employees: 60,
    revenue: '$6M - $10M',
    description: 'Management consulting firm specializing in federal agency transformation.',
    seeking: ['Technical Partner', 'Subcontractor Opportunities'],
    verified: true,
  },
  {
    id: '6',
    name: 'Quantum Engineering',
    type: 'both',
    location: 'Denver, CO',
    hubzoneStatus: 'certified',
    certificationDate: '2021-04-05',
    capabilities: ['Engineering Services', 'R&D', 'Prototyping', 'Testing'],
    naicsCodes: ['541330', '541380', '541715'],
    pastPerformance: 4.4,
    employees: 75,
    revenue: '$10M - $15M',
    description: 'Engineering services firm with expertise in defense R&D and rapid prototyping.',
    seeking: ['Prime Contractor', 'JV Partner'],
    verified: true,
  },
];

const capabilities = [
  'All Capabilities',
  'Cloud Computing',
  'Cybersecurity',
  'Software Development',
  'Systems Integration',
  'Data Analytics',
  'Engineering Services',
  'Management Consulting',
  'Logistics',
];

const partnerTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'vendor', label: 'HUBZone Vendors' },
  { value: 'contractor', label: 'Prime Contractors' },
  { value: 'both', label: 'Both' },
];

export default function PartnersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('All Capabilities');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [partners, setPartners] = useState(mockPartners);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCapability =
      selectedCapability === 'All Capabilities' ||
      partner.capabilities.includes(selectedCapability);
    const matchesType = selectedType === 'all' || partner.type === selectedType || partner.type === 'both';
    return matchesSearch && matchesCapability && matchesType;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <Navigation />

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Partner Finder</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
                <Handshake className="w-3 h-3" />
                TEAMING & PARTNERSHIPS
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Partner <span className="text-cyan-400">Finder</span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl">
                Connect with HUBZone certified vendors, find teaming partners, and explore JV opportunities within the ecosystem.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-white">{partners.length}</div>
                <div className="text-xs text-zinc-500">Partners</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-xs text-zinc-500">Verified</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-cyan-400">25+</div>
                <div className="text-xs text-zinc-500">Capabilities</div>
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
                  placeholder="Search by company name, location, or capability..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>
              <select
                value={selectedCapability}
                onChange={(e) => setSelectedCapability(e.target.value)}
                className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {capabilities.map((cap) => (
                  <option key={cap} value={cap}>{cap}</option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {partnerTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'grid' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'list' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Grid/List */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No partners found</h3>
              <p className="text-zinc-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            )}>
              {filteredPartners.map((partner) => (
                <div
                  key={partner.id}
                  className={cn(
                    'group bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all',
                    viewMode === 'list' && 'flex'
                  )}
                >
                  {/* Card Content */}
                  <div className={cn('p-6', viewMode === 'list' && 'flex-1 flex gap-6')}>
                    {/* Header */}
                    <div className={cn(viewMode === 'list' && 'flex-1')}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                {partner.name}
                              </h3>
                              {partner.verified && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                              <MapPin className="w-3 h-3" />
                              {partner.location}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-medium">{partner.pastPerformance}</span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          HUBZone Certified
                        </span>
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full">
                          {partner.type === 'vendor' ? 'Vendor' : partner.type === 'contractor' ? 'Contractor' : 'Vendor & Contractor'}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{partner.description}</p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {partner.capabilities.slice(0, 3).map((cap, idx) => (
                          <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg">
                            {cap}
                          </span>
                        ))}
                        {partner.capabilities.length > 3 && (
                          <span className="px-2 py-1 text-zinc-500 text-xs">
                            +{partner.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className={cn(
                      'flex justify-between items-end',
                      viewMode === 'list' && 'flex-col items-end justify-between min-w-[200px]'
                    )}>
                      <div className={cn('flex gap-4 text-sm', viewMode === 'list' && 'flex-col gap-2 text-right')}>
                        <div>
                          <span className="text-zinc-500">Employees: </span>
                          <span className="text-white font-medium">{partner.employees}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Revenue: </span>
                          <span className="text-white font-medium">{partner.revenue}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          aria-label="Send message"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                        <Link
                          href={`/partners/${partner.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors"
                        >
                          View Profile
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

      {/* Join CTA */}
      <section className="relative z-10 py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            GROW YOUR NETWORK
          </div>
          <h2 className="text-2xl font-bold mb-4">List Your Company in the Partner Directory</h2>
          <p className="text-zinc-400 mb-6">
            Join 1,200+ HUBZone businesses and get discovered by primes looking for qualified subcontractors.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-xl font-medium transition-all"
          >
            Add Your Company
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
