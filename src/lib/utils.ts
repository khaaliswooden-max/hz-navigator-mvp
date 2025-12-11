import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getComplianceStatus(percent: number): 'compliant' | 'warning' | 'critical' {
  if (percent >= 35) return 'compliant';
  if (percent >= 25) return 'warning';
  return 'critical';
}

export function getComplianceLabel(status: 'compliant' | 'warning' | 'critical'): string {
  switch (status) {
    case 'compliant':
      return 'Compliant';
    case 'warning':
      return 'At Risk';
    case 'critical':
      return 'Non-Compliant';
  }
}

export const HUBZONE_TYPES = {
  QCT: { label: 'Qualified Census Tract', color: '#3b82f6' },
  QNMC: { label: 'Qualified Non-Metropolitan County', color: '#8b5cf6' },
  DDA: { label: 'Difficult Development Area', color: '#06b6d4' },
  BRAC: { label: 'Base Realignment & Closure', color: '#f59e0b' },
  INDIAN: { label: 'Indian Reservation', color: '#ec4899' },
} as const;

export type HubzoneType = keyof typeof HUBZONE_TYPES;
