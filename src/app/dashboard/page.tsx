'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AddressLookup from '@/components/AddressLookup';
import ComplianceDashboard from '@/components/ComplianceDashboard';
import EmployeeTable from '@/components/EmployeeTable';

// Dynamic import for map to avoid SSR issues
const HubzoneMap = dynamic(() => import('@/components/HubzoneMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-hz-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type TabId = 'dashboard' | 'lookup' | 'employees' | 'map';

const DEMO_ORG_ID = 'demo-org-001';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<
    Array<{ lat: number; lng: number; isHubzone: boolean; label?: string }>
  >([]);

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

  const secondaryNavItems = [
    { label: 'Certifications', icon: FileText, href: '#' },
    { label: 'Locations', icon: Building2, href: '#' },
    { label: 'Settings', icon: Settings, href: '#' },
    { label: 'Help', icon: HelpCircle, href: '#' },
  ];

  return (
    <div className="h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hz-500 to-hz-700 flex items-center justify-center shadow-lg shadow-hz-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-slate-900">HZ Navigator</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  HUBZone Platform
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Back to Home */}
        <div className="px-3 pt-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Back to Home</span>}
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
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
                    ? 'bg-hz-500 text-white shadow-lg shadow-hz-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Secondary Nav */}
        <div className="py-4 px-3 border-t border-slate-100 space-y-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </a>
            );
          })}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-100">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Powered by</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Visionblox LLC
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>HZ Navigator</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-hz-500 flex items-center justify-center text-white font-semibold text-sm">
              VB
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Compliance Dashboard
                </h2>
                <p className="text-slate-500 mt-1">
                  Monitor your HUBZone certification status and employee compliance
                </p>
              </div>
              <ComplianceDashboard orgId={DEMO_ORG_ID} />
            </div>
          )}

          {/* Lookup Tab */}
          {activeTab === 'lookup' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  HUBZone Address Lookup
                </h2>
                <p className="text-slate-500 mt-1">
                  Verify if any address falls within a designated HUBZone area
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AddressLookup onResult={handleLookupResult} />
                <div className="card overflow-hidden">
                  <HubzoneMap
                    className="h-[400px]"
                    markers={mapMarkers}
                    showLegend={true}
                  />
                </div>
              </div>

              {/* Recent Lookups */}
              {mapMarkers.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-semibold text-slate-900">Recent Lookups</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {mapMarkers.slice(-5).reverse().map((marker, idx) => (
                      <div
                        key={idx}
                        className="px-6 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              marker.isHubzone ? 'bg-compliant-light' : 'bg-slate-100'
                            )}
                          >
                            <Map
                              className={cn(
                                'w-4 h-4',
                                marker.isHubzone ? 'text-compliant' : 'text-slate-400'
                              )}
                            />
                          </div>
                          <span className="text-sm text-slate-700">
                            {marker.label || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-1 rounded-full',
                            marker.isHubzone
                              ? 'bg-compliant-light text-compliant-dark'
                              : 'bg-slate-100 text-slate-500'
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
                <h2 className="text-2xl font-bold text-slate-900">Employee Roster</h2>
                <p className="text-slate-500 mt-1">
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
                <h2 className="text-2xl font-bold text-slate-900">HUBZone Map</h2>
                <p className="text-slate-500 mt-1">
                  Explore designated HUBZone areas across the United States
                </p>
              </div>
              <div className="card overflow-hidden">
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
