'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn, formatPercent, getComplianceStatus, getComplianceLabel } from '@/lib/utils';

interface ComplianceStats {
  organization: {
    id: string;
    name: string;
    hubzoneNumber?: string;
  };
  compliance: {
    status: 'compliant' | 'warning' | 'critical';
    employeeCompliance: {
      total: number;
      hubzoneResidents: number;
      nonHubzoneResidents: number;
      percent: number;
      required: number;
      surplus: number;
    };
    principalOffice: {
      isCompliant: boolean;
      address: string | null;
      hubzoneType?: string;
    };
    employeesByHubzoneType: Record<string, number>;
  };
  certification: {
    status: string;
    expiresAt?: string;
  } | null;
  trend: Array<{
    month: string;
    percent: number;
    threshold: number;
  }>;
}

interface ComplianceDashboardProps {
  orgId: string;
  className?: string;
}

export default function ComplianceDashboard({ orgId, className }: ComplianceDashboardProps) {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/compliance/stats?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch compliance stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [orgId]);

  if (isLoading) {
    return (
      <div className={cn('card', className)}>
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-hz-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={cn('card', className)}>
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
          <p className="text-slate-600">{error || 'No data available'}</p>
          <button onClick={fetchStats} className="btn btn-secondary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { compliance, certification, trend } = stats;
  const statusColors = {
    compliant: 'text-compliant',
    warning: 'text-warning',
    critical: 'text-critical',
  };

  const StatusIcon = {
    compliant: CheckCircle2,
    warning: AlertTriangle,
    critical: XCircle,
  }[compliance.status];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide">
                Compliance Status
              </p>
              <p className={cn('text-2xl font-bold mt-1', statusColors[compliance.status])}>
                {getComplianceLabel(compliance.status)}
              </p>
            </div>
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                compliance.status === 'compliant' && 'bg-compliant-light',
                compliance.status === 'warning' && 'bg-warning-light',
                compliance.status === 'critical' && 'bg-critical-light'
              )}
            >
              <StatusIcon className={cn('w-7 h-7', statusColors[compliance.status])} />
            </div>
          </div>
          {certification && (
            <p className="text-xs text-slate-400 mt-3">
              Certification expires:{' '}
              {certification.expiresAt
                ? new Date(certification.expiresAt).toLocaleDateString()
                : 'N/A'}
            </p>
          )}
        </div>

        {/* Employee Compliance */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide">
                HUBZone Residents
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatPercent(compliance.employeeCompliance.percent)}
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-hz-50 flex items-center justify-center">
              <Users className="w-7 h-7 text-hz-500" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {compliance.employeeCompliance.surplus >= 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-compliant" />
                <span className="text-xs text-compliant">
                  {formatPercent(compliance.employeeCompliance.surplus)} above requirement
                </span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4 text-critical" />
                <span className="text-xs text-critical">
                  {formatPercent(Math.abs(compliance.employeeCompliance.surplus))} below
                  requirement
                </span>
              </>
            )}
          </div>
        </div>

        {/* Principal Office */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide">
                Principal Office
              </p>
              <p
                className={cn(
                  'text-2xl font-bold mt-1',
                  compliance.principalOffice.isCompliant
                    ? 'text-compliant'
                    : 'text-critical'
                )}
              >
                {compliance.principalOffice.isCompliant ? 'In HUBZone' : 'Not in HUBZone'}
              </p>
            </div>
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                compliance.principalOffice.isCompliant
                  ? 'bg-compliant-light'
                  : 'bg-critical-light'
              )}
            >
              <Building2
                className={cn(
                  'w-7 h-7',
                  compliance.principalOffice.isCompliant
                    ? 'text-compliant'
                    : 'text-critical'
                )}
              />
            </div>
          </div>
          {compliance.principalOffice.address && (
            <p className="text-xs text-slate-400 mt-3 truncate">
              {compliance.principalOffice.address}
            </p>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Compliance Trend</h3>
            <p className="text-sm text-slate-500">12-month employee residency percentage</p>
          </div>
          <button onClick={fetchStats} className="btn btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Compliance']}
              />
              <ReferenceLine
                y={35}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: '35% Required',
                  position: 'right',
                  fill: '#f59e0b',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="percent"
                stroke="#1e40af"
                strokeWidth={2}
                dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1e40af' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Breakdown */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">Employee Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900">
                {compliance.employeeCompliance.total}
              </p>
              <p className="text-sm text-slate-500 mt-1">Total Employees</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-compliant">
                {compliance.employeeCompliance.hubzoneResidents}
              </p>
              <p className="text-sm text-slate-500 mt-1">HUBZone Residents</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-400">
                {compliance.employeeCompliance.nonHubzoneResidents}
              </p>
              <p className="text-sm text-slate-500 mt-1">Non-HUBZone</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Progress to 35% requirement</span>
              <span className="font-medium text-slate-900">
                {formatPercent(compliance.employeeCompliance.percent)}
              </span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  compliance.employeeCompliance.percent >= 35
                    ? 'bg-compliant'
                    : compliance.employeeCompliance.percent >= 25
                    ? 'bg-warning'
                    : 'bg-critical'
                )}
                style={{
                  width: `${Math.min(100, compliance.employeeCompliance.percent)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span className="text-warning font-medium">35% required</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
