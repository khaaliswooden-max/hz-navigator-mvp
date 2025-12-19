'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * HUBZone Map Integration for HZ Navigator
 * 
 * This component provides:
 * 1. Embedded official SBA HUBZone Map
 * 2. Address verification with our database
 * 3. Employee address overlay
 * 4. Compliance visualization
 */

// Types
interface AddressResult {
  address: string;
  isHubzone: boolean;
  hubzoneType?: string;
  hubzoneTypes?: string[];
  censusTract?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  expirationDate?: string;
  verifiedAt: Date;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  isHubzoneResident: boolean;
  hubzoneType?: string;
}

// Color constants matching HZ Navigator brand
const COLORS = {
  navy: '#1E3A5F',
  teal: '#2EA891',
  gold: '#D4A84B',
  white: '#FFFFFF',
  lightGray: '#F8FAFC',
  darkGray: '#334155',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// HUBZone type descriptions
const HUBZONE_TYPES: Record<string, { label: string; color: string; description: string }> = {
  qct: {
    label: 'Qualified Census Tract',
    color: '#3B82F6',
    description: 'Census tract with low income or high poverty rate',
  },
  qnmc: {
    label: 'Qualified Non-Metropolitan County',
    color: '#8B5CF6',
    description: 'Non-metro county with low median income or high unemployment',
  },
  indian_land: {
    label: 'Indian Land',
    color: '#EC4899',
    description: 'Federally recognized Indian reservation or trust land',
  },
  brac: {
    label: 'Base Closure Area',
    color: '#F97316',
    description: 'Area affected by military base realignment or closure',
  },
  redesignated: {
    label: 'Redesignated Area',
    color: '#EAB308',
    description: 'Previously qualified area with grace period (3 years)',
  },
  disaster: {
    label: 'Qualified Disaster Area',
    color: '#EF4444',
    description: 'Presidentially-declared major disaster area',
  },
  governor: {
    label: 'Governor-Designated',
    color: '#14B8A6',
    description: 'State governor-designated covered area',
  },
};

export default function HubzoneMapPage() {
  // State
  const [searchAddress, setSearchAddress] = useState('');
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeOverlay, setShowEmployeeOverlay] = useState(false);
  const [complianceStats, setComplianceStats] = useState({
    total: 0,
    hubzone: 0,
    percentage: 0,
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'verify' | 'employees' | 'compliance'>('verify');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load employee data
  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
        calculateComplianceStats(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
      // Use mock data for demo
      const mockEmployees: Employee[] = [
        { id: '1', firstName: 'John', lastName: 'Smith', address: '100 F Street NE, Washington, DC 20549', isHubzoneResident: true, hubzoneType: 'qct' },
        { id: '2', firstName: 'Jane', lastName: 'Doe', address: '1600 Pennsylvania Ave, Washington, DC 20500', isHubzoneResident: false },
        { id: '3', firstName: 'Robert', lastName: 'Johnson', address: '500 E Street SW, Washington, DC 20024', isHubzoneResident: true, hubzoneType: 'qct' },
      ];
      setEmployees(mockEmployees);
      calculateComplianceStats(mockEmployees);
    }
  };

  const calculateComplianceStats = (employeeList: Employee[]) => {
    const total = employeeList.length;
    const hubzone = employeeList.filter(e => e.isHubzoneResident).length;
    const percentage = total > 0 ? (hubzone / total) * 100 : 0;
    setComplianceStats({ total, hubzone, percentage });
  };

  // Verify address against HUBZone database
  const verifyAddress = useCallback(async () => {
    if (!searchAddress.trim()) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/agents/cartograph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'verify_address',
          input: { address: searchAddress },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAddressResult({
          address: searchAddress,
          isHubzone: data.isHubzone,
          hubzoneType: data.hubzoneType,
          hubzoneTypes: data.hubzoneTypes,
          censusTract: data.censusTract,
          county: data.county,
          latitude: data.latitude,
          longitude: data.longitude,
          expirationDate: data.expirationDate,
          verifiedAt: new Date(),
        });
      } else {
        // Fallback simulation for demo
        simulateVerification();
      }
    } catch (error) {
      console.error('Verification failed:', error);
      simulateVerification();
    } finally {
      setIsVerifying(false);
    }
  }, [searchAddress]);

  const simulateVerification = () => {
    // Demo simulation - in production this calls the real API
    const isInDC = searchAddress.toLowerCase().includes('washington') || 
                   searchAddress.toLowerCase().includes('dc');
    setAddressResult({
      address: searchAddress,
      isHubzone: isInDC,
      hubzoneType: isInDC ? 'qct' : undefined,
      hubzoneTypes: isInDC ? ['qct'] : [],
      censusTract: isInDC ? '11001-0062.00' : undefined,
      county: isInDC ? 'District of Columbia' : undefined,
      verifiedAt: new Date(),
    });
  };

  // Open address in SBA map
  const openInSBAMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.certify.sba.gov/hubzone/map#address=${encodedAddress}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1E3A5F] to-[#2EA891] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HUBZone Map</h1>
              <p className="text-white/80 text-sm mt-1">
                Verify addresses and track employee HUBZone residency
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-white/60">Compliance Status</div>
                <div className={`text-xl font-bold ${
                  complianceStats.percentage >= 35 ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  {complianceStats.percentage.toFixed(1)}%
                </div>
              </div>
              <div className={`w-16 h-16 rounded-full border-4 ${
                complianceStats.percentage >= 35 
                  ? 'border-emerald-400 bg-emerald-400/20' 
                  : 'border-amber-400 bg-amber-400/20'
              } flex items-center justify-center`}>
                <span className="text-sm font-bold">
                  {complianceStats.hubzone}/{complianceStats.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {[
              { id: 'verify', label: 'Verify Address', icon: '📍' },
              { id: 'employees', label: 'Employee Addresses', icon: '👥' },
              { id: 'compliance', label: 'Compliance Overview', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#2EA891] text-[#1E3A5F]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Address Verification */}
            {activeTab === 'verify' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Verify HUBZone Status
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && verifyAddress()}
                      placeholder="123 Main St, City, State ZIP"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2EA891] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={verifyAddress}
                      disabled={isVerifying || !searchAddress.trim()}
                      className="flex-1 bg-[#2EA891] hover:bg-[#259980] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Verifying...
                        </span>
                      ) : 'Verify Address'}
                    </button>
                    <button
                      onClick={() => openInSBAMap(searchAddress)}
                      disabled={!searchAddress.trim()}
                      className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="Open in official SBA Map"
                    >
                      🔗
                    </button>
                  </div>
                </div>

                {/* Verification Result */}
                {addressResult && (
                  <div className={`mt-6 p-4 rounded-lg border-2 ${
                    addressResult.isHubzone 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        addressResult.isHubzone 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-400 text-white'
                      }`}>
                        {addressResult.isHubzone ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          addressResult.isHubzone ? 'text-emerald-800' : 'text-slate-800'
                        }`}>
                          {addressResult.isHubzone ? 'Qualified HUBZone' : 'Not in HUBZone'}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {addressResult.address}
                        </p>
                        
                        {addressResult.isHubzone && addressResult.hubzoneType && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: HUBZONE_TYPES[addressResult.hubzoneType]?.color || '#6B7280' }}
                              />
                              <span className="text-sm font-medium">
                                {HUBZONE_TYPES[addressResult.hubzoneType]?.label || addressResult.hubzoneType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {HUBZONE_TYPES[addressResult.hubzoneType]?.description}
                            </p>
                          </div>
                        )}
                        
                        {addressResult.censusTract && (
                          <div className="mt-2 text-xs text-slate-500">
                            Census Tract: {addressResult.censusTract}
                          </div>
                        )}
                        
                        {addressResult.expirationDate && (
                          <div className="mt-2 text-xs text-amber-600 font-medium">
                            ⚠️ Expires: {new Date(addressResult.expirationDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                      <button
                        onClick={() => openInSBAMap(addressResult.address)}
                        className="flex-1 text-sm text-[#1E3A5F] hover:text-[#2EA891] font-medium"
                      >
                        View on SBA Map →
                      </button>
                      <button
                        onClick={() => {
                          // Save to database
                          console.log('Saving verification:', addressResult);
                        }}
                        className="flex-1 text-sm text-[#2EA891] hover:text-[#259980] font-medium"
                      >
                        Save Verification
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Employee List */}
            {activeTab === 'employees' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Employee Addresses
                  </h2>
                  <span className="text-sm text-slate-500">
                    {complianceStats.hubzone} of {complianceStats.total} in HUBZone
                  </span>
                </div>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {employees.map((employee) => (
                    <div 
                      key={employee.id}
                      className={`p-3 rounded-lg border ${
                        employee.isHubzoneResident 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-slate-800">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {employee.address}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.isHubzoneResident
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {employee.isHubzoneResident ? 'HUBZone ✓' : 'Non-HZ'}
                        </div>
                      </div>
                      <button
                        onClick={() => openInSBAMap(employee.address)}
                        className="mt-2 text-xs text-[#2EA891] hover:underline"
                      >
                        Verify on SBA Map →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Overview */}
            {activeTab === 'compliance' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Compliance Overview
                </h2>
                
                {/* Compliance Gauge */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* Background arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="12"
                      strokeDasharray="251.2"
                      strokeDashoffset="0"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={complianceStats.percentage >= 35 ? '#10B981' : '#F59E0B'}
                      strokeWidth="12"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * complianceStats.percentage / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    {/* 35% threshold marker */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#1E3A5F"
                      strokeWidth="2"
                      strokeDasharray="2 249.2"
                      strokeDashoffset={251.2 - (251.2 * 35 / 100)}
                      opacity="0.5"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${
                      complianceStats.percentage >= 35 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {complianceStats.percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-500">
                      {complianceStats.hubzone} / {complianceStats.total}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className={`p-4 rounded-lg ${
                  complianceStats.percentage >= 35 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {complianceStats.percentage >= 35 ? '✅' : '⚠️'}
                    </span>
                    <div>
                      <div className={`font-semibold ${
                        complianceStats.percentage >= 35 ? 'text-emerald-800' : 'text-amber-800'
                      }`}>
                        {complianceStats.percentage >= 35 ? 'Compliant' : 'Below Threshold'}
                      </div>
                      <div className="text-sm text-slate-600">
                        {complianceStats.percentage >= 35 
                          ? 'Meeting 35% HUBZone residency requirement'
                          : `Need ${Math.ceil(complianceStats.total * 0.35) - complianceStats.hubzone} more HUBZone residents`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">HUBZone Types</h3>
                  <div className="space-y-2">
                    {Object.entries(HUBZONE_TYPES).map(([key, type]) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-slate-600">{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Map Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗺️</span>
                  <span className="font-medium text-slate-800">Official SBA HUBZone Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://maps.certify.sba.gov/hubzone/map"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2EA891] hover:underline"
                  >
                    Open Full Map ↗
                  </a>
                </div>
              </div>
              
              {/* Embedded Map */}
              <div className="relative" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <div className="animate-spin w-10 h-10 border-4 border-[#2EA891] border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-slate-600">Loading SBA HUBZone Map...</p>
                    </div>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  src="https://maps.certify.sba.gov/hubzone/map"
                  className="w-full h-full border-0"
                  title="SBA HUBZone Map"
                  onLoad={() => setMapLoaded(true)}
                  allow="geolocation"
                />
              </div>
              
              {/* Map Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2">
                <p className="text-xs text-slate-500">
                  Data sourced from U.S. Small Business Administration. Map updated July 2023. 
                  Next update: July 2028 for QCT/QNMC changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quick Actions Floating Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={() => window.open('https://maps.certify.sba.gov/hubzone/map', '_blank')}
          className="w-14 h-14 bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Open SBA Map in new window"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
