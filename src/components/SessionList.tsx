import { useEffect, useState } from 'react';
import {
  Plus, FileText, Clock, CheckCircle, Check, Loader2, ChevronRight,
  Trash2, Search, AlertCircle, RefreshCw, Copy, Download,
  X, Sparkles, Archive, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { supabase, PatentSession, SESSION_STATUS } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Props = {
  onNewSession: () => void;
  onOpenSession: (session: PatentSession) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
};

type TabView = 'active' | 'trash';

// One accent hex per status; bg/border derived via alpha.
const STATUS_CONFIG: Record<string, { label: string; accent: string; icon: React.ElementType }> = {
  [SESSION_STATUS.QUESTIONING]: { label: 'In Progress', accent: '#E6C170', icon: Clock },
  [SESSION_STATUS.DRAFTING]:    { label: 'Drafting',    accent: '#8FB0E6', icon: Loader2 },
  [SESSION_STATUS.COMPLETE]:    { label: 'Complete',    accent: '#6FCB97', icon: CheckCircle },
};

function tint(c: string) {
  return { color: c, background: `${c}16`, borderColor: `${c}3d` } as React.CSSProperties;
}

export default function SessionList({ onNewSession, onOpenSession, onShowToast }: Props) {
  const { user } = useAuth();
  const [allSessions, setAllSessions] = useState<PatentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabView>('active');

  const activeSessions = allSessions.filter(s => !s.deleted_at);
  const trashedSessions = allSessions.filter(s => s.deleted_at);
  const currentSessions = tab === 'active' ? activeSessions : trashedSessions;

  const filtered = search
    ? currentSessions.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.technical_description.toLowerCase().includes(search.toLowerCase())
      )
    : currentSessions;

  const counts = {
    total: activeSessions.length,
    complete: activeSessions.filter(s => s.status === SESSION_STATUS.COMPLETE).length,
    inProgress: activeSessions.filter(s => s.status !== SESSION_STATUS.COMPLETE).length,
  };

  async function loadSessions() {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('patent_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setAllSessions(data ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onNewSession();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewSession]);

  async function softDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('patent_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setAllSessions(prev => prev.map(s => s.id === id ? { ...s, deleted_at: new Date().toISOString() } : s));
      onShowToast?.('Moved to trash -- you can restore it anytime', 'info');
    } catch {
      onShowToast?.('Failed to move application to trash');
    } finally {
      setActionLoading(null);
    }
  }

  async function restoreSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('patent_sessions')
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setAllSessions(prev => prev.map(s => s.id === id ? { ...s, deleted_at: null, updated_at: new Date().toISOString() } : s));
      onShowToast?.('Application restored', 'success');
    } catch {
      onShowToast?.('Failed to restore application');
    } finally {
      setActionLoading(null);
    }
  }

  async function permanentDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Permanently delete this application? All drafts, claims, and version history will be lost forever.')) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from('patent_sessions').delete().eq('id', id);
      if (error) throw error;
      setAllSessions(prev => prev.filter(s => s.id !== id));
      onShowToast?.('Application permanently deleted', 'info');
    } catch {
      onShowToast?.('Failed to delete application');
    } finally {
      setActionLoading(null);
    }
  }

  async function bulkSoftDelete() {
    if (selectedSessions.size === 0) return;
    const ids = Array.from(selectedSessions);
    try {
      for (const id of ids) {
        const { error } = await supabase
          .from('patent_sessions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
      setAllSessions(prev =>
        prev.map(s => selectedSessions.has(s.id)
          ? { ...s, deleted_at: new Date().toISOString() }
          : s
        )
      );
      setSelectedSessions(new Set());
      onShowToast?.(`${ids.length} application(s) moved to trash`, 'info');
    } catch {
      onShowToast?.('Failed to move some applications to trash');
    }
  }

  async function bulkRestore() {
    if (selectedSessions.size === 0) return;
    const ids = Array.from(selectedSessions);
    try {
      for (const id of ids) {
        const { error } = await supabase
          .from('patent_sessions')
          .update({ deleted_at: null, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
      setAllSessions(prev =>
        prev.map(s => selectedSessions.has(s.id)
          ? { ...s, deleted_at: null, updated_at: new Date().toISOString() }
          : s
        )
      );
      setSelectedSessions(new Set());
      onShowToast?.(`${ids.length} application(s) restored`, 'success');
    } catch {
      onShowToast?.('Failed to restore some applications');
    }
  }

  async function bulkPermanentDelete() {
    if (selectedSessions.size === 0) return;
    if (!confirm(`Permanently delete ${selectedSessions.size} application(s)? This cannot be undone.`)) return;
    const ids = Array.from(selectedSessions);
    try {
      for (const id of ids) {
        const { error } = await supabase.from('patent_sessions').delete().eq('id', id);
        if (error) throw error;
      }
      setAllSessions(prev => prev.filter(s => !selectedSessions.has(s.id)));
      setSelectedSessions(new Set());
      onShowToast?.(`${ids.length} application(s) permanently deleted`, 'info');
    } catch {
      onShowToast?.('Failed to delete some applications');
    }
  }

  function bulkExport() {
    if (selectedSessions.size === 0) return;
    const toExport = allSessions.filter(s => selectedSessions.has(s.id));
    const jsonData = JSON.stringify(toExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patent-applications-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function emptyTrash() {
    if (trashedSessions.length === 0) return;
    if (!confirm(`Permanently delete all ${trashedSessions.length} trashed application(s)? This cannot be undone.`)) return;
    try {
      for (const s of trashedSessions) {
        const { error } = await supabase.from('patent_sessions').delete().eq('id', s.id);
        if (error) throw error;
      }
      setAllSessions(prev => prev.filter(s => !s.deleted_at));
      onShowToast?.('Trash emptied', 'info');
    } catch {
      onShowToast?.('Failed to empty trash');
    }
  }

  function toggleSessionSelection(id: string) {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedSessions(newSelected);
  }

  function selectAll() {
    setSelectedSessions(new Set(filtered.map(s => s.id)));
  }

  function clearSelection() {
    setSelectedSessions(new Set());
  }

  async function duplicateSession(e: React.MouseEvent, session: PatentSession) {
    e.stopPropagation();
    if (!user) return;
    setActionLoading(session.id);
    try {
      const { data: newSession, error: sessionErr } = await supabase
        .from('patent_sessions')
        .insert({
          user_id: user.id,
          title: `${session.title} (Copy)`,
          technical_description: session.technical_description,
          invention_type: session.invention_type,
          status: SESSION_STATUS.QUESTIONING,
        })
        .select()
        .single();

      if (sessionErr || !newSession) throw sessionErr;

      const { data: questions } = await supabase
        .from('session_questions')
        .select('*')
        .eq('session_id', session.id);

      if (questions && questions.length > 0) {
        await supabase
          .from('session_questions')
          .insert(questions.map(q => ({
            session_id: newSession.id,
            question_number: q.question_number,
            question_text: q.question_text,
            answer_text: q.answer_text,
            category: q.category,
          })));
      }

      setAllSessions(prev => [newSession, ...prev]);
      onShowToast?.('Application duplicated', 'success');
    } catch {
      onShowToast?.('Failed to duplicate application');
    } finally {
      setActionLoading(null);
    }
  }

  // Clear selection when switching tabs
  function switchTab(newTab: TabView) {
    setTab(newTab);
    setSelectedSessions(new Set());
    setSearch('');
  }

  return (
    <div className="sl-root">
      <style>{CSS}</style>

      <div className="sl-wrap">
        {/* Stats (only for active view) */}
        {tab === 'active' && activeSessions.length > 0 && (
          <div className="sl-stats">
            {[
              { label: 'Total', value: counts.total, icon: FileText, accent: '#E7EAF2' },
              { label: 'In progress', value: counts.inProgress, icon: Clock, accent: '#E6C170' },
              { label: 'Complete', value: counts.complete, icon: CheckCircle, accent: '#6FCB97' },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="sl-stat">
                <div className="sl-stat-ico"><Icon size={18} /></div>
                <div>
                  <div className="sl-stat-num" style={{ color: accent }}>{value}</div>
                  <div className="sl-stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar: Active / Trash */}
        <div className="sl-tabbar">
          <div className="sl-tabs">
            <button
              onClick={() => switchTab('active')}
              className={`sl-tab ${tab === 'active' ? 'sl-tab-on' : ''}`}
            >
              Applications
              {activeSessions.length > 0 && (
                <span className={`sl-tab-badge ${tab === 'active' ? 'sl-tab-badge-blue' : ''}`}>
                  {activeSessions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => switchTab('trash')}
              className={`sl-tab sl-tab-trash ${tab === 'trash' ? 'sl-tab-on' : ''}`}
            >
              <Archive size={14} />
              Trash
              {trashedSessions.length > 0 && (
                <span className={`sl-tab-badge ${tab === 'trash' ? 'sl-tab-badge-red' : ''}`}>
                  {trashedSessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Empty trash button */}
          {tab === 'trash' && trashedSessions.length > 0 && (
            <button onClick={emptyTrash} className="sl-btn-ghost sl-danger">
              <Trash2 size={12} />
              Empty trash
            </button>
          )}
        </div>

        {/* Search */}
        {currentSessions.length > 3 && (
          <div className="sl-search">
            <Search size={16} className="sl-search-ico" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'active' ? 'Search applications… (Cmd+K)' : 'Search trash…'}
              className="sl-inp"
            />
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedSessions.size > 0 && (
          <div className="sl-bulk">
            <div className="sl-bulk-count">
              <span>{selectedSessions.size}</span> selected
            </div>
            <div className="sl-bulk-actions">
              <button onClick={selectAll} className="sl-btn-ghost sl-blue">Select all</button>
              {tab === 'active' && (
                <>
                  <button onClick={bulkExport} className="sl-btn-ghost sl-blue"><Download size={12} /> Export</button>
                  <button onClick={bulkSoftDelete} className="sl-btn-ghost sl-danger"><Trash2 size={12} /> Move to trash</button>
                </>
              )}
              {tab === 'trash' && (
                <>
                  <button onClick={bulkRestore} className="sl-btn-ghost sl-green"><RotateCcw size={12} /> Restore</button>
                  <button onClick={bulkPermanentDelete} className="sl-btn-ghost sl-danger"><Trash2 size={12} /> Delete forever</button>
                </>
              )}
              <button onClick={clearSelection} className="sl-btn-ghost sl-icon-only"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="sl-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="sl-card sl-skel">
                <div className="sl-skel-row">
                  <div className="sl-skel-ico" />
                  <div className="sl-skel-lines">
                    <div className="sl-skel-line sl-w75" />
                    <div className="sl-skel-line sl-w100" />
                    <div className="sl-skel-line sl-w33" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="sl-state">
            <div className="sl-state-ico sl-state-ico-err"><AlertCircle size={28} /></div>
            <h3 className="sl-state-title">Failed to load</h3>
            <p className="sl-state-sub">Something went wrong. Please try again.</p>
            <button onClick={loadSessions} className="sl-btn-ghost sl-btn-lg"><RefreshCw size={14} /> Retry</button>
          </div>
        ) : currentSessions.length === 0 ? (
          tab === 'active' ? (
            <div className="sl-state">
              <div className="sl-empty-mark">
                <div className="sl-empty-ico"><FileText size={32} /></div>
                <div className="sl-empty-spark"><Sparkles size={12} /></div>
              </div>
              <h3 className="sl-state-title sl-state-title-lg">Start your first patent draft</h3>
              <p className="sl-state-sub sl-state-sub-w">
                Describe your invention and AI will generate a complete patent application with claims, specification, and abstract.
              </p>
              <button onClick={onNewSession} className="sl-btn-brass sl-btn-lg"><Plus size={16} /> New application</button>
            </div>
          ) : (
            <div className="sl-state">
              <div className="sl-state-ico"><Archive size={28} /></div>
              <h3 className="sl-state-title">Nothing in trash</h3>
              <p className="sl-state-sub">Applications you delete can be recovered from here.</p>
            </div>
          )
        ) : (
          <div className="sl-list">
            {/* Trash info banner */}
            {tab === 'trash' && (
              <div className="sl-note">
                <AlertTriangle size={14} />
                <p>You can restore any of these. Permanent deletion is irreversible and removes all drafts and version history.</p>
              </div>
            )}

            {filtered.map(session => {
              const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG[SESSION_STATUS.QUESTIONING];
              const Icon = cfg.icon;
              const isSelected = selectedSessions.has(session.id);
              const isLoading = actionLoading === session.id;
              const isTrashed = !!session.deleted_at;
              const spinning = session.status === SESSION_STATUS.DRAFTING;

              return (
                <div
                  key={session.id}
                  onClick={() => !isTrashed && !selectedSessions.size && onOpenSession(session)}
                  className={`sl-item ${isTrashed ? 'sl-item-trashed' : 'sl-item-open'} ${isSelected ? 'sl-item-sel' : ''}`}
                >
                  <div className="sl-item-row">
                    <div className="sl-item-main">
                      {selectedSessions.size > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleSessionSelection(session.id); }}
                          className={`sl-check ${isSelected ? 'sl-check-on' : ''}`}
                        >
                          {isSelected && <Check size={12} />}
                        </button>
                      )}
                      <div
                        className="sl-item-ico"
                        style={isTrashed ? undefined : tint(cfg.accent)}
                      >
                        {isTrashed
                          ? <Archive size={18} className="sl-muted" />
                          : <Icon size={18} className={spinning ? 'sl-spin' : ''} style={{ color: cfg.accent }} />
                        }
                      </div>
                      <div className="sl-item-txt">
                        <div className={`sl-item-title ${isTrashed ? 'sl-item-title-dim' : ''}`}>
                          {session.title || 'Untitled Application'}
                        </div>
                        <p className="sl-item-desc">
                          {session.technical_description.slice(0, 120)}
                          {session.technical_description.length > 120 ? '…' : ''}
                        </p>
                        <div className="sl-item-meta">
                          {!isTrashed && (
                            <span className="sl-badge" style={tint(cfg.accent)}>
                              <Icon size={10} className={spinning ? 'sl-spin' : ''} />
                              {cfg.label}
                            </span>
                          )}
                          {isTrashed && session.deleted_at && (
                            <span className="sl-badge sl-badge-trash">
                              <Trash2 size={10} />
                              Trashed {new Date(session.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <span className="sl-date">
                            {new Date(session.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="sl-actions">
                      {isLoading ? (
                        <div className="sl-act"><Loader2 size={14} className="sl-spin sl-muted" /></div>
                      ) : isTrashed ? (
                        <>
                          <button onClick={e => restoreSession(e, session.id)} className="sl-act sl-act-green" title="Restore">
                            <RotateCcw size={14} />
                          </button>
                          <button onClick={e => permanentDeleteSession(e, session.id)} className="sl-act sl-act-red" title="Delete permanently">
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => duplicateSession(e, session)} className="sl-act sl-act-blue" title="Duplicate">
                            <Copy size={14} />
                          </button>
                          <button onClick={e => softDeleteSession(e, session.id)} className="sl-act sl-act-red" title="Move to trash">
                            <Trash2 size={14} />
                          </button>
                          <div className="sl-act sl-chev"><ChevronRight size={16} /></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && search && (
              <div className="sl-noresults">No results matching "{search}"</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Scoped styles. Shares the ClaimSense token set with the other screens. */
const CSS = `
.sl-root{
  --sl-card:var(--bg-elevated);--sl-card-2:var(--bg-secondary);
  --sl-line:#27324C;--sl-line-soft:#1A2236;
  --sl-blueprint:var(--blueprint);--sl-brass:var(--accent-primary);
  --sl-text:var(--text-primary);--sl-text-2:var(--text-secondary);--sl-text-3:var(--text-muted);
  --sl-novel:var(--success);--sl-risk:var(--warning);--sl-danger:var(--error);
  --sl-sans:var(--font-sans);--sl-serif:var(--font-serif);--sl-mono:var(--font-mono);
  font-family:var(--sl-sans);color:var(--sl-text);-webkit-font-smoothing:antialiased;
}
.sl-root *{box-sizing:border-box}
.sl-wrap{max-width:1040px;margin:0 auto;padding:30px 24px 60px}
.sl-muted{color:var(--sl-text-3)}
.sl-blue{color:var(--sl-blueprint)}
.sl-green{color:var(--sl-novel)}
.sl-danger{color:var(--sl-danger)}

.sl-card{background:var(--sl-card);border:1px solid var(--sl-line-soft);border-radius:12px}

/* Stats */
.sl-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
.sl-stat{background:var(--sl-card);border:1px solid var(--sl-line-soft);border-radius:12px;padding:16px;display:flex;align-items:center;gap:13px}
.sl-stat-ico{width:40px;height:40px;border-radius:11px;background:#ffffff06;display:grid;place-items:center;color:var(--sl-text-3);flex-shrink:0}
.sl-stat-num{font-family:var(--sl-serif);font-size:26px;font-weight:600;line-height:1}
.sl-stat-label{font-family:var(--sl-mono);font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--sl-text-3);margin-top:5px}

/* Tabs */
.sl-tabbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.sl-tabs{display:flex;gap:4px;padding:4px;border-radius:11px;background:var(--sl-card-2);border:1px solid var(--sl-line-soft)}
.sl-tab{display:inline-flex;align-items:center;gap:8px;padding:8px 15px;border-radius:8px;border:0;background:transparent;font-family:var(--sl-sans);font-size:13.5px;font-weight:500;color:var(--sl-text-3);cursor:pointer;transition:.16s}
.sl-tab:hover{color:var(--sl-text-2)}
.sl-tab-on{background:#ffffff0d;color:#fff;box-shadow:0 1px 2px #00000026}
.sl-tab-badge{font-family:var(--sl-mono);font-size:10.5px;padding:1px 7px;border-radius:6px;background:#ffffff08;color:var(--sl-text-3)}
.sl-tab-badge-blue{background:#5B7FC01f;color:var(--sl-blueprint)}
.sl-tab-badge-red{background:#C5564B1f;color:var(--sl-danger)}

/* Buttons */
.sl-btn-ghost{display:inline-flex;align-items:center;gap:7px;font-family:var(--sl-sans);font-size:12px;font-weight:600;color:var(--sl-text-2);background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 12px;cursor:pointer;transition:.16s}
.sl-btn-ghost:hover{background:#ffffff08}
.sl-btn-lg{font-size:13.5px;padding:11px 20px;border:1px solid var(--sl-line-soft)}
.sl-btn-lg:hover{border-color:var(--sl-brass);color:var(--sl-brass);background:transparent}
.sl-icon-only{padding:7px}
.sl-btn-brass{display:inline-flex;align-items:center;gap:8px;font-family:var(--sl-sans);font-size:13.5px;font-weight:600;color:#1a1206;background:var(--sl-brass);border:1px solid var(--sl-brass);border-radius:10px;padding:12px 22px;cursor:pointer;transition:.16s;box-shadow:0 4px 16px #c9a45c26}
.sl-btn-brass:hover{background:#d6b46e}

/* Search */
.sl-search{position:relative;margin-bottom:22px}
.sl-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--sl-text-3)}
.sl-inp{width:100%;font-family:var(--sl-sans);font-size:13.5px;color:var(--sl-text);background:var(--sl-card-2);border:1px solid var(--sl-line-soft);border-radius:10px;padding:12px 14px 12px 40px;outline:0;transition:.16s}
.sl-inp::placeholder{color:var(--sl-text-3)}
.sl-inp:hover{border-color:var(--sl-line)}
.sl-inp:focus{border-color:var(--sl-brass);box-shadow:0 0 0 3px #c9a45c2b}

/* Bulk bar */
.sl-bulk{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding:11px 16px;border-radius:11px;background:#5B7FC00d;border:1px solid #5B7FC026}
.sl-bulk-count{font-size:13px;color:var(--sl-blueprint)}
.sl-bulk-count span{font-weight:700}
.sl-bulk-actions{display:flex;align-items:center;gap:4px}

/* List */
.sl-list{display:flex;flex-direction:column;gap:12px}

/* Skeleton */
.sl-skel{padding:20px;animation:sl-pulse 1.6s ease-in-out infinite}
.sl-skel-row{display:flex;align-items:flex-start;gap:16px}
.sl-skel-ico{width:48px;height:48px;border-radius:12px;background:#ffffff08;flex-shrink:0}
.sl-skel-lines{flex:1;display:flex;flex-direction:column;gap:9px}
.sl-skel-line{height:13px;border-radius:5px;background:#ffffff08}
.sl-w75{width:75%}.sl-w100{width:100%}.sl-w33{width:33%;margin-top:4px}
@keyframes sl-pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* States */
.sl-state{text-align:center;padding:90px 20px}
.sl-state-ico{width:64px;height:64px;border-radius:18px;background:#ffffff06;border:1px solid var(--sl-line-soft);display:grid;place-items:center;color:var(--sl-text-3);margin:0 auto 20px}
.sl-state-ico-err{background:#C5564B14;border-color:#C5564B33;color:var(--sl-danger)}
.sl-state-title{font-family:var(--sl-serif);font-size:20px;font-weight:600;color:#fff;margin:0 0 8px}
.sl-state-title-lg{font-size:25px}
.sl-state-sub{font-size:13.5px;color:var(--sl-text-3);margin:0 auto 24px;line-height:1.6}
.sl-state-sub-w{max-width:380px}
.sl-empty-mark{position:relative;display:inline-block;margin-bottom:22px}
.sl-empty-ico{width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#5B7FC014,#C9A45C10);border:1px solid var(--sl-line-soft);display:grid;place-items:center;color:#5B7FC0aa}
.sl-empty-spark{position:absolute;top:-5px;right:-5px;width:26px;height:26px;border-radius:50%;background:var(--sl-brass);display:grid;place-items:center;color:#1a1206;box-shadow:0 4px 14px #c9a45c40}

/* Trash note */
.sl-note{display:flex;align-items:center;gap:11px;padding:11px 15px;border-radius:10px;background:#E6C1700a;border:1px solid #E6C17021;color:var(--sl-risk);margin-bottom:2px}
.sl-note svg{flex-shrink:0}
.sl-note p{font-size:12px;line-height:1.5;color:#E6C170cc;margin:0}

/* Session card */
.sl-item{background:var(--sl-card);border:1px solid var(--sl-line-soft);border-radius:12px;padding:18px;transition:.16s}
.sl-item-open{cursor:pointer}
.sl-item-open:hover{border-color:var(--sl-line);transform:translateY(-1px)}
.sl-item-trashed{opacity:.72}
.sl-item-sel{border-color:#C9A45C66;background:#C9A45C0a}
.sl-item-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.sl-item-main{display:flex;align-items:flex-start;gap:15px;min-width:0;flex:1}
.sl-check{width:20px;height:20px;border-radius:6px;border:1px solid var(--sl-line);background:transparent;display:grid;place-items:center;cursor:pointer;margin-top:3px;flex-shrink:0;color:#fff;transition:.15s}
.sl-check:hover{border-color:var(--sl-text-3)}
.sl-check-on{background:var(--sl-brass);border-color:var(--sl-brass);color:#1a1206}
.sl-item-ico{width:48px;height:48px;border-radius:12px;border:1px solid var(--sl-line-soft);background:#ffffff05;display:grid;place-items:center;flex-shrink:0}
.sl-item-txt{min-width:0;flex:1}
.sl-item-title{font-family:var(--sl-serif);font-size:16px;font-weight:600;color:#fff;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-item-title-dim{color:var(--sl-text-2)}
.sl-item-desc{font-size:13px;color:var(--sl-text-3);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.5}
.sl-item-meta{display:flex;align-items:center;gap:12px;margin-top:11px}
.sl-badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--sl-mono);font-size:10px;font-weight:500;letter-spacing:.3px;padding:3px 9px;border-radius:6px;border:1px solid}
.sl-badge-trash{color:var(--sl-danger);background:#C5564B14;border-color:#C5564B33}
.sl-date{font-family:var(--sl-mono);font-size:11px;letter-spacing:.2px;color:var(--sl-text-3)}

.sl-actions{display:flex;align-items:center;gap:2px;flex-shrink:0}
.sl-act{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;border:0;background:transparent;color:var(--sl-text-3);cursor:pointer;transition:.15s;opacity:0}
.sl-item:hover .sl-act{opacity:1}
.sl-act.sl-chev{opacity:1;color:var(--sl-text-3);cursor:default}
.sl-item-open:hover .sl-chev{color:var(--sl-text-2)}
.sl-act-blue:hover{background:#5B7FC014;color:var(--sl-blueprint)}
.sl-act-green:hover{background:#6FCB9714;color:var(--sl-novel)}
.sl-act-red:hover{background:#C5564B14;color:var(--sl-danger)}

.sl-noresults{text-align:center;padding:48px 0;color:var(--sl-text-3);font-size:13.5px}

.sl-spin{animation:sl-sp .9s linear infinite}
@keyframes sl-sp{to{transform:rotate(360deg)}}
`;
