'use client';

import Link from 'next/link';
import {
  Shield,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const footerSections = [
  {
    title: 'Platform',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Address Verification', href: '/dashboard?tab=lookup' },
      { label: 'Employee Tracking', href: '/dashboard?tab=employees' },
      { label: 'HUBZone Map', href: '/dashboard?tab=map' },
      { label: 'Opportunity Scanner', href: '/opportunities' },
      { label: 'Partner Finder', href: '/partners' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'HUBZone Academy', href: '/academy' },
      { label: 'Certification Guide', href: '/guides' },
      { label: 'API Documentation', href: '/api-docs' },
      { label: 'Templates', href: '/templates' },
      { label: 'Success Stories', href: '/success-stories' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Partner Directory', href: '/directory' },
      { label: 'Events & Webinars', href: '/events' },
      { label: 'Discussion Forum', href: '/forum' },
      { label: 'Expert Network', href: '/experts' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Visionblox', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Security', href: '/security' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-zinc-950">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl text-white">HZ Navigator</span>
                <p className="text-xs text-zinc-500">The HUBZone Ecosystem</p>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs">
              The one-stop shop for HUBZone success. Compliance, opportunities, and partnerships—all in one place.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {footerSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex flex-wrap gap-8 text-sm text-zinc-400">
            <a href="mailto:support@hznavigator.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              support@hznavigator.com
            </a>
            <a href="tel:+1-800-HUBZONE" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone className="w-4 h-4" />
              1-800-HUBZONE
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Washington, DC
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} Visionblox LLC. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {legalLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
