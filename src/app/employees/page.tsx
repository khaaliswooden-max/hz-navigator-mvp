'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EmployeeTable from '@/components/EmployeeTable';

const DEMO_ORG_ID = 'demo-org-001';

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'hubzone' | 'non-hubzone' | 'pending'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddEmployee = () => {
    setIsAddModalOpen(true);
    // TODO: Implement add employee modal
    alert('Add employee modal coming soon!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hz-500 to-hz-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900">Employee Management</h1>
                  <p className="text-xs text-slate-500">Manage your workforce HUBZone compliance</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-hz-500 text-white rounded-lg hover:bg-hz-600 transition-colors shadow-sm"
              aria-label="Add new employee"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Employee</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-hz-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-hz-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">8</p>
                <p className="text-xs text-slate-500">Total Employees</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">5</p>
                <p className="text-xs text-slate-500">HUBZone Residents</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">3</p>
                <p className="text-xs text-slate-500">Non-HUBZone</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Pending 90-day</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees by name, email, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hz-500 focus:border-transparent text-sm"
                aria-label="Search employees"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'hubzone', label: 'HUBZone' },
                { id: 'non-hubzone', label: 'Non-HUBZone' },
                { id: 'pending', label: 'Pending' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id as typeof filterStatus)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    filterStatus === filter.id
                      ? 'bg-hz-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                  aria-label={`Filter by ${filter.label}`}
                  aria-pressed={filterStatus === filter.id}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <EmployeeTable
            orgId={DEMO_ORG_ID}
            onAddEmployee={handleAddEmployee}
          />
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">HUBZone Compliance Reminder</h3>
              <p className="text-sm text-amber-700 mt-1">
                To maintain HUBZone certification, at least 35% of your employees must reside in a designated HUBZone area. 
                New employees must live in a HUBZone for at least 90 days before counting toward your compliance percentage.
              </p>
              <a
                href="https://www.sba.gov/federal-contracting/contracting-assistance-programs/hubzone-program"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium mt-2"
              >
                <MapPin className="w-4 h-4" />
                Learn more about HUBZone requirements
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
