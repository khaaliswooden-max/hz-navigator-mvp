'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EcosystemCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  color?: string;
  badge?: string;
  metrics?: {
    label: string;
    value: string;
  }[];
  className?: string;
}

export default function EcosystemCard({
  icon: Icon,
  title,
  description,
  href,
  color = '#3b82f6',
  badge,
  metrics,
  className,
}: EcosystemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const content = (
    <div
      ref={cardRef}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-all duration-300',
        'hover:border-white/20 hover:bg-zinc-900/70',
        href && 'cursor-pointer',
        className
      )}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${color}15, transparent 40%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {badge && (
            <span
              className="px-2 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-zinc-400 mb-4">{description}</p>

        {metrics && metrics.length > 0 && (
          <div className="flex gap-4 pt-4 border-t border-white/5">
            {metrics.map((metric, idx) => (
              <div key={idx}>
                <div className="text-xl font-bold text-white">{metric.value}</div>
                <div className="text-xs text-zinc-500">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        {href && (
          <div className="flex items-center gap-2 mt-4 text-sm font-medium text-zinc-400 group-hover:text-blue-400 transition-colors">
            <span>Explore</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
