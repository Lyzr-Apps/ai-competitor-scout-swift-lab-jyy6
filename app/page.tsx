'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  FiSearch,
  FiDownload,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiCheck,
  FiX,
  FiBarChart2,
  FiFileText,
  FiUsers,
  FiActivity,
  FiAlertTriangle,
  FiRefreshCw,
  FiExternalLink,
  FiFilter,
  FiCalendar,
  FiTrendingUp,
  FiFlag,
  FiChevronRight,
  FiHome,
  FiEye,
  FiClock,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'

// ============================================================
// CONSTANTS
// ============================================================
const DISCOVERY_AGENT_ID = '699dce56c546a473136807dc'
const REPORT_AGENT_ID = '699dce67c546a473136807de'

const AGENTS = [
  {
    id: DISCOVERY_AGENT_ID,
    name: 'Discovery Coordinator',
    purpose: 'Coordinates competitor content discovery, routes to sub-agents, aggregates findings',
  },
  {
    id: REPORT_AGENT_ID,
    name: 'Monthly Report Generator',
    purpose: 'Generates comprehensive monthly PDF reports with executive summaries and trends',
  },
]

// ============================================================
// TYPES
// ============================================================
interface Competitor {
  id: string
  name: string
  dateAdded: string
}

interface Finding {
  id: string
  competitor: string
  title: string
  url: string
  siteType: string
  engagementType: string
  ownedEarned: string
  confidenceScore: number
  status: 'approved' | 'flagged' | 'dismissed'
  discoveredAt: string
}

interface Report {
  id: string
  month: number
  year: number
  reportTitle: string
  reportPeriod: string
  executiveSummary: string
  trendAnalysis: string
  competitorOverviews: string
  comparativeMatrix: string
  recommendations: string
  totalFindings: number
  competitorsCovered: number
  pdfUrl: string
  generatedAt: string
}

interface DiscoveryRun {
  id: string
  date: string
  totalFindings: number
  flaggedCount: number
  xlsxUrl: string
}

type ScreenType = 'dashboard' | 'competitors' | 'findings' | 'reports'

// ============================================================
// HELPERS
// ============================================================
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore parse errors
  }
  return fallback
}

function setToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

// ============================================================
// MARKDOWN RENDERER
// ============================================================
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ============================================================
// SAMPLE DATA
// ============================================================
function getSampleCompetitors(): Competitor[] {
  return [
    { id: 'sc1', name: 'OpenAI', dateAdded: '2025-12-01' },
    { id: 'sc2', name: 'Google DeepMind', dateAdded: '2025-12-05' },
    { id: 'sc3', name: 'Anthropic', dateAdded: '2025-12-10' },
    { id: 'sc4', name: 'Cohere', dateAdded: '2026-01-02' },
    { id: 'sc5', name: 'Mistral AI', dateAdded: '2026-01-15' },
  ]
}

function getSampleFindings(): Finding[] {
  return [
    { id: 'sf1', competitor: 'OpenAI', title: 'GPT-5 Launch Announcement Blog Post', url: 'https://openai.com/blog/gpt-5', siteType: 'Blog', engagementType: 'Product Launch', ownedEarned: 'Owned', confidenceScore: 95, status: 'approved', discoveredAt: '2026-02-20' },
    { id: 'sf2', competitor: 'Google DeepMind', title: 'Gemini 3.0 Technical Paper Published', url: 'https://arxiv.org/abs/gemini3', siteType: 'Research', engagementType: 'Research Publication', ownedEarned: 'Owned', confidenceScore: 92, status: 'approved', discoveredAt: '2026-02-19' },
    { id: 'sf3', competitor: 'Anthropic', title: 'Constitutional AI v2 Framework Release', url: 'https://anthropic.com/research/cai-v2', siteType: 'Blog', engagementType: 'Research Publication', ownedEarned: 'Owned', confidenceScore: 88, status: 'flagged', discoveredAt: '2026-02-18' },
    { id: 'sf4', competitor: 'Cohere', title: 'Enterprise RAG Partnership with Salesforce', url: 'https://techcrunch.com/cohere-salesforce', siteType: 'News', engagementType: 'Partnership', ownedEarned: 'Earned', confidenceScore: 78, status: 'flagged', discoveredAt: '2026-02-17' },
    { id: 'sf5', competitor: 'Mistral AI', title: 'Series C Funding Round Closed at $2B', url: 'https://bloomberg.com/mistral-series-c', siteType: 'News', engagementType: 'Funding', ownedEarned: 'Earned', confidenceScore: 90, status: 'approved', discoveredAt: '2026-02-16' },
    { id: 'sf6', competitor: 'OpenAI', title: 'Potential Reddit Data Licensing Deal', url: 'https://reddit.com/r/technology/openai', siteType: 'Social', engagementType: 'Data Partnership', ownedEarned: 'Earned', confidenceScore: 55, status: 'dismissed', discoveredAt: '2026-02-15' },
    { id: 'sf7', competitor: 'Google DeepMind', title: 'AlphaFold 4 Healthcare Collaboration', url: 'https://deepmind.google/alphafold4-healthcare', siteType: 'Blog', engagementType: 'Product Launch', ownedEarned: 'Owned', confidenceScore: 85, status: 'approved', discoveredAt: '2026-02-14' },
  ]
}

function getSampleReports(): Report[] {
  return [
    {
      id: 'sr1', month: 1, year: 2026, reportTitle: 'AI Competitive Landscape - January 2026', reportPeriod: 'January 2026',
      executiveSummary: '## Executive Summary\n\nJanuary 2026 saw significant movement across the AI competitive landscape. **OpenAI** continued to dominate mindshare with its GPT-5 rollout, while **Google DeepMind** focused on research publications.\n\n- Total findings analyzed: 42\n- Active competitors tracked: 5\n- Key trend: Enterprise AI adoption accelerating',
      trendAnalysis: '### Key Trends\n\n1. **Enterprise AI Integration** - All major players are shifting focus to enterprise solutions\n2. **Open Source Competition** - Mistral and Meta continue to challenge proprietary models\n3. **Regulation Preparedness** - Companies are pre-emptively publishing safety frameworks',
      competitorOverviews: '### OpenAI\n- 15 findings, mostly product launches\n- Strong owned media presence\n\n### Google DeepMind\n- 12 findings, research-heavy\n- Growing healthcare applications',
      comparativeMatrix: '### Comparative Analysis\n\n- **OpenAI**: 15 findings, Positive sentiment, High activity\n- **Google DeepMind**: 12 findings, Neutral sentiment, Medium activity\n- **Anthropic**: 8 findings, Positive sentiment, Medium activity',
      recommendations: '### Recommendations\n\n1. **Monitor OpenAI enterprise pricing** - potential market disruption\n2. **Track Mistral open-source releases** - competitive threat to API business\n3. **Engage with regulatory discussions** - first-mover advantage in compliance',
      totalFindings: 42, competitorsCovered: 5, pdfUrl: '', generatedAt: '2026-02-01T10:00:00Z',
    },
  ]
}

function getSampleDiscoveryHistory(): DiscoveryRun[] {
  return [
    { id: 'sd1', date: '2026-02-20T14:30:00Z', totalFindings: 7, flaggedCount: 2, xlsxUrl: '' },
    { id: 'sd2', date: '2026-02-13T09:15:00Z', totalFindings: 5, flaggedCount: 1, xlsxUrl: '' },
  ]
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
class InlineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
function Sidebar({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenType
  onNavigate: (screen: ScreenType) => void
}) {
  const navItems: { key: ScreenType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { key: 'competitors', label: 'Competitors', icon: <FiUsers className="w-5 h-5" /> },
    { key: 'findings', label: 'Findings', icon: <FiSearch className="w-5 h-5" /> },
    { key: 'reports', label: 'Reports', icon: <FiFileText className="w-5 h-5" /> },
  ]

  return (
    <div className="w-64 min-h-screen flex flex-col border-r border-border/30 bg-[hsl(35,25%,90%)] flex-shrink-0">
      <div className="p-6 border-b border-border/20">
        <h1 className="text-xl font-bold font-serif tracking-wide text-foreground">
          Competitor Intel
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">AI-Powered Hub</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeScreen === item.key ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-[hsl(35,20%,85%)]'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border/20">
        <div className="text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">Active Agents</p>
          {AGENTS.map((agent) => (
            <div key={agent.id} className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{agent.purpose.slice(0, 60)}...</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// METRIC CARD
// ============================================================
function MetricCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subtitle?: string
}) {
  return (
    <div className="bg-card rounded-lg p-5 shadow-sm border border-border/20 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className="text-3xl font-bold font-serif mt-2 text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </div>
    </div>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    flagged: 'bg-amber-100 text-amber-800 border-amber-200',
    dismissed: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status === 'approved' && <FiCheck className="w-3 h-3" />}
      {status === 'flagged' && <FiFlag className="w-3 h-3" />}
      {status === 'dismissed' && <FiX className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ============================================================
// CONFIRM MODAL
// ============================================================
function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 border border-border/30">
        <h3 className="text-lg font-semibold font-serif text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD SCREEN
// ============================================================
function DashboardScreen({
  competitors,
  findings,
  reports,
  discoveryHistory,
  onRunDiscovery,
  isDiscovering,
  activeAgentId,
  statusMessage,
  onNavigate,
}: {
  competitors: Competitor[]
  findings: Finding[]
  reports: Report[]
  discoveryHistory: DiscoveryRun[]
  onRunDiscovery: () => void
  isDiscovering: boolean
  activeAgentId: string | null
  statusMessage: string
  onNavigate: (screen: ScreenType) => void
}) {
  const flaggedCount = findings.filter((f) => f.status === 'flagged').length
  const lastRun = discoveryHistory.length > 0 ? discoveryHistory[0] : null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-serif text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your competitive intelligence pipeline</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          icon={<FiUsers className="w-5 h-5" />}
          label="Competitors Tracked"
          value={competitors.length}
          subtitle={competitors.length > 0 ? `Latest: ${competitors[competitors.length - 1]?.name ?? 'N/A'}` : 'Add competitors to begin'}
        />
        <MetricCard
          icon={<FiSearch className="w-5 h-5" />}
          label="Total Findings"
          value={findings.length}
          subtitle={lastRun ? `Last run: ${new Date(lastRun.date).toLocaleDateString()}` : 'No discoveries yet'}
        />
        <MetricCard
          icon={<FiFlag className="w-5 h-5" />}
          label="Flagged Items"
          value={flaggedCount}
          subtitle="Pending review"
        />
        <MetricCard
          icon={<FiFileText className="w-5 h-5" />}
          label="Reports Generated"
          value={reports.length}
          subtitle={reports.length > 0 ? `Last: ${reports[0]?.reportPeriod ?? 'N/A'}` : 'No reports yet'}
        />
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold font-serif text-foreground flex items-center gap-2">
              <FiRefreshCw className={`w-5 h-5 ${isDiscovering ? 'animate-spin' : ''}`} />
              Run Competitor Discovery
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {competitors.length === 0
                ? 'Add competitors first to run discovery'
                : `Scan content for ${competitors.length} competitor${competitors.length !== 1 ? 's' : ''}`}
            </p>
            {lastRun && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                Last run: {new Date(lastRun.date).toLocaleString()} ({lastRun.totalFindings} findings)
              </p>
            )}
          </div>
          <button
            onClick={competitors.length === 0 ? () => onNavigate('competitors') : onRunDiscovery}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {isDiscovering ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                Discovering...
              </>
            ) : competitors.length === 0 ? (
              <>
                <FiPlus className="w-4 h-4" />
                Add Competitors First
              </>
            ) : (
              <>
                <FiSearch className="w-4 h-4" />
                Run Discovery
              </>
            )}
          </button>
        </div>
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${statusMessage.includes('Error') || statusMessage.includes('error') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {statusMessage}
          </div>
        )}
        {isDiscovering && activeAgentId && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary">
              <FiActivity className="w-4 h-4 animate-pulse" />
              <span className="font-medium">Agent Active:</span>
              <span>{AGENTS.find((a) => a.id === activeAgentId)?.name ?? 'Unknown'}</span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-serif text-foreground flex items-center gap-2">
            <FiActivity className="w-5 h-5" />
            Recent Activity
          </h3>
          {findings.length > 5 && (
            <button
              onClick={() => onNavigate('findings')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <FiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {findings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FiSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No findings yet. Run a discovery to populate this feed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.slice(0, 5).map((finding) => (
              <div
                key={finding.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-secondary/50 transition-colors border border-border/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{finding.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{finding.competitor}</span>
                    <span className="text-xs text-muted-foreground">{finding.siteType}</span>
                    <span className="text-xs text-muted-foreground">{finding.discoveredAt}</span>
                  </div>
                </div>
                <StatusBadge status={finding.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// COMPETITOR MANAGEMENT SCREEN
// ============================================================
function CompetitorScreen({
  competitors,
  onAdd,
  onEdit,
  onDelete,
}: {
  competitors: Competitor[]
  onAdd: (name: string) => void
  onEdit: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim())
      setNewName('')
      setShowAddForm(false)
    }
  }

  const handleEdit = (id: string) => {
    if (editName.trim()) {
      onEdit(id, editName.trim())
      setEditingId(null)
      setEditName('')
    }
  }

  const startEditing = (comp: Competitor) => {
    setEditingId(comp.id)
    setEditName(comp.name)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground">Competitor Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage the competitors you want to track and monitor</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          Add Competitor
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border/20">
          <h3 className="text-base font-semibold font-serif text-foreground mb-3">Add New Competitor</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. OpenAI, Google DeepMind, Anthropic..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName('') }}
              className="px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-sm border border-border/20 text-center">
          <FiUsers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold font-serif text-foreground">No competitors added yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Add your first competitor to begin tracking their content, announcements, and market activity.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Your First Competitor
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border/20 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Competitor Name</div>
            <div className="col-span-3">Date Added</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {competitors.map((comp, idx) => (
            <div
              key={comp.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-border/10 last:border-0 hover:bg-secondary/30 transition-colors"
            >
              <div className="col-span-1 text-sm text-muted-foreground">{idx + 1}</div>
              <div className="col-span-5">
                {editingId === comp.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit(comp.id)}
                      className="flex-1 px-3 py-1.5 rounded-md border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEdit(comp.id)}
                      className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <FiCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-foreground">{comp.name}</span>
                )}
              </div>
              <div className="col-span-3 text-sm text-muted-foreground">
                {new Date(comp.dateAdded).toLocaleDateString()}
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => startEditing(comp)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title="Edit"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(comp.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Competitor"
        message={`Are you sure you want to delete "${competitors.find((c) => c.id === deleteTarget)?.name ?? ''}"? This will not remove associated findings.`}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ============================================================
// FINDINGS REVIEW SCREEN
// ============================================================
function FindingsScreen({
  findings,
  competitors,
  onUpdateStatus,
  latestXlsxUrl,
}: {
  findings: Finding[]
  competitors: Competitor[]
  onUpdateStatus: (id: string, status: 'approved' | 'dismissed') => void
  latestXlsxUrl: string
}) {
  const [filterCompetitor, setFilterCompetitor] = useState('')
  const [filterSiteType, setFilterSiteType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const siteTypes = Array.from(new Set(findings.map((f) => f.siteType).filter(Boolean)))
  const competitorNames = Array.from(new Set(findings.map((f) => f.competitor).filter(Boolean)))

  const filtered = findings.filter((f) => {
    if (filterCompetitor && f.competitor !== filterCompetitor) return false
    if (filterSiteType && f.siteType !== filterSiteType) return false
    if (filterStatus && f.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-foreground">Findings Review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {findings.length} finding{findings.length !== 1 ? 's' : ''} total, {filtered.length} displayed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border/30 hover:bg-secondary/50'}`}
          >
            <FiFilter className="w-4 h-4" />
            Filters
            {(filterCompetitor || filterSiteType || filterStatus) && (
              <span className="ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground rounded-full text-xs">
                {[filterCompetitor, filterSiteType, filterStatus].filter(Boolean).length}
              </span>
            )}
          </button>
          {latestXlsxUrl && (
            <a
              href={latestXlsxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <FiDownload className="w-4 h-4" />
              Export XLSX
            </a>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Competitor</label>
              <select
                value={filterCompetitor}
                onChange={(e) => setFilterCompetitor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Competitors</option>
                {competitorNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Site Type</label>
              <select
                value={filterSiteType}
                onChange={(e) => setFilterSiteType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Site Types</option>
                {siteTypes.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
          {(filterCompetitor || filterSiteType || filterStatus) && (
            <button
              onClick={() => { setFilterCompetitor(''); setFilterSiteType(''); setFilterStatus('') }}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {findings.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-sm border border-border/20 text-center">
          <FiSearch className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold font-serif text-foreground">No findings yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Run a competitor discovery from the Dashboard to populate your findings.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-sm border border-border/20 text-center">
          <FiFilter className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No findings match the current filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border/20 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-secondary/50 border-b border-border/20">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competitor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title / URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((finding) => (
                <tr key={finding.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{finding.competitor}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground truncate max-w-[280px]">{finding.title}</p>
                    {finding.url && (
                      <a
                        href={finding.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <FiExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[220px]">{finding.url}</span>
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{finding.siteType}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{finding.engagementType}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{finding.ownedEarned}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${finding.confidenceScore >= 80 ? 'bg-green-100 text-green-800' : finding.confidenceScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                      {finding.confidenceScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={finding.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {finding.status === 'flagged' && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onUpdateStatus(finding.id, 'approved')}
                          className="p-1.5 rounded-md text-green-700 hover:bg-green-100 transition-colors"
                          title="Approve"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onUpdateStatus(finding.id, 'dismissed')}
                          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Dismiss"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// REPORTS SCREEN
// ============================================================
function ReportsScreen({
  reports,
  findings,
  onGenerateReport,
  isGenerating,
  activeAgentId,
  statusMessage,
}: {
  reports: Report[]
  findings: Finding[]
  onGenerateReport: (month: number, year: number) => void
  isGenerating: boolean
  activeAgentId: string | null
  statusMessage: string
}) {
  const [selectedMonth, setSelectedMonth] = useState(2)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const approvedFindings = findings.filter((f) => f.status === 'approved')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif text-foreground">Monthly Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate and review monthly competitive intelligence reports</p>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border/20">
        <h3 className="text-lg font-semibold font-serif text-foreground mb-4 flex items-center gap-2">
          <FiCalendar className="w-5 h-5" />
          Generate Monthly Report
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-border/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <button
            onClick={() => onGenerateReport(selectedMonth, selectedYear)}
            disabled={isGenerating || approvedFindings.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FiFileText className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
        {approvedFindings.length === 0 && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <FiAlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            No approved findings available. Run a discovery and approve findings first.
          </p>
        )}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${statusMessage.includes('Error') || statusMessage.includes('error') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {statusMessage}
          </div>
        )}
        {isGenerating && activeAgentId && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary">
              <FiActivity className="w-4 h-4 animate-pulse" />
              <span className="font-medium">Agent Active:</span>
              <span>{AGENTS.find((a) => a.id === activeAgentId)?.name ?? 'Unknown'}</span>
            </div>
          </div>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-sm border border-border/20 text-center">
          <FiFileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold font-serif text-foreground">No reports generated yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Run your first monthly report to get a comprehensive overview of the competitive landscape.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-serif text-foreground flex items-center gap-2">
            <FiBarChart2 className="w-5 h-5" />
            Report History
          </h3>
          {reports.map((report) => {
            const displayMonth = typeof report.month === 'number' && report.month >= 1 && report.month <= 12 ? report.month : 1
            return (
              <div key={report.id} className="bg-card rounded-xl shadow-sm border border-border/20 overflow-hidden">
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold font-serif text-foreground truncate">
                      {report.reportTitle || `${monthNames[displayMonth - 1]} ${report.year} Report`}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        {report.reportPeriod || `${monthNames[displayMonth - 1]} ${report.year}`}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FiSearch className="w-3 h-3" />
                        {report.totalFindings ?? 0} findings
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FiUsers className="w-3 h-3" />
                        {report.competitorsCovered ?? 0} competitors
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <FiDownload className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}
                    {expandedReportId === report.id ? (
                      <FiChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {expandedReportId === report.id && (
                  <div className="px-5 pb-5 border-t border-border/10 pt-4 space-y-5">
                    {report.executiveSummary && (
                      <div>
                        <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FiBarChart2 className="w-4 h-4 text-primary" />
                          Executive Summary
                        </h5>
                        <div className="bg-background rounded-lg p-4 border border-border/10">
                          {renderMarkdown(report.executiveSummary)}
                        </div>
                      </div>
                    )}
                    {report.trendAnalysis && (
                      <div>
                        <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FiTrendingUp className="w-4 h-4 text-primary" />
                          Trend Analysis
                        </h5>
                        <div className="bg-background rounded-lg p-4 border border-border/10">
                          {renderMarkdown(report.trendAnalysis)}
                        </div>
                      </div>
                    )}
                    {report.competitorOverviews && (
                      <div>
                        <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FiUsers className="w-4 h-4 text-primary" />
                          Competitor Overviews
                        </h5>
                        <div className="bg-background rounded-lg p-4 border border-border/10">
                          {renderMarkdown(report.competitorOverviews)}
                        </div>
                      </div>
                    )}
                    {report.comparativeMatrix && (
                      <div>
                        <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FiBarChart2 className="w-4 h-4 text-primary" />
                          Comparative Matrix
                        </h5>
                        <div className="bg-background rounded-lg p-4 border border-border/10">
                          {renderMarkdown(report.comparativeMatrix)}
                        </div>
                      </div>
                    )}
                    {report.recommendations && (
                      <div>
                        <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FiFlag className="w-4 h-4 text-primary" />
                          Recommendations
                        </h5>
                        <div className="bg-background rounded-lg p-4 border border-border/10">
                          {renderMarkdown(report.recommendations)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Page() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')

  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [discoveryHistory, setDiscoveryHistory] = useState<DiscoveryRun[]>([])

  const [isDiscovering, setIsDiscovering] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [discoveryStatus, setDiscoveryStatus] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [latestXlsxUrl, setLatestXlsxUrl] = useState('')

  const [showSampleData, setShowSampleData] = useState(false)

  useEffect(() => {
    setCompetitors(getFromStorage<Competitor[]>('ciHub_competitors', []))
    setFindings(getFromStorage<Finding[]>('ciHub_findings', []))
    setReports(getFromStorage<Report[]>('ciHub_reports', []))
    setDiscoveryHistory(getFromStorage<DiscoveryRun[]>('ciHub_discoveryHistory', []))
    setLatestXlsxUrl(getFromStorage<string>('ciHub_latestXlsxUrl', ''))
  }, [])

  useEffect(() => {
    if (!showSampleData) {
      setToStorage('ciHub_competitors', competitors)
    }
  }, [competitors, showSampleData])

  useEffect(() => {
    if (!showSampleData) {
      setToStorage('ciHub_findings', findings)
    }
  }, [findings, showSampleData])

  useEffect(() => {
    if (!showSampleData) {
      setToStorage('ciHub_reports', reports)
    }
  }, [reports, showSampleData])

  useEffect(() => {
    if (!showSampleData) {
      setToStorage('ciHub_discoveryHistory', discoveryHistory)
    }
  }, [discoveryHistory, showSampleData])

  useEffect(() => {
    if (!showSampleData) {
      setToStorage('ciHub_latestXlsxUrl', latestXlsxUrl)
    }
  }, [latestXlsxUrl, showSampleData])

  useEffect(() => {
    if (showSampleData) {
      setCompetitors(getSampleCompetitors())
      setFindings(getSampleFindings())
      setReports(getSampleReports())
      setDiscoveryHistory(getSampleDiscoveryHistory())
    } else {
      setCompetitors(getFromStorage<Competitor[]>('ciHub_competitors', []))
      setFindings(getFromStorage<Finding[]>('ciHub_findings', []))
      setReports(getFromStorage<Report[]>('ciHub_reports', []))
      setDiscoveryHistory(getFromStorage<DiscoveryRun[]>('ciHub_discoveryHistory', []))
      setLatestXlsxUrl(getFromStorage<string>('ciHub_latestXlsxUrl', ''))
    }
  }, [showSampleData])

  const addCompetitor = useCallback((name: string) => {
    setCompetitors((prev) => [
      ...prev,
      { id: generateId(), name, dateAdded: new Date().toISOString().split('T')[0] },
    ])
  }, [])

  const editCompetitor = useCallback((id: string, name: string) => {
    setCompetitors((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const deleteCompetitor = useCallback((id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateFindingStatus = useCallback((id: string, status: 'approved' | 'dismissed') => {
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)))
  }, [])

  const parseFindingsFromResponse = useCallback((data: Record<string, unknown>): Finding[] => {
    const parsed: Finding[] = []
    const detailedOverview = typeof data?.detailed_findings_overview === 'string' ? data.detailed_findings_overview : ''
    const flaggedSummary = typeof data?.flagged_items_summary === 'string' ? data.flagged_items_summary : ''

    const allText = `${detailedOverview}\n${flaggedSummary}`
    if (!allText.trim()) return parsed

    const lines = allText.split('\n').filter((l: string) => l.trim())
    let currentFinding: Partial<Finding> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('competitor:') || trimmed.toLowerCase().startsWith('- competitor:')) {
        if (currentFinding.title || currentFinding.competitor) {
          parsed.push({
            id: generateId(),
            competitor: currentFinding.competitor ?? 'Unknown',
            title: currentFinding.title ?? 'Untitled',
            url: currentFinding.url ?? '',
            siteType: currentFinding.siteType ?? 'Web',
            engagementType: currentFinding.engagementType ?? 'Content',
            ownedEarned: currentFinding.ownedEarned ?? 'Unknown',
            confidenceScore: currentFinding.confidenceScore ?? 70,
            status: currentFinding.status ?? 'approved',
            discoveredAt: new Date().toISOString().split('T')[0],
          })
        }
        currentFinding = { competitor: trimmed.replace(/^-?\s*competitor:\s*/i, '') }
      } else if (trimmed.toLowerCase().startsWith('title:') || trimmed.toLowerCase().startsWith('- title:')) {
        currentFinding.title = trimmed.replace(/^-?\s*title:\s*/i, '')
      } else if (trimmed.toLowerCase().startsWith('url:') || trimmed.toLowerCase().startsWith('- url:')) {
        currentFinding.url = trimmed.replace(/^-?\s*url:\s*/i, '')
      } else if (trimmed.toLowerCase().startsWith('site type:') || trimmed.toLowerCase().startsWith('- site type:')) {
        currentFinding.siteType = trimmed.replace(/^-?\s*site\s*type:\s*/i, '')
      } else if (trimmed.toLowerCase().startsWith('engagement type:') || trimmed.toLowerCase().startsWith('- engagement type:') || trimmed.toLowerCase().startsWith('engagement:')) {
        currentFinding.engagementType = trimmed.replace(/^-?\s*(engagement\s*type|engagement):\s*/i, '')
      } else if (trimmed.toLowerCase().startsWith('owned/earned:') || trimmed.toLowerCase().startsWith('source:') || trimmed.toLowerCase().startsWith('- owned/earned:')) {
        currentFinding.ownedEarned = trimmed.replace(/^-?\s*(owned\/earned|source):\s*/i, '')
      } else if (trimmed.toLowerCase().startsWith('confidence:') || trimmed.toLowerCase().startsWith('score:') || trimmed.toLowerCase().startsWith('- confidence:')) {
        const scoreStr = trimmed.replace(/^-?\s*(confidence|score):\s*/i, '').replace('%', '')
        const score = parseInt(scoreStr, 10)
        if (!isNaN(score)) currentFinding.confidenceScore = score
      } else if (trimmed.toLowerCase().startsWith('status:') || trimmed.toLowerCase().startsWith('- status:')) {
        const s = trimmed.replace(/^-?\s*status:\s*/i, '').toLowerCase().trim()
        if (s.includes('flag')) currentFinding.status = 'flagged'
        else if (s.includes('dismiss')) currentFinding.status = 'dismissed'
        else currentFinding.status = 'approved'
      }
    }

    if (currentFinding.title || currentFinding.competitor) {
      parsed.push({
        id: generateId(),
        competitor: currentFinding.competitor ?? 'Unknown',
        title: currentFinding.title ?? 'Untitled Finding',
        url: currentFinding.url ?? '',
        siteType: currentFinding.siteType ?? 'Web',
        engagementType: currentFinding.engagementType ?? 'Content',
        ownedEarned: currentFinding.ownedEarned ?? 'Unknown',
        confidenceScore: currentFinding.confidenceScore ?? 70,
        status: currentFinding.status ?? 'approved',
        discoveredAt: new Date().toISOString().split('T')[0],
      })
    }

    if (parsed.length === 0 && detailedOverview.trim()) {
      const summary = data?.summary as Record<string, unknown> | undefined
      parsed.push({
        id: generateId(),
        competitor: 'Multiple',
        title: detailedOverview.slice(0, 150).replace(/\n/g, ' '),
        url: '',
        siteType: typeof summary?.findings_by_site_type === 'string' ? summary.findings_by_site_type : 'Mixed',
        engagementType: typeof summary?.findings_by_engagement_type === 'string' ? summary.findings_by_engagement_type : 'Various',
        ownedEarned: 'Mixed',
        confidenceScore: 75,
        status: 'approved',
        discoveredAt: new Date().toISOString().split('T')[0],
      })
    }

    return parsed
  }, [])

  const runDiscovery = useCallback(async () => {
    if (competitors.length === 0) return
    setIsDiscovering(true)
    setActiveAgentId(DISCOVERY_AGENT_ID)
    setDiscoveryStatus('Starting competitor discovery...')

    try {
      const competitorList = competitors.map((c) => c.name).join(', ')
      const message = `Run a comprehensive competitor content discovery for the following competitors: ${competitorList}. Search for recent blog posts, press releases, product launches, research publications, social media announcements, partnerships, funding news, and any other notable content. Classify each finding by site type, engagement type, owned vs earned media, and provide a confidence score. Flag any items that need manual review.`

      const result = await callAIAgent(message, DISCOVERY_AGENT_ID)

      if (result?.success) {
        const data = result?.response?.result ?? {}
        const summary = (data as Record<string, unknown>)?.summary as Record<string, unknown> | undefined

        const totalFindings = typeof summary?.total_findings === 'number' ? summary.total_findings : 0
        const totalCompetitors = typeof summary?.total_competitors === 'number' ? summary.total_competitors : 0
        const flaggedCount = typeof summary?.flagged_count === 'number' ? summary.flagged_count : 0

        setDiscoveryStatus(`Discovery complete! Found ${totalFindings} findings across ${totalCompetitors} competitors.`)

        const newFindings = parseFindingsFromResponse(data as Record<string, unknown>)
        if (newFindings.length > 0) {
          setFindings((prev) => [...newFindings, ...prev])
        }

        const artifactFiles = result?.module_outputs?.artifact_files
        let xlsxUrl = ''
        if (Array.isArray(artifactFiles) && artifactFiles.length > 0) {
          xlsxUrl = artifactFiles[0]?.file_url ?? ''
          if (xlsxUrl) setLatestXlsxUrl(xlsxUrl)
        }

        const run: DiscoveryRun = {
          id: generateId(),
          date: new Date().toISOString(),
          totalFindings: totalFindings || newFindings.length,
          flaggedCount,
          xlsxUrl,
        }
        setDiscoveryHistory((prev) => [run, ...prev])
      } else {
        setDiscoveryStatus(`Error: ${result?.error ?? 'Discovery failed. Please try again.'}`)
      }
    } catch (err) {
      setDiscoveryStatus(`Error: ${err instanceof Error ? err.message : 'An unexpected error occurred.'}`)
    } finally {
      setIsDiscovering(false)
      setActiveAgentId(null)
    }
  }, [competitors, parseFindingsFromResponse])

  const generateReport = useCallback(async (month: number, year: number) => {
    const approvedFindings = findings.filter((f) => f.status === 'approved')
    if (approvedFindings.length === 0) return

    setIsGenerating(true)
    setActiveAgentId(REPORT_AGENT_ID)
    setReportStatus('Generating monthly report...')

    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const monthName = monthNames[month - 1] ?? 'Unknown'
      const findingsSummary = approvedFindings.map((f) =>
        `Competitor: ${f.competitor}, Title: ${f.title}, Site Type: ${f.siteType}, Engagement: ${f.engagementType}, Source: ${f.ownedEarned}, Confidence: ${f.confidenceScore}%`
      ).join('\n')

      const message = `Generate a comprehensive monthly competitive intelligence report for ${monthName} ${year}. Here are the approved findings to analyze:\n\n${findingsSummary}\n\nPlease provide an executive summary, trend analysis, per-competitor overviews, a comparative matrix, and strategic recommendations. Total approved findings: ${approvedFindings.length}. Competitors covered: ${Array.from(new Set(approvedFindings.map((f) => f.competitor))).join(', ')}.`

      const result = await callAIAgent(message, REPORT_AGENT_ID)

      if (result?.success) {
        const data = result?.response?.result ?? {}
        const typedData = data as Record<string, unknown>

        const artifactFiles = result?.module_outputs?.artifact_files
        const pdfUrl = Array.isArray(artifactFiles) && artifactFiles.length > 0 ? (artifactFiles[0]?.file_url ?? '') : ''

        const report: Report = {
          id: generateId(),
          month,
          year,
          reportTitle: typeof typedData?.report_title === 'string' ? typedData.report_title : `${monthName} ${year} Intelligence Report`,
          reportPeriod: typeof typedData?.report_period === 'string' ? typedData.report_period : `${monthName} ${year}`,
          executiveSummary: typeof typedData?.executive_summary === 'string' ? typedData.executive_summary : '',
          trendAnalysis: typeof typedData?.trend_analysis === 'string' ? typedData.trend_analysis : '',
          competitorOverviews: typeof typedData?.competitor_overviews === 'string' ? typedData.competitor_overviews : '',
          comparativeMatrix: typeof typedData?.comparative_matrix === 'string' ? typedData.comparative_matrix : '',
          recommendations: typeof typedData?.recommendations === 'string' ? typedData.recommendations : '',
          totalFindings: typeof typedData?.total_findings_analyzed === 'number' ? typedData.total_findings_analyzed : approvedFindings.length,
          competitorsCovered: typeof typedData?.competitors_covered === 'number' ? typedData.competitors_covered : Array.from(new Set(approvedFindings.map((f) => f.competitor))).length,
          pdfUrl,
          generatedAt: new Date().toISOString(),
        }

        setReports((prev) => [report, ...prev])
        setReportStatus(`Report generated successfully for ${monthName} ${year}!`)
      } else {
        setReportStatus(`Error: ${result?.error ?? 'Report generation failed. Please try again.'}`)
      }
    } catch (err) {
      setReportStatus(`Error: ${err instanceof Error ? err.message : 'An unexpected error occurred.'}`)
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }, [findings])

  return (
    <InlineErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />

        <main className="flex-1 min-h-screen overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-end mb-6">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sample Data</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showSampleData}
                    onChange={(e) => setShowSampleData(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>

            {activeScreen === 'dashboard' && (
              <DashboardScreen
                competitors={competitors}
                findings={findings}
                reports={reports}
                discoveryHistory={discoveryHistory}
                onRunDiscovery={runDiscovery}
                isDiscovering={isDiscovering}
                activeAgentId={activeAgentId}
                statusMessage={discoveryStatus}
                onNavigate={setActiveScreen}
              />
            )}

            {activeScreen === 'competitors' && (
              <CompetitorScreen
                competitors={competitors}
                onAdd={addCompetitor}
                onEdit={editCompetitor}
                onDelete={deleteCompetitor}
              />
            )}

            {activeScreen === 'findings' && (
              <FindingsScreen
                findings={findings}
                competitors={competitors}
                onUpdateStatus={updateFindingStatus}
                latestXlsxUrl={latestXlsxUrl}
              />
            )}

            {activeScreen === 'reports' && (
              <ReportsScreen
                reports={reports}
                findings={findings}
                onGenerateReport={generateReport}
                isGenerating={isGenerating}
                activeAgentId={activeAgentId}
                statusMessage={reportStatus}
              />
            )}
          </div>
        </main>
      </div>
    </InlineErrorBoundary>
  )
}
