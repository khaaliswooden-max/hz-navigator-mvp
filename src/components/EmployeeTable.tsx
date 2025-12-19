'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  MoreVertical,
  RefreshCw,
  Upload,
  Download,
} from 'lucide-react';
import { cn, formatDate, HUBZONE_TYPES, type HubzoneType } from '@/lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  hireDate: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isHubzoneResident: boolean;
  hubzoneType?: string;
  lastVerified?: string;
}

interface EmployeeStats {
  total: number;
  hubzoneResidents: number;
  nonHubzoneResidents: number;
  compliancePercent: number;
  isCompliant: boolean;
}

interface EmployeeTableProps {
  orgId: string;
  onAddEmployee?: () => void;
  className?: string;
}

export default function EmployeeTable({ orgId, onAddEmployee, className }: EmployeeTableProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'hubzone' | 'non-hubzone'>('all');

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees?orgId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [orgId]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'hubzone' && emp.isHubzoneResident) ||
      (filter === 'non-hubzone' && !emp.isHubzoneResident);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className={cn('bg-zinc-900 border border-white/5 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Employee Roster
            </h2>
            {stats && (
              <p className="text-sm text-zinc-400 mt-1">
                {stats.hubzoneResidents} of {stats.total} employees in HUBZone (
                {stats.compliancePercent.toFixed(1)}%)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition-colors">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={onAddEmployee} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['all', 'hubzone', 'non-hubzone'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {f === 'all' ? 'All' : f === 'hubzone' ? 'HUBZone' : 'Non-HUBZone'}
            </button>
          ))}
        </div>

        <button onClick={fetchEmployees} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-3">
                Address
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-3">
                HUBZone Status
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-3">
                Hire Date
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-3">
                Verified
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  </td>
                  <td></td>
                </tr>
              ))
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">
                    {searchQuery || filter !== 'all'
                      ? 'No employees match your filters'
                      : 'No employees added yet'}
                  </p>
                  {!searchQuery && filter === 'all' && (
                    <button onClick={onAddEmployee} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2 mx-auto">
                      <Plus className="w-4 h-4" />
                      Add First Employee
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const hubzoneInfo = emp.hubzoneType
                  ? HUBZONE_TYPES[emp.hubzoneType as HubzoneType]
                  : null;

                return (
                  <tr
                    key={emp.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">
                          {emp.firstName} {emp.lastName}
                        </p>
                        {emp.email && (
                          <p className="text-sm text-zinc-500">{emp.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-zinc-300">{emp.streetAddress}</p>
                          <p className="text-zinc-500">
                            {emp.city}, {emp.state} {emp.zipCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {emp.isHubzoneResident ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: hubzoneInfo
                                  ? `${hubzoneInfo.color}20`
                                  : 'rgba(16, 185, 129, 0.2)',
                                color: hubzoneInfo?.color || '#10b981',
                              }}
                            >
                              {emp.hubzoneType || 'HUBZone'}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm text-zinc-500">Not in HUBZone</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {formatDate(emp.hireDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.lastVerified ? (
                        <span className="text-sm text-zinc-500">
                          {formatDate(emp.lastVerified)}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-600">Never</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length > 0 && (
        <div className="px-6 py-3 border-t border-white/5 text-sm text-zinc-500">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      )}
    </div>
  );
}
