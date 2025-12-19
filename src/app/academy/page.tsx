'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Play,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Lock,
  Users,
  Star,
  Video,
  GraduationCap,
  Shield,
  TrendingUp,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string;
  modules: number;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  progress?: number;
  isPremium: boolean;
  image?: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'template' | 'checklist' | 'webinar';
  downloadCount: number;
  isPremium: boolean;
}

const courses: Course[] = [
  {
    id: '1',
    title: 'HUBZone Certification Fundamentals',
    description: 'Learn the basics of HUBZone certification, eligibility requirements, and the application process.',
    modules: 6,
    duration: '2 hours',
    level: 'beginner',
    category: 'Certification',
    progress: 65,
    isPremium: false,
  },
  {
    id: '2',
    title: 'Maintaining 35% Compliance',
    description: 'Master the employee residency requirements and learn strategies to maintain ongoing compliance.',
    modules: 5,
    duration: '1.5 hours',
    level: 'intermediate',
    category: 'Compliance',
    progress: 30,
    isPremium: false,
  },
  {
    id: '3',
    title: 'Federal Contracting Strategies',
    description: 'Advanced strategies for winning federal contracts as a HUBZone certified business.',
    modules: 8,
    duration: '3 hours',
    level: 'advanced',
    category: 'Business Growth',
    isPremium: true,
  },
  {
    id: '4',
    title: 'Audit Preparation Masterclass',
    description: 'Prepare for SBA audits with confidence. Learn documentation best practices and common pitfalls.',
    modules: 4,
    duration: '1 hour',
    level: 'intermediate',
    category: 'Compliance',
    isPremium: true,
  },
  {
    id: '5',
    title: 'Teaming & Joint Ventures',
    description: 'Navigate teaming arrangements, JVs, and mentor-protégé relationships in the HUBZone program.',
    modules: 6,
    duration: '2 hours',
    level: 'intermediate',
    category: 'Partnerships',
    isPremium: true,
  },
  {
    id: '6',
    title: 'SAM.gov & Contract Research',
    description: 'Master federal contract research using SAM.gov, FPDS, and other government databases.',
    modules: 5,
    duration: '1.5 hours',
    level: 'beginner',
    category: 'Business Growth',
    isPremium: false,
  },
];

const resources: Resource[] = [
  {
    id: '1',
    title: 'HUBZone Certification Checklist',
    description: 'Complete checklist of all documents and requirements needed for certification.',
    type: 'checklist',
    downloadCount: 2847,
    isPremium: false,
  },
  {
    id: '2',
    title: 'Employee Residency Tracker Template',
    description: 'Excel template to track employee addresses and HUBZone residency status.',
    type: 'template',
    downloadCount: 1923,
    isPremium: false,
  },
  {
    id: '3',
    title: 'Compliance Documentation Guide',
    description: 'Comprehensive guide to maintaining audit-ready documentation.',
    type: 'guide',
    downloadCount: 1456,
    isPremium: true,
  },
  {
    id: '4',
    title: 'Quarterly Compliance Review Webinar',
    description: 'Recorded webinar on conducting quarterly compliance self-assessments.',
    type: 'webinar',
    downloadCount: 892,
    isPremium: true,
  },
];

const upcomingEvents = [
  {
    title: 'HUBZone Certification Q&A',
    date: 'Jan 25, 2024',
    time: '2:00 PM ET',
    type: 'Live Webinar',
  },
  {
    title: 'Federal Proposal Writing Workshop',
    date: 'Feb 1, 2024',
    time: '1:00 PM ET',
    type: 'Workshop',
  },
  {
    title: 'Compliance Best Practices',
    date: 'Feb 8, 2024',
    time: '3:00 PM ET',
    type: 'Live Webinar',
  },
];

export default function AcademyPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = ['all', 'Certification', 'Compliance', 'Business Growth', 'Partnerships'];

  const filteredCourses = selectedCategory === 'all'
    ? courses
    : courses.filter((c) => c.category === selectedCategory);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'text-emerald-400 bg-emerald-500/20';
      case 'intermediate':
        return 'text-amber-400 bg-amber-500/20';
      case 'advanced':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'guide':
        return FileText;
      case 'template':
        return Download;
      case 'checklist':
        return CheckCircle2;
      case 'webinar':
        return Video;
      default:
        return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <Navigation />

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Academy</span>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
              <GraduationCap className="w-3 h-3" />
              FREE LEARNING RESOURCES
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              HUBZone <span className="text-emerald-400">Academy</span>
            </h1>
            <p className="text-lg text-zinc-400 mb-8">
              Master HUBZone certification with expert-led courses, guides, and resources. From certification basics to advanced growth strategies.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-bold">{courses.length}</div>
                  <div className="text-xs text-zinc-500">Courses</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xl font-bold">{resources.length}+</div>
                  <div className="text-xs text-zinc-500">Resources</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xl font-bold">5K+</div>
                  <div className="text-xs text-zinc-500">Learners</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Learning Paths</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-500/40 transition-all">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Certification Path</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Everything you need to get HUBZone certified. From eligibility to application.
              </p>
              <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> 6 modules
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 4 hours
                </span>
              </div>
              <Link
                href="#courses"
                className="flex items-center gap-2 text-emerald-400 font-medium hover:gap-3 transition-all"
              >
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Compliance Mastery</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Stay compliant with the 35% requirement and ace your SBA audits.
              </p>
              <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> 5 modules
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 3 hours
                </span>
              </div>
              <Link
                href="#courses"
                className="flex items-center gap-2 text-blue-400 font-medium hover:gap-3 transition-all"
              >
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20 rounded-2xl p-6 hover:border-violet-500/40 transition-all">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Growth Strategies</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Win more contracts and scale your HUBZone business.
              </p>
              <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> 8 modules
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 5 hours
                </span>
              </div>
              <Link
                href="#courses"
                className="flex items-center gap-2 text-violet-400 font-medium hover:gap-3 transition-all"
              >
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold">All Courses</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  )}
                >
                  {cat === 'all' ? 'All Courses' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
              >
                {/* Course Image/Header */}
                <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
                  <BookOpen className="w-12 h-12 text-zinc-700" />
                  {course.isPremium && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Premium
                    </div>
                  )}
                  {course.progress !== undefined && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', getLevelColor(course.level))}>
                      {course.level}
                    </span>
                    <span className="text-xs text-zinc-500">{course.category}</span>
                  </div>

                  <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{course.description}</p>

                  <div className="flex items-center justify-between text-sm text-zinc-500 mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" /> {course.modules} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {course.duration}
                    </span>
                  </div>

                  <Link
                    href={`/academy/${course.id}`}
                    className={cn(
                      'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium transition-colors',
                      course.isPremium
                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    )}
                  >
                    {course.progress !== undefined ? (
                      <>Continue Learning <ChevronRight className="w-4 h-4" /></>
                    ) : course.isPremium ? (
                      <>Unlock Course <Lock className="w-4 h-4" /></>
                    ) : (
                      <>Start Course <Play className="w-4 h-4" /></>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Downloadable Resources</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => {
              const Icon = getResourceIcon(resource.type);
              return (
                <div
                  key={resource.id}
                  className="group flex items-start gap-4 bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold group-hover:text-blue-400 transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">{resource.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                          <Download className="w-3 h-3" />
                          {resource.downloadCount.toLocaleString()} downloads
                        </div>
                      </div>
                      <button
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-shrink-0',
                          resource.isPremium
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        )}
                      >
                        {resource.isPremium ? (
                          <><Lock className="w-4 h-4" /> Premium</>
                        ) : (
                          <><Download className="w-4 h-4" /> Download</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <Link href="/events" className="text-sm text-emerald-400 hover:underline">
              View All Events →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">{event.type}</span>
                </div>
                <h3 className="font-semibold mb-2">{event.title}</h3>
                <div className="text-sm text-zinc-400">
                  {event.date} at {event.time}
                </div>
                <button className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                  Register Free
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            UNLOCK EVERYTHING
          </div>
          <h2 className="text-2xl font-bold mb-4">Get Full Access to All Premium Content</h2>
          <p className="text-zinc-400 mb-6">
            Upgrade to Professional to unlock all courses, resources, and get priority access to live events.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-medium transition-all"
          >
            Upgrade to Professional
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
