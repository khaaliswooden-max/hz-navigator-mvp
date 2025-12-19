'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Award, Handshake, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  href: string;
  color: string;
}

const roles: Role[] = [
  {
    id: 'certified',
    icon: Award,
    title: 'HUBZone Certified Vendor',
    subtitle: 'Already certified',
    description: 'Maintain compliance, find opportunities, and grow your federal business.',
    features: [
      'Real-time compliance tracking',
      'AI-powered opportunity scanner',
      'Teaming partner matching',
      'Audit defense preparation',
    ],
    href: '/dashboard',
    color: '#10b981',
  },
  {
    id: 'seeking',
    icon: Building2,
    title: 'Seeking Certification',
    subtitle: 'Getting started',
    description: 'Prepare for HUBZone certification with guided tools and resources.',
    features: [
      'Certification readiness assessment',
      'Address eligibility verification',
      'Employee tracking setup',
      'Step-by-step certification guide',
    ],
    href: '/academy',
    color: '#3b82f6',
  },
  {
    id: 'partner',
    icon: Handshake,
    title: 'Prime Contractor Partner',
    subtitle: 'Looking for HUBZone subs',
    description: 'Find qualified HUBZone subcontractors to meet your requirements.',
    features: [
      'Verified vendor directory',
      'Capability search & filtering',
      'Teaming arrangement tools',
      'Compliance verification',
    ],
    href: '/partners',
    color: '#8b5cf6',
  },
];

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Your Path to HUBZone Success
        </h2>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Select your role to get a tailored experience designed for your specific needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          const isHovered = hoveredRole === role.id;

          return (
            <div
              key={role.id}
              className={cn(
                'group relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden',
                isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
              )}
              onClick={() => setSelectedRole(role.id)}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              {/* Gradient background on hover */}
              <div
                className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-300',
                  (isSelected || isHovered) && 'opacity-100'
                )}
                style={{
                  background: `radial-gradient(600px circle at 50% 0%, ${role.color}15, transparent 70%)`,
                }}
              />

              <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${role.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: role.color }} />
                  </div>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-zinc-600'
                    )}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    {role.subtitle}
                  </p>
                  <h3 className="text-xl font-bold text-white">{role.title}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-400 mb-6">{role.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={role.href}
                  className={cn(
                    'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all',
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                  )}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
