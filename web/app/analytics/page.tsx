'use client';

// frontend/app/analytics/page.tsx
// PRODUCTION ANALYTICS DASHBOARD — Chemistry@OCTET
// Stack: Supabase (DB + Auth) | Fly.io (API + Firecracker) | Vercel (Frontend) | Sentry (Errors)
// No emojis. No placeholders. No templates. Everything is live.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { supabase } from '../../lib/supabase/client';
import ChemistryOctetLogo from '../../components/ui/ChemistryOctetLogo';
import { useAnalyticsAccess } from '../../hooks/admin/useAnalyticsAccess';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' });

const PAGE_BG = '#f0efea';
const displayFont = { fontFamily: playfair.style.fontFamily };

interface FeedbackItem {
  id: string;
  user_id: string | null;
  type: 'bug' | 'feedback' | 'feature_request' | string;
  area: string;
  details: string;
  created_at: string;
}

interface BugPlannerEntry {
  id: string;
  feedback_id: string | null;
  user_id: string | null;
  title: string;
  description: string;
  area: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignee: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  target_resolution_date: string | null;
  notes: string;
  reproduction_steps: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  tags: string[];
  linked_prs: string[];
  severity_score: number;
  source: string;
  sentry_issue_id: string | null;
  sentry_url: string | null;
}

interface FlyMachine {
  id: string;
  name: string;
  state: 'started' | 'stopped' | 'destroyed' | string;
  region: string;
  image: string;
  cpu_kind: string;
  cpus: number;
  memory_mb: number;
  created_at: string;
  updated_at: string;
  checks: { name: string; status: 'passing' | 'warning' | 'failing' | string; output: string; last_check: string; }[];
}

interface FlyMetric {
  timestamp: string;
  cpu_percent: number;
  memory_mb: number;
  memory_percent: number;
  network_rx: number;
  network_tx: number;
}

interface FirecrackerInstance {
  id: string;
  state: 'Running' | 'Paused' | 'Stopped' | string;
  vcpu_count: number;
  mem_size_mib: number;
  kernel: string;
  rootfs: string;
  ip_address: string;
  uptime_seconds: number;
  started_at: string;
}

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' | string;
  status: 'unresolved' | 'resolved' | 'ignored' | string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  project: string;
  logger: string | null;
  platform: string;
}

interface SentryEvent {
  id: string;
  eventID: string;
  title: string;
  message: string;
  level: string;
  timestamp: string;
  culprit: string;
  tags: { key: string; value: string; }[];
}

interface AppLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | string;
  service: string;
  message: string;
  trace_id: string | null;
  user_id: string | null;
  metadata: Record<string, any> | null;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | string;
  type: string;
  creator: { uid: string; username: string; };
  created: number;
  ready?: number;
  buildingAt?: number;
  source: string;
  target?: string;
  gitSource?: { ref: string; sha: string; repoId: string; };
}

const PRIORITY_CONFIG = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#dc2626' },
  high:     { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', dot: '#ea580c' },
  medium:   { bg: '#fefce8', text: '#854d0e', border: '#fde047', dot: '#ca8a04' },
  low:      { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#16a34a' },
};

const STATUS_CONFIG = {
  open:        { bg: '#fef2f2', text: '#991b1b', label: 'Open' },
  in_progress: { bg: '#eff6ff', text: '#1e40af', label: 'In Progress' },
  resolved:    { bg: '#f0fdf4', text: '#166534', label: 'Resolved' },
  closed:      { bg: '#f8fafc', text: '#475569', label: 'Closed' },
};

const LOG_LEVEL_CONFIG = {
  ERROR: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  WARN:  { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  INFO:  { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  DEBUG: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

function Icon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  const svgClass = `${className} text-current`;
  const icons: Record<string, JSX.Element> = {
    bug: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M9 7h6M9 17h6M5 10h2M17 10h2M5 14h2M17 14h2M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3M7 10v7a5 5 0 0010 0v-7a3 3 0 00-3-3h-4a3 3 0 00-3 3z" />
      </svg>
    ),
    pulse: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M16 14a4 4 0 10-8 0M9 9a3 3 0 116 0 3 3 0 11-6 0M3 20a6 6 0 0118 0" />
      </svg>
    ),
    server: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <rect x="2" y="2" width="20" height="8" rx="2" /><path d="M2 10v2a2 2 0 002 2h16a2 2 0 002-2v-2M6 6h.01M6 14h.01M2 18h20" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
      </svg>
    ),
    log: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    arrowRight: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    refresh: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
    cpu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
      </svg>
    ),
    memory: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    network: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
    firecracker: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={svgClass}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  };
  return icons[name] || null;
}

export default function AnalyticsPage() {
  const { status, user } = useAnalyticsAccess();

  const [activeTab, setActiveTab] = useState<'overview' | 'bugs' | 'sentry' | 'fly' | 'logs' | 'vercel'>('overview');

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [bugPlanner, setBugPlanner] = useState<BugPlannerEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [sentryIssues, setSentryIssues] = useState<SentryIssue[]>([]);
  const [sentryEvents, setSentryEvents] = useState<SentryEvent[]>([]);
  const [sentryLoading, setSentryLoading] = useState(true);
  const [sentryError, setSentryError] = useState<string | null>(null);

  const [flyMachines, setFlyMachines] = useState<FlyMachine[]>([]);
  const [flyMetrics, setFlyMetrics] = useState<FlyMetric[]>([]);
  const [firecrackerInstances, setFirecrackerInstances] = useState<FirecrackerInstance[]>([]);
  const [flyLoading, setFlyLoading] = useState(true);
  const [flyError, setFlyError] = useState<string | null>(null);

  const [appLogs, setAppLogs] = useState<AppLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  const [logService, setLogService] = useState<string>('ALL');

  const [vercelDeployments, setVercelDeployments] = useState<VercelDeployment[]>([]);
  const [vercelLoading, setVercelLoading] = useState(true);
  const [vercelError, setVercelError] = useState<string | null>(null);

  const [selectedBug, setSelectedBug] = useState<BugPlannerEntry | null>(null);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugFilter, setBugFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeedback = useCallback(async () => {
    try {
      setFeedbackLoading(true);
      setFeedbackError(null);
      const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFeedbackItems(data || []);
      const { data: bugData, error: bugError } = await supabase.from('bug_planner').select('*').order('created_at', { ascending: false });
      if (!bugError && bugData) {
        setBugPlanner(bugData);
      } else {
        const autoBugs: BugPlannerEntry[] = (data || []).filter((f: FeedbackItem) => f.type === 'bug').map((f: FeedbackItem) => ({
          id: f.id, feedback_id: f.id, user_id: f.user_id, title: f.area + ' Issue', description: f.details,
          area: f.area, priority: 'medium', status: 'open', assignee: 'Unassigned',
          created_at: f.created_at, updated_at: f.created_at, resolved_at: null,
          target_resolution_date: null, notes: '', reproduction_steps: null, expected_behavior: null,
          actual_behavior: null, tags: [], linked_prs: [], severity_score: 2, source: 'feedback',
          sentry_issue_id: null, sentry_url: null,
        }));
        setBugPlanner(autoBugs);
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to fetch feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, [supabase]);

  const fetchSentry = useCallback(async () => {
    try {
      setSentryLoading(true);
      setSentryError(null);
      const res = await fetch('/api/analytics/sentry');
      if (!res.ok) throw new Error('Sentry API error: ' + res.status);
      const data = await res.json();
      setSentryIssues(data.issues || []);
      setSentryEvents(data.events || []);
    } catch (err: any) {
      setSentryError(err.message);
      setSentryIssues([]);
      setSentryEvents([]);
    } finally {
      setSentryLoading(false);
    }
  }, []);

  const fetchFly = useCallback(async () => {
    try {
      setFlyLoading(true);
      setFlyError(null);
      const res = await fetch('/api/analytics/fly');
      if (!res.ok) throw new Error('Fly.io API error: ' + res.status);
      const data = await res.json();
      setFlyMachines(data.machines || []);
      setFlyMetrics(data.metrics || []);
      setFirecrackerInstances(data.firecracker || []);
    } catch (err: any) {
      setFlyError(err.message);
      setFlyMachines([]);
      setFlyMetrics([]);
      setFirecrackerInstances([]);
    } finally {
      setFlyLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      const res = await fetch('/api/analytics/logs');
      if (!res.ok) throw new Error('Logs API error: ' + res.status);
      const data = await res.json();
      setAppLogs(data.logs || []);
    } catch (err: any) {
      setLogsError(err.message);
      setAppLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchVercel = useCallback(async () => {
    try {
      setVercelLoading(true);
      setVercelError(null);
      const res = await fetch('/api/analytics/vercel');
      if (!res.ok) throw new Error('Vercel API error: ' + res.status);
      const data = await res.json();
      setVercelDeployments(data.deployments || []);
    } catch (err: any) {
      setVercelError(err.message);
      setVercelDeployments([]);
    } finally {
      setVercelLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFeedback(), fetchSentry(), fetchFly(), fetchLogs(), fetchVercel()]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, [fetchFeedback, fetchSentry, fetchFly, fetchLogs, fetchVercel]);

  const updateBug = async (bugId: string, updates: Partial<BugPlannerEntry>) => {
    try {
      const { error } = await supabase.from('bug_planner').update({
        ...updates, updated_at: new Date().toISOString(),
        resolved_at: updates.status === 'resolved' ? new Date().toISOString() : undefined,
      }).eq('id', bugId);
      if (error) throw error;
      setBugPlanner(prev => prev.map(b => b.id === bugId ? { ...b, ...updates, updated_at: new Date().toISOString() } : b));
    } catch (err) {
      console.error('Bug update failed:', err);
    }
  };

  const addBugNote = async (bugId: string, note: string) => {
    const bug = bugPlanner.find(b => b.id === bugId);
    if (!bug) return;
    const updatedNotes = bug.notes ? bug.notes + '\n' + new Date().toISOString() + ' - ' + note : new Date().toISOString() + ' - ' + note;
    await updateBug(bugId, { notes: updatedNotes });
  };

  const createBugFromFeedback = async (feedbackId: string, priority: BugPlannerEntry['priority'] = 'medium') => {
    try {
      const { data, error } = await supabase.rpc('create_bug_from_feedback', { p_feedback_id: feedbackId, p_priority: priority });
      if (error) throw error;
      await fetchFeedback();
      return data;
    } catch (err) {
      console.error('Create bug failed:', err);
    }
  };

  useEffect(() => {
    if (status === 'authorized') {
      refreshAll();
      const channel = supabase.channel('feedback_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => { fetchFeedback(); }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [status, refreshAll, fetchFeedback, supabase]);

  const filteredBugs = useMemo(() => {
    return bugPlanner.filter(bug => {
      const matchesStatus = bugFilter === 'all' || bug.status === bugFilter;
      const matchesPriority = priorityFilter === 'all' || bug.priority === priorityFilter;
      const matchesSearch = !searchQuery || bug.title.toLowerCase().includes(searchQuery.toLowerCase()) || bug.description.toLowerCase().includes(searchQuery.toLowerCase()) || bug.area.toLowerCase().includes(searchQuery.toLowerCase()) || bug.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    }).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [bugPlanner, bugFilter, priorityFilter, searchQuery]);

  const filteredLogs = useMemo(() => {
    return appLogs.filter(log => {
      const matchesLevel = logFilter === 'ALL' || log.level === logFilter;
      const matchesService = logService === 'ALL' || log.service === logService;
      return matchesLevel && matchesService;
    }).slice(0, 200);
  }, [appLogs, logFilter, logService]);

  const logServices = useMemo(() => {
    const services = new Set(appLogs.map(l => l.service));
    return ['ALL', ...Array.from(services)];
  }, [appLogs]);

  const bugStats = useMemo(() => ({
    total: bugPlanner.length, open: bugPlanner.filter(b => b.status === 'open').length,
    inProgress: bugPlanner.filter(b => b.status === 'in_progress').length,
    resolved: bugPlanner.filter(b => b.status === 'resolved').length,
    closed: bugPlanner.filter(b => b.status === 'closed').length,
    critical: bugPlanner.filter(b => b.priority === 'critical').length,
    high: bugPlanner.filter(b => b.priority === 'high').length,
  }), [bugPlanner]);

  const sentryStats = useMemo(() => ({
    total: sentryIssues.length, unresolved: sentryIssues.filter(i => i.status === 'unresolved').length,
    fatal: sentryIssues.filter(i => i.level === 'fatal').length,
    error: sentryIssues.filter(i => i.level === 'error').length,
    warning: sentryIssues.filter(i => i.level === 'warning').length,
  }), [sentryIssues]);

  const flyStats = useMemo(() => ({
    total: flyMachines.length, running: flyMachines.filter(m => m.state === 'started').length,
    stopped: flyMachines.filter(m => m.state === 'stopped').length,
    totalCpus: flyMachines.reduce((acc, m) => acc + m.cpus, 0),
    totalMemory: flyMachines.reduce((acc, m) => acc + m.memory_mb, 0),
  }), [flyMachines]);

  const logStats = useMemo(() => ({
    total: appLogs.length, errors: appLogs.filter(l => l.level === 'ERROR').length,
    warns: appLogs.filter(l => l.level === 'WARN').length,
    infos: appLogs.filter(l => l.level === 'INFO').length,
    debugs: appLogs.filter(l => l.level === 'DEBUG').length,
  }), [appLogs]);

  if (status === 'checking') {
    return (
      <div className={`min-h-screen bg-[${PAGE_BG}] flex items-center justify-center ${dmSans.className}`}>
        <div className="text-center">
          <ChemistryOctetLogo size={64} background={PAGE_BG} />
          <p className="text-[#5b5566] mt-4 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className={`min-h-screen bg-[${PAGE_BG}] flex items-center justify-center ${dmSans.className}`}>
        <div className="text-center max-w-md px-6">
          <ChemistryOctetLogo size={88} background={PAGE_BG} />
          <h1 className="text-2xl font-semibold mt-4 text-[#221c2e]" style={displayFont}>Access Denied</h1>
          <p className="text-[#5b5566] mt-2 text-sm">The analytics dashboard is restricted to admin and developer accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f0efea] px-6 sm:px-10 lg:px-14 py-8 ${dmSans.className}`}>
      <header className="flex items-start justify-between flex-wrap gap-6 pb-6 border-b border-[#e2dccf] mb-6">
        <div className="flex items-center gap-4">
          <ChemistryOctetLogo size={56} background={PAGE_BG} />
          <div>
            <h1 className="text-3xl font-bold text-[#221c2e]" style={displayFont}>Developer Analytics</h1>
            <p className="text-[#5b5566] text-sm mt-1">Supabase / Fly.io / Sentry / Vercel — live system telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 bg-white border border-[#e2dccf] rounded-full px-3 py-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-[#3fa66b] animate-pulse" />
            <span className="text-[#3fa66b] text-xs font-medium tracking-wide">LIVE</span>
          </span>
          {user?.email && (
            <span className="bg-white border border-[#e2dccf] rounded-full px-3.5 py-1.5 text-xs text-[#5b5566]">
              {user.email} <span className="text-[#9b95a6]">/</span> <span className="text-[#6e4e9e] font-medium">{user.role}</span>
            </span>
          )}
          <button onClick={refreshAll} disabled={isRefreshing} className="flex items-center gap-1.5 bg-white border border-[#e2dccf] rounded-full px-3.5 py-1.5 text-xs text-[#5b5566] hover:bg-[#faf9f6] transition-colors disabled:opacity-50">
            <span className={isRefreshing ? 'animate-spin' : ''}><Icon name="refresh" /></span>
            {isRefreshing ? 'Syncing...' : lastRefresh.toLocaleTimeString()}
          </button>
        </div>
      </header>

      <nav className="flex gap-1 mb-6 bg-white border border-[#e2dccf] rounded-xl p-1 w-fit overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: 'pulse', badge: undefined },
          { id: 'bugs', label: 'Bug Tracker', icon: 'bug', badge: bugStats.open },
          { id: 'sentry', label: 'Sentry', icon: 'alert', badge: sentryStats.unresolved },
          { id: 'fly', label: 'Fly.io', icon: 'server', badge: undefined },
          { id: 'logs', label: 'Logs', icon: 'log', badge: logStats.errors },
          { id: 'vercel', label: 'Vercel', icon: 'check', badge: undefined },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#6e4e9e] text-white shadow-sm' : 'text-[#5b5566] hover:bg-[#f0efea]'}`}>
            <span className="opacity-70"><Icon name={tab.icon} /></span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#fef2f2] text-[#991b1b]'}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Bug Tracker</h3>
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#6e4e9e] bg-[#f1eafb] rounded-full px-3 py-1">{bugStats.open} open</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Critical" value={bugStats.critical} color="#991b1b" />
              <StatBox label="High" value={bugStats.high} color="#9a3412" />
              <StatBox label="In Progress" value={bugStats.inProgress} color="#1e40af" />
              <StatBox label="Resolved" value={bugStats.resolved} color="#166534" />
            </div>
            <button onClick={() => setActiveTab('bugs')} className="mt-4 w-full text-center text-sm text-[#6e4e9e] font-medium hover:underline flex items-center justify-center gap-1">View Bug Planner <Icon name="arrowRight" /></button>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Sentry</h3>
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#991b1b] bg-[#fef2f2] rounded-full px-3 py-1">{sentryStats.unresolved} unresolved</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Fatal" value={sentryStats.fatal} color="#991b1b" />
              <StatBox label="Error" value={sentryStats.error} color="#9a3412" />
              <StatBox label="Warning" value={sentryStats.warning} color="#854d0e" />
              <StatBox label="Total" value={sentryStats.total} color="#475569" />
            </div>
            <button onClick={() => setActiveTab('sentry')} className="mt-4 w-full text-center text-sm text-[#6e4e9e] font-medium hover:underline flex items-center justify-center gap-1">View Sentry <Icon name="arrowRight" /></button>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Fly.io</h3>
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#166534] bg-[#f0fdf4] rounded-full px-3 py-1">{flyStats.running}/{flyStats.total} running</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Machines" value={flyStats.total} color="#6e4e9e" />
              <StatBox label="Running" value={flyStats.running} color="#166534" />
              <StatBox label="CPUs" value={flyStats.totalCpus} color="#6e4e9e" />
              <StatBox label="Memory" value={`${flyStats.totalMemory}MB`} color="#6e4e9e" />
            </div>
            <button onClick={() => setActiveTab('fly')} className="mt-4 w-full text-center text-sm text-[#6e4e9e] font-medium hover:underline flex items-center justify-center gap-1">View Infrastructure <Icon name="arrowRight" /></button>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Application Logs</h3>
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#991b1b] bg-[#fef2f2] rounded-full px-3 py-1">{logStats.errors} errors</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Errors" value={logStats.errors} color="#991b1b" />
              <StatBox label="Warnings" value={logStats.warns} color="#9a3412" />
              <StatBox label="Info" value={logStats.infos} color="#1e40af" />
              <StatBox label="Total" value={logStats.total} color="#475569" />
            </div>
            <button onClick={() => setActiveTab('logs')} className="mt-4 w-full text-center text-sm text-[#6e4e9e] font-medium hover:underline flex items-center justify-center gap-1">View Logs <Icon name="arrowRight" /></button>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Vercel Deployments</h3>
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#166534] bg-[#f0fdf4] rounded-full px-3 py-1">{vercelDeployments.filter(d => d.state === 'READY').length} ready</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vercelDeployments.slice(0, 5).map(dep => (
                <div key={dep.uid} className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#faf9f6]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dep.state === 'READY' ? 'bg-[#16a34a]' : dep.state === 'ERROR' ? 'bg-[#dc2626]' : dep.state === 'BUILDING' ? 'bg-[#2563eb] animate-pulse' : 'bg-[#9ca3af]'}`} />
                    <span className="text-[#221c2e] font-medium">{dep.gitSource?.ref || dep.name}</span>
                  </div>
                  <span className="text-xs text-[#9b95a6]">{dep.gitSource?.sha?.slice(0, 7) || '—'}</span>
                </div>
              ))}
              {vercelDeployments.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-4">No deployments</p>}
            </div>
            <button onClick={() => setActiveTab('vercel')} className="mt-4 w-full text-center text-sm text-[#6e4e9e] font-medium hover:underline flex items-center justify-center gap-1">View Deployments <Icon name="arrowRight" /></button>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Recent Feedback</h3>
              <span className="text-xs text-[#9b95a6]">{feedbackItems.length} total</span>
            </div>
            {feedbackLoading ? <LoadingBlock /> : feedbackError ? <ErrorBlock message={feedbackError} /> : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {feedbackItems.slice(0, 10).map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#faf9f6] transition-colors group">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.type === 'bug' ? 'bg-[#dc2626]' : item.type === 'feature_request' ? 'bg-[#2563eb]' : 'bg-[#16a34a]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase text-[#9b95a6]">{item.type}</span>
                        <span className="text-xs text-[#9b95a6]">/ {item.area}</span>
                      </div>
                      <p className="text-sm text-[#221c2e] truncate">{item.details}</p>
                      <p className="text-xs text-[#9b95a6]">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    {item.type === 'bug' && !bugPlanner.find(b => b.feedback_id === item.id) && (
                      <button onClick={() => createBugFromFeedback(item.id, 'medium')} className="opacity-0 group-hover:opacity-100 text-xs text-[#6e4e9e] font-medium hover:underline transition-opacity">Create Bug</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <CountCard label="Total" value={bugStats.total} color="#6e4e9e" />
            <CountCard label="Open" value={bugStats.open} color="#991b1b" />
            <CountCard label="In Progress" value={bugStats.inProgress} color="#1e40af" />
            <CountCard label="Resolved" value={bugStats.resolved} color="#166534" />
            <CountCard label="Closed" value={bugStats.closed} color="#475569" />
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-white border border-[#e7e2d8] rounded-xl p-4">
            <div className="flex gap-2">
              {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                <button key={s} onClick={() => setBugFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bugFilter === s ? 'bg-[#221c2e] text-white' : 'bg-[#f0efea] text-[#5b5566] hover:bg-[#e2dccf]'}`}>
                  {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityFilter === p ? 'bg-[#6e4e9e] text-white' : 'bg-[#f0efea] text-[#5b5566] hover:bg-[#e2dccf]'}`}>
                  {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9b95a6]"><Icon name="search" /></span>
              <input type="text" placeholder="Search bugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#e2dccf] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e4e9e]" />
            </div>
          </div>

          <div className="bg-white border border-[#e7e2d8] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#faf9f6] border-b border-[#e2dccf]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Area</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Assignee</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Sentry</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2dccf]">
                  {filteredBugs.map(bug => (
                    <tr key={bug.id} className="hover:bg-[#faf9f6] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#9b95a6]">{bug.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-[#221c2e] font-medium truncate" title={bug.title}>{bug.title}</p>
                        <p className="text-xs text-[#9b95a6] truncate">{bug.description}</p>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs bg-[#f0efea] text-[#5b5566] px-2 py-1 rounded">{bug.area}</span></td>
                      <td className="px-4 py-3">
                        <select value={bug.priority} onChange={e => updateBug(bug.id, { priority: e.target.value as any })} className="text-xs font-medium px-2 py-1 rounded-full border cursor-pointer" style={{ backgroundColor: PRIORITY_CONFIG[bug.priority].bg, color: PRIORITY_CONFIG[bug.priority].text, borderColor: PRIORITY_CONFIG[bug.priority].border }}>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={bug.status} onChange={e => updateBug(bug.id, { status: e.target.value as any })} className="text-xs font-medium px-2 py-1 rounded-full border cursor-pointer" style={{ backgroundColor: STATUS_CONFIG[bug.status].bg, color: STATUS_CONFIG[bug.status].text, borderColor: STATUS_CONFIG[bug.status].bg }}>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={bug.assignee} onChange={e => updateBug(bug.id, { assignee: e.target.value })} className="text-xs bg-transparent border-none cursor-pointer text-[#5b5566]">
                          <option>Unassigned</option>
                          <option>Dev Team</option>
                          <option>Frontend</option>
                          <option>Backend</option>
                          <option>Design</option>
                          <option>DevOps</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#9b95a6]">{new Date(bug.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {bug.sentry_url ? (
                          <a href={bug.sentry_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6e4e9e] hover:underline">{bug.sentry_issue_id?.slice(0, 8) || 'View'}</a>
                        ) : <span className="text-xs text-[#9b95a6]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelectedBug(bug); setShowBugModal(true); }} className="text-xs text-[#6e4e9e] hover:underline font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredBugs.length === 0 && <div className="text-center py-12 text-[#9b95a6] text-sm">No bugs match your filters.</div>}
          </div>
        </div>
      )}

      {activeTab === 'sentry' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <CountCard label="Total Issues" value={sentryStats.total} color="#475569" />
            <CountCard label="Unresolved" value={sentryStats.unresolved} color="#991b1b" />
            <CountCard label="Fatal" value={sentryStats.fatal} color="#991b1b" />
            <CountCard label="Error" value={sentryStats.error} color="#9a3412" />
            <CountCard label="Warning" value={sentryStats.warning} color="#854d0e" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-[#221c2e] mb-4" style={displayFont}>Issues</h3>
              {sentryLoading ? <LoadingBlock /> : sentryError ? <ErrorBlock message={sentryError} /> : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sentryIssues.map(issue => (
                    <div key={issue.id} className="p-3 rounded-lg border border-[#e2dccf] hover:border-[#6e4e9e] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${issue.level === 'fatal' ? 'bg-[#dc2626]' : issue.level === 'error' ? 'bg-[#ea580c]' : issue.level === 'warning' ? 'bg-[#ca8a04]' : 'bg-[#6b7280]'}`} />
                            <span className="text-xs font-medium uppercase text-[#9b95a6]">{issue.level}</span>
                            <span className="text-xs text-[#9b95a6]">{issue.project}</span>
                          </div>
                          <p className="text-sm font-medium text-[#221c2e] mt-1 truncate">{issue.title}</p>
                          <p className="text-xs text-[#9b95a6] truncate">{issue.culprit}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${issue.status === 'unresolved' ? 'bg-[#fef2f2] text-[#991b1b]' : issue.status === 'resolved' ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#f8fafc] text-[#475569]'}`}>{issue.status}</span>
                          <p className="text-xs text-[#9b95a6] mt-1">{issue.count} events</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#9b95a6]">
                        <span>First: {new Date(issue.firstSeen).toLocaleDateString()}</span>
                        <span>Last: {new Date(issue.lastSeen).toLocaleDateString()}</span>
                        <span>{issue.userCount} users</span>
                      </div>
                      <a href={issue.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6e4e9e] hover:underline mt-1 inline-block">View in Sentry</a>
                    </div>
                  ))}
                  {sentryIssues.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-8">No issues found</p>}
                </div>
              )}
            </div>
            <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-[#221c2e] mb-4" style={displayFont}>Recent Events</h3>
              {sentryLoading ? <LoadingBlock /> : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sentryEvents.map(event => (
                    <div key={event.id} className="p-3 rounded-lg bg-[#faf9f6]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${event.level === 'fatal' ? 'bg-[#dc2626]' : event.level === 'error' ? 'bg-[#ea580c]' : event.level === 'warning' ? 'bg-[#ca8a04]' : 'bg-[#6b7280]'}`} />
                        <span className="text-xs font-medium uppercase text-[#9b95a6]">{event.level}</span>
                        <span className="text-xs text-[#9b95a6]">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#221c2e] mt-1">{event.title}</p>
                      <p className="text-xs text-[#9b95a6] truncate">{event.culprit}</p>
                      {event.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{event.tags.slice(0, 5).map(tag => <span key={tag.key} className="text-[10px] bg-[#f0efea] text-[#5b5566] px-1.5 py-0.5 rounded">{tag.key}: {tag.value}</span>)}</div>}
                    </div>
                  ))}
                  {sentryEvents.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-8">No events</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fly' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CountCard label="Machines" value={flyStats.total} color="#6e4e9e" />
            <CountCard label="Running" value={flyStats.running} color="#166534" />
            <CountCard label="CPUs" value={flyStats.totalCpus} color="#6e4e9e" />
            <CountCard label="Memory" value={`${flyStats.totalMemory}MB`} color="#6e4e9e" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-[#221c2e] mb-4" style={displayFont}>Fly Machines</h3>
              {flyLoading ? <LoadingBlock /> : flyError ? <ErrorBlock message={flyError} /> : (
                <div className="space-y-3">
                  {flyMachines.map(machine => (
                    <div key={machine.id} className="p-4 rounded-xl border border-[#e2dccf]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${machine.state === 'started' ? 'bg-[#16a34a]' : machine.state === 'stopped' ? 'bg-[#ca8a04]' : 'bg-[#dc2626]'}`} />
                            <span className="font-medium text-[#221c2e]">{machine.name}</span>
                            <span className="text-xs text-[#9b95a6] bg-[#f0efea] px-2 py-0.5 rounded">{machine.region}</span>
                          </div>
                          <p className="text-xs text-[#9b95a6] mt-1">{machine.image}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#9b95a6]">{machine.cpu_kind}</span>
                          <p className="text-sm font-medium text-[#221c2e]">{machine.cpus} CPU / {machine.memory_mb}MB</p>
                        </div>
                      </div>
                      {machine.checks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#e2dccf]">
                          <div className="flex flex-wrap gap-2">
                            {machine.checks.map((check, i) => (
                              <span key={i} className={`text-xs px-2 py-1 rounded-full ${check.status === 'passing' ? 'bg-[#f0fdf4] text-[#166534]' : check.status === 'warning' ? 'bg-[#fefce8] text-[#854d0e]' : 'bg-[#fef2f2] text-[#991b1b]'}`}>{check.name}: {check.status}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {flyMachines.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-8">No machines found</p>}
                </div>
              )}
            </div>
            <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="firecracker" />
                <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Firecracker MicroVMs</h3>
              </div>
              {flyLoading ? <LoadingBlock /> : (
                <div className="space-y-3">
                  {firecrackerInstances.map(vm => (
                    <div key={vm.id} className="p-4 rounded-xl border border-[#e2dccf]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${vm.state === 'Running' ? 'bg-[#16a34a]' : vm.state === 'Paused' ? 'bg-[#ca8a04]' : 'bg-[#dc2626]'}`} />
                            <span className="font-medium text-[#221c2e]">{vm.id.slice(0, 12)}</span>
                          </div>
                          <p className="text-xs text-[#9b95a6] mt-1">{vm.kernel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#221c2e]">{vm.vcpu_count} vCPU / {vm.mem_size_mib}MiB</p>
                          <p className="text-xs text-[#9b95a6]">{vm.ip_address}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#e2dccf] flex items-center gap-4 text-xs text-[#9b95a6]">
                        <span>Uptime: {formatDuration(vm.uptime_seconds)}</span>
                        <span>Rootfs: {vm.rootfs}</span>
                        <span>Started: {new Date(vm.started_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {firecrackerInstances.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-8">No Firecracker instances found</p>}
                </div>
              )}
            </div>
          </div>
          {flyMetrics.length > 0 && (
            <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-[#221c2e] mb-4" style={displayFont}>Resource Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {flyMetrics.slice(0, 8).map((m, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#faf9f6]">
                    <p className="text-xs text-[#9b95a6]">{new Date(m.timestamp).toLocaleTimeString()}</p>
                    <p className="text-sm font-medium text-[#221c2e] mt-1">CPU: {m.cpu_percent.toFixed(1)}%</p>
                    <p className="text-xs text-[#5b5566]">Mem: {m.memory_mb}MB ({m.memory_percent.toFixed(1)}%)</p>
                    <p className="text-xs text-[#5b5566]">Net: {formatBytes(m.network_rx)} / {formatBytes(m.network_tx)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <CountCard label="Total" value={logStats.total} color="#475569" />
            <CountCard label="Errors" value={logStats.errors} color="#991b1b" />
            <CountCard label="Warnings" value={logStats.warns} color="#9a3412" />
            <CountCard label="Info" value={logStats.infos} color="#1e40af" />
            <CountCard label="Debug" value={logStats.debugs} color="#475569" />
          </div>
          <div className="flex flex-wrap gap-3 items-center bg-white border border-[#e7e2d8] rounded-xl p-4">
            <div className="flex gap-2">
              {(['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map(l => (
                <button key={l} onClick={() => setLogFilter(l)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${logFilter === l ? 'bg-[#221c2e] text-white' : 'bg-[#f0efea] text-[#5b5566] hover:bg-[#e2dccf]'}`}>{l}</button>
              ))}
            </div>
            <select value={logService} onChange={e => setLogService(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e2dccf] bg-white text-[#5b5566]">
              {logServices.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Services' : s}</option>)}
            </select>
            <span className="text-xs text-[#9b95a6] ml-auto">{filteredLogs.length} entries shown</span>
          </div>
          <div className="bg-white border border-[#e7e2d8] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#faf9f6] border-b border-[#e2dccf] sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Level</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Message</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">Trace</th>
                    <th className="text-left px-4 py-3 font-medium text-[#5b5566] text-xs uppercase tracking-wide">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2dccf]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#faf9f6] transition-colors">
                      <td className="px-4 py-2 text-xs text-[#9b95a6] whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: (LOG_LEVEL_CONFIG as any)[log.level]?.bg || '#f0efea', color: (LOG_LEVEL_CONFIG as any)[log.level]?.text || '#5b5566', border: `1px solid ${(LOG_LEVEL_CONFIG as any)[log.level]?.border || '#e2dccf'}` }}>{log.level}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-[#5b5566]">{log.service}</td>
                      <td className="px-4 py-2 text-sm text-[#221c2e] max-w-md truncate" title={log.message}>{log.message}</td>
                      <td className="px-4 py-2 text-xs font-mono text-[#9b95a6]">{log.trace_id ? log.trace_id.slice(0, 8) : '—'}</td>
                      <td className="px-4 py-2 text-xs text-[#9b95a6]">{log.user_id ? log.user_id.slice(0, 8) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && <div className="text-center py-12 text-[#9b95a6] text-sm">No logs match your filters.</div>}
          </div>
        </div>
      )}

      {activeTab === 'vercel' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#e7e2d8] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-lg font-semibold text-[#221c2e] mb-4" style={displayFont}>Deployments</h3>
            {vercelLoading ? <LoadingBlock /> : vercelError ? <ErrorBlock message={vercelError} /> : (
              <div className="space-y-3">
                {vercelDeployments.map(dep => (
                  <div key={dep.uid} className="p-4 rounded-xl border border-[#e2dccf]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${dep.state === 'READY' ? 'bg-[#16a34a]' : dep.state === 'ERROR' ? 'bg-[#dc2626]' : dep.state === 'BUILDING' ? 'bg-[#2563eb] animate-pulse' : 'bg-[#9ca3af]'}`} />
                          <span className="font-medium text-[#221c2e]">{dep.gitSource?.ref || dep.name}</span>
                          <span className="text-xs text-[#9b95a6] bg-[#f0efea] px-2 py-0.5 rounded">{dep.type}</span>
                        </div>
                        <p className="text-xs text-[#9b95a6] mt-1">{dep.gitSource?.sha?.slice(0, 7) || '—'} by {dep.creator?.username || 'unknown'}</p>
                        <p className="text-xs text-[#9b95a6]">{new Date(dep.created).toLocaleString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dep.state === 'READY' ? 'bg-[#f0fdf4] text-[#166534]' : dep.state === 'ERROR' ? 'bg-[#fef2f2] text-[#991b1b]' : dep.state === 'BUILDING' ? 'bg-[#eff6ff] text-[#1e40af]' : 'bg-[#f8fafc] text-[#475569]'}`}>{dep.state}</span>
                        {dep.ready && dep.buildingAt && (
                          <p className="text-xs text-[#9b95a6] mt-1">{Math.round((dep.ready - dep.buildingAt) / 1000)}s build</p>
                        )}
                      </div>
                    </div>
                    {dep.url && (
                      <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6e4e9e] hover:underline mt-2 inline-block">{dep.url}</a>
                    )}
                  </div>
                ))}
                {vercelDeployments.length === 0 && <p className="text-sm text-[#9b95a6] text-center py-8">No deployments found</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showBugModal && selectedBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowBugModal(false); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e2dccf]">
              <h3 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>Edit Bug</h3>
              <button onClick={() => setShowBugModal(false)} className="text-[#9b95a6] hover:text-[#221c2e] p-1"><Icon name="close" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Title</label>
                <p className="text-sm text-[#221c2e] mt-1 font-medium">{selectedBug.title}</p>
              </div>
              <div>
                <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Description</label>
                <p className="text-sm text-[#221c2e] mt-1 bg-[#f0efea] p-3 rounded-lg">{selectedBug.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Priority</label>
                  <select value={selectedBug.priority} onChange={e => updateBug(selectedBug.id, { priority: e.target.value as any })} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#e2dccf] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e4e9e]">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Status</label>
                  <select value={selectedBug.status} onChange={e => updateBug(selectedBug.id, { status: e.target.value as any })} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#e2dccf] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e4e9e]">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Assignee</label>
                  <select value={selectedBug.assignee} onChange={e => updateBug(selectedBug.id, { assignee: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#e2dccf] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e4e9e]">
                    <option>Unassigned</option>
                    <option>Dev Team</option>
                    <option>Frontend</option>
                    <option>Backend</option>
                    <option>Design</option>
                    <option>DevOps</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Area</label>
                  <p className="text-sm text-[#221c2e] mt-2">{selectedBug.area}</p>
                </div>
              </div>
              {selectedBug.sentry_url && (
                <div>
                  <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Sentry Link</label>
                  <a href={selectedBug.sentry_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6e4e9e] hover:underline mt-1 block">{selectedBug.sentry_url}</a>
                </div>
              )}
              <div>
                <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Notes</label>
                <div className="mt-1 bg-[#faf9f6] p-3 rounded-lg min-h-[80px] max-h-[200px] overflow-y-auto">
                  {selectedBug.notes ? selectedBug.notes.split('\n').map((line, i) => <p key={i} className="text-xs text-[#5b5566] leading-relaxed">{line}</p>) : <p className="text-xs text-[#9b95a6] italic">No notes yet</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9b95a6] uppercase tracking-wide font-medium">Add Note</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" id="newNoteInput" placeholder="Type a note and press Enter..." className="flex-1 px-3 py-2 rounded-lg border border-[#e2dccf] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e4e9e]" onKeyDown={e => { if (e.key === 'Enter') { const input = e.target as HTMLInputElement; if (input.value.trim()) { addBugNote(selectedBug.id, input.value.trim()); input.value = ''; } } }} />
                  <button onClick={() => { const input = document.getElementById('newNoteInput') as HTMLInputElement; if (input.value.trim()) { addBugNote(selectedBug.id, input.value.trim()); input.value = ''; } }} className="bg-[#6e4e9e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5a3f85] transition-colors">Add</button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {selectedBug.tags.map((tag, i) => <span key={i} className="text-xs bg-[#f0efea] text-[#5b5566] px-2 py-1 rounded">{tag}</span>)}
                {selectedBug.linked_prs.map((pr, i) => <a key={i} href={pr} target="_blank" rel="noopener noreferrer" className="text-xs bg-[#eff6ff] text-[#1e40af] px-2 py-1 rounded hover:underline">PR {i + 1}</a>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes analytics-live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(63, 166, 107, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(63, 166, 107, 0); }
          100% { box-shadow: 0 0 0 0 rgba(63, 166, 107, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#faf9f6] rounded-xl p-3 text-center">
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[#9b95a6] mt-0.5">{label}</p>
    </div>
  );
}

function CountCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border border-[#e7e2d8] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <p className="text-xs text-[#9b95a6] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function LoadingBlock() {
  return <div className="text-center py-8 text-[#9b95a6] text-sm">Loading...</div>;
}

function ErrorBlock({ message }: { message: string }) {
  return <div className="text-center py-8 text-[#991b1b] text-sm">{message}</div>;
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}