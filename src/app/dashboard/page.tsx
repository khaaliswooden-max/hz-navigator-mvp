'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  LayoutDashboard,
  Map,
  Users,
  Search,
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
  Building2,
  Shield,
  FileText,
  HelpCircle,
  ExternalLink,
  Home,
  Target,
  Handshake,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AddressLookup from '@/components/AddressLookup';
import ComplianceDashboard from '@/components/ComplianceDashboard';
import EmployeeTable from '@/components/EmployeeTable';

// Dynamic import for map to avoid SSR issues
const HubzoneMap = dynamic(() => import('@/components/HubzoneMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-zinc-800 rounded-xl flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type TabId = 'dashboard' | 'lookup' | 'employees' | 'map';

const DEMO_ORG_ID = 'demo-org-001';

// Mock data for ecosystem widgets
const recentOpportunities = [
  { id: '1', title: 'IT Infrastructure Modernization', agency: 'VA', value: '$3.2M', daysLeft: 12, matchScore: 95 },
  { id: '2', title: 'Cybersecurity Operations Support', agency: 'DoD', value: '$1.8M', daysLeft: 17, matchScore: 88 },
  { id: '3', title: 'Healthcare IT Support', agency: 'HHS', value: '$850K', daysLeft: 5, matchScore: 92 },
];

const partnerRequests = [
  { id: '1', name: 'TechServe Solutions', type: 'JV Partner', status: 'pending' },
  { id: '2', name: 'Federal IT Partners', type: 'Subcontractor', status: 'new' },
  { id: '3', name: 'GovTech Inc', type: 'Teaming', status: 'pending' },
];

const upcomingDeadlines = [
  { title: 'Annual Recertification', date: '2024-03-15', type: 'critical', daysLeft: 45 },
  { title: 'Q1 Compliance Review', date: '2024-01-31', type: 'warning', daysLeft: 12 },
  { title: 'Employee Verification', date: '2024-02-28', type: 'normal', daysLeft: 40 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<
    Array<{ lat: number; lng: number; isHubzone: boolean; label?: string }>
  >([]);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleLookupResult = useCallback(
    (result: { latitude: number; longitude: number; isHubzone: boolean; address: string }) => {
      setMapMarkers((prev) => [
        ...prev,
        {
          lat: result.latitude,
          lng: result.longitude,
          isHubzone: result.isHubzone,
          label: result.address,
        },
      ]);
    },
    []
  );

  const navItems = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lookup' as TabId, label: 'Address Lookup', icon: Search },
    { id: 'employees' as TabId, label: 'Employees', icon: Users },
    { id: 'map' as TabId, label: 'HUBZone Map', icon: Map },
  ];

  const ecosystemNavItems = [
    { label: 'Opportunity Scanner', icon: Target, href: '/opportunities', badge: '12' },
    { label: 'Partner Finder', icon: Handshake, href: '/partners', badge: '3' },
    { label: 'Academy', icon: BookOpen, href: '/academy' },
  ];

  const secondaryNavItems = [
    { label: 'Certifications', icon: FileText, href: '#' },
    { label: 'Locations', icon: Building2, href: '#' },
    { label: 'Settings', icon: Settings, href: '#' },
    { label: 'Help', icon: HelpCircle, href: '#' },
  ];

  // Ecosystem Score calculation (mock)
  const ecosystemScore = 87;
  const complianceHealth = 92;
  const opportunityActivity = 78;
  const networkGrowth = 85;

  return (
    <div className="h-screen flex bg-zinc-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 border-r border-white/5 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-white">HZ Navigator</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Ecosystem Platform
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Back to Home */}
        <div className="px-3 pt-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Back to Home</span>}
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <p className={cn('px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2', !sidebarOpen && 'hidden')}>
            Compliance
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            );
          })}

          {/* Ecosystem Nav */}
          <div className="pt-4">
            <p className={cn('px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2', !sidebarOpen && 'hidden')}>
              Ecosystem
            </p>
            {ecosystemNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Secondary Nav */}
        <div className="py-4 px-3 border-t border-white/5 space-y-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </a>
            );
          })}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/5">
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-zinc-500 mb-2">Powered by</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Visionblox LLC
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        {/* Top Bar */}
        <header className="h-16 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>HZ Navigator</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 relative"
              aria-label="View notifications (3 new)"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
              VB
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-950">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in space-y-6">
              {/* Welcome Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {greeting}, Welcome back! 👋
                  </h2>
                  <p className="text-zinc-400 mt-1">
                    Your HUBZone ecosystem at a glance
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/opportunities"
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-medium transition-colors"
                  >
                    <Target className="w-4 h-4" />
                    View Opportunities
                  </Link>
                </div>
              </div>

              {/* Ecosystem Score & Key Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Ecosystem Score Card */}
                <div className="lg:col-span-1 bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Ecosystem Score</span>
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">{ecosystemScore}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">+5 from last month</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Compliance</span>
                      <span className="text-white font-medium">{complianceHealth}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${complianceHealth}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Opportunity Activity</span>
                      <span className="text-white font-medium">{opportunityActivity}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${opportunityActivity}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Network Growth</span>
                      <span className="text-white font-medium">{networkGrowth}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${networkGrowth}%` }} />
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <ArrowUpRight className="w-3 h-3" /> 3%
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">42%</div>
                    <div className="text-sm text-zinc-400">HUBZone Compliance</div>
                    <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '42%' }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-zinc-500">
                      <span>0%</span>
                      <span className="text-amber-400">35% req.</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-violet-400" />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-violet-400">
                        <Zap className="w-3 h-3" /> New
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">12</div>
                    <div className="text-sm text-zinc-400">Matching Opportunities</div>
                    <Link href="/opportunities" className="mt-3 flex items-center gap-1 text-sm text-violet-400 hover:underline">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Handshake className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-cyan-400">
                        <Activity className="w-3 h-3" /> Active
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">3</div>
                    <div className="text-sm text-zinc-400">Partner Requests</div>
                    <Link href="/partners" className="mt-3 flex items-center gap-1 text-sm text-cyan-400 hover:underline">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compliance Dashboard */}
                <div className="lg:col-span-2">
                  <ComplianceDashboard orgId={DEMO_ORG_ID} />
                </div>

                {/* Right Sidebar Widgets */}
                <div className="space-y-6">
                  {/* Upcoming Deadlines */}
                  <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Upcoming Deadlines</h3>
                      <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="divide-y divide-white/5">
                      {upcomingDeadlines.map((deadline, idx) => (
                        <div key={idx} className="px-5 py-3 flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            deadline.type === 'critical' && 'bg-red-500',
                            deadline.type === 'warning' && 'bg-amber-500',
                            deadline.type === 'normal' && 'bg-emerald-500'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{deadline.title}</p>
                            <p className="text-xs text-zinc-500">{deadline.daysLeft} days left</p>
                          </div>
                          {deadline.type === 'critical' && (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Opportunities */}
                  <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Top Opportunities</h3>
                      <Link href="/opportunities" className="text-xs text-violet-400 hover:underline">
                        View all →
                      </Link>
                    </div>
                    <div className="divide-y divide-white/5">
                      {recentOpportunities.map((opp) => (
                        <div key={opp.id} className="px-5 py-3 hover:bg-white/5 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{opp.title}</p>
                              <p className="text-xs text-zinc-500">{opp.agency} • {opp.value}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={cn(
                                'text-sm font-medium',
                                opp.matchScore >= 90 ? 'text-emerald-400' : 'text-amber-400'
                              )}>
                                {opp.matchScore}%
                              </div>
                              <div className={cn(
                                'text-xs',
                                opp.daysLeft <= 7 ? 'text-red-400' : 'text-zinc-500'
                              )}>
                                {opp.daysLeft}d left
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Partner Requests */}
                  <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Partner Requests</h3>
                      <Link href="/partners" className="text-xs text-cyan-400 hover:underline">
                        View all →
                      </Link>
                    </div>
                    <div className="divide-y divide-white/5">
                      {partnerRequests.map((req) => (
                        <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{req.name}</p>
                            <p className="text-xs text-zinc-500">{req.type}</p>
                          </div>
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            req.status === 'new' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-400'
                          )}>
                            {req.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lookup Tab */}
          {activeTab === 'lookup' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  HUBZone Address Lookup
                </h2>
                <p className="text-zinc-400 mt-1">
                  Verify if any address falls within a designated HUBZone area
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AddressLookup onResult={handleLookupResult} />
                <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                  <HubzoneMap
                    className="h-[400px]"
                    markers={mapMarkers}
                    showLegend={true}
                  />
                </div>
              </div>

              {/* Recent Lookups */}
              {mapMarkers.length > 0 && (
                <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="font-semibold text-white">Recent Lookups</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {mapMarkers.slice(-5).reverse().map((marker, idx) => (
                      <div
                        key={idx}
                        className="px-6 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              marker.isHubzone ? 'bg-emerald-500/20' : 'bg-zinc-800'
                            )}
                          >
                            <Map
                              className={cn(
                                'w-4 h-4',
                                marker.isHubzone ? 'text-emerald-400' : 'text-zinc-500'
                              )}
                            />
                          </div>
                          <span className="text-sm text-white">
                            {marker.label || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-1 rounded-full',
                            marker.isHubzone
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-800 text-zinc-500'
                          )}
                        >
                          {marker.isHubzone ? 'In HUBZone' : 'Not in HUBZone'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Employee Roster</h2>
                <p className="text-zinc-400 mt-1">
                  Manage employee records and track HUBZone residency status
                </p>
              </div>
              <EmployeeTable
                orgId={DEMO_ORG_ID}
                onAddEmployee={() => alert('Add employee modal coming soon!')}
              />
            </div>
          )}

          {/* Map Tab */}
          {activeTab === 'map' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">HUBZone Map</h2>
                <p className="text-zinc-400 mt-1">
                  Explore designated HUBZone areas across the United States
                </p>
              </div>
              <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                <HubzoneMap
                  className="h-[calc(100vh-220px)]"
                  markers={mapMarkers}
                  showLegend={true}
                  onLocationSelect={(lat, lng) => {
                    console.log('Selected:', lat, lng);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
