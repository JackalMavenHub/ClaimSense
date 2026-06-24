import { useState } from 'react';
import {
  Search, ExternalLink, Plus, X, Loader2,
  AlertTriangle, Lightbulb, BookOpen, Tag,
  ChevronDown, ChevronUp, FileSearch,
} from 'lucide-react';
import { priorArtSearch, PriorArtSearchResult, PriorArtReference } from '../lib/api';

type Props = {
  title: string;
  description: string;
  references: PriorArtReference[];
  onChange: (refs: PriorArtReference[]) => void;
};

function buildSearchUrl(query: string, database: string): string {
  if (database === 'uspto') {
    return `https://patft.uspto.gov/netacgi/nph-Parser?Sect1=PTO2&Sect2=HITOFF&u=%2Fnetahtml%2FPTO%2Fsearch-adv.htm&r=0&p=1&f=S&l=50&Query=${encodeURIComponent(query)}&d=PTXT`;
  }
  return `https://patents.google.com/?q=${encodeURIComponent(query)}`;
}

export default function PriorArtPanel({ title, description, references, onChange }: Props) {
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<PriorArtSearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const [newRef, setNewRef] = useState<PriorArtReference>({
    title: '',
    url: '',
    description: '',
    relevance: '',
  });

  async function runSearch() {
    setSearching(true);
    setSearchError('');
    try {
      const result = await priorArtSearch(title, description);
      setSearchResult(result);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  function addReference() {
    if (!newRef.title.trim() || !newRef.description.trim()) return;
    onChange([...references, { ...newRef, title: newRef.title.trim(), description: newRef.description.trim(), relevance: newRef.relevance.trim(), url: newRef.url.trim() }]);
    setNewRef({ title: '', url: '', description: '', relevance: '' });
    setShowAddForm(false);
  }

  function removeReference(i: number) {
    onChange(references.filter((_, idx) => idx !== i));
  }

  return (
    <div className="pa-root">
      <style>{CSS}</style>

      <div className="pa-card">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="pa-head"
        >
          <div className="pa-head-id">
            <div className="pa-chip pa-chip-blue">
              <FileSearch size={17} />
            </div>
            <div className="pa-head-txt">
              <div className="pa-title">
                Prior art research
                {references.length > 0 && (
                  <span className="pa-badge pa-badge-brass">{references.length} cited</span>
                )}
              </div>
              <div className="pa-sub">Find and cite existing patents to strengthen your claims</div>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="pa-body">
            {/* Search trigger */}
            {!searchResult && !searching && (
              <div className="pa-trigger">
                <p className="pa-trigger-copy">
                  AI will analyze your invention and generate targeted search queries for Google Patents and USPTO databases.
                </p>
                <button type="button" onClick={runSearch} className="pa-btn pa-btn-ghost">
                  <Search size={14} />
                  Generate search strategy
                </button>
              </div>
            )}

            {searching && (
              <div className="pa-loading">
                <Loader2 size={18} className="pa-spin" />
                <span>Analyzing invention for prior art search terms…</span>
              </div>
            )}

            {searchError && (
              <div className="pa-msg pa-err">
                <AlertTriangle size={14} />
                <span>{searchError}</span>
              </div>
            )}

            {/* Search results */}
            {searchResult && !searching && (
              <div className="pa-results">
                {/* Key terms */}
                <div>
                  <div className="pa-label pa-label-neutral">
                    <Tag size={12} /> Key search terms
                  </div>
                  <div className="pa-terms">
                    {searchResult.key_terms.map((term, i) => (
                      <span key={i} className="pa-term">{term}</span>
                    ))}
                  </div>
                </div>

                {/* Search queries */}
                <div>
                  <div className="pa-label pa-label-blue">
                    <Search size={12} /> Search queries
                    <span className="pa-label-hint">Click to search</span>
                  </div>
                  <div className="pa-stack">
                    {searchResult.search_queries.map((sq, i) => (
                      <a
                        key={i}
                        href={buildSearchUrl(sq.query, sq.database)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pa-query"
                      >
                        <div className="pa-query-ico"><ExternalLink size={12} /></div>
                        <div className="pa-query-txt">
                          <p className="pa-query-q">{sq.query}</p>
                          <p className="pa-query-focus">{sq.focus}</p>
                          <span className={`pa-db ${sq.database === 'uspto' ? 'pa-db-uspto' : 'pa-db-google'}`}>
                            {sq.database === 'uspto' ? 'USPTO' : 'Google Patents'}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* CPC codes */}
                {searchResult.suggested_cpc_codes.length > 0 && (
                  <div>
                    <div className="pa-label pa-label-teal">
                      <BookOpen size={12} /> CPC classifications
                    </div>
                    <div className="pa-stack-tight">
                      {searchResult.suggested_cpc_codes.map((c, i) => (
                        <a
                          key={i}
                          href={`https://patents.google.com/?q=&type=PATENT&assignee=&inventor=&verifiedInventor=&issueDate=&filingDate=&cpci=${encodeURIComponent(c.code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pa-cpc"
                        >
                          <code className="pa-cpc-code">{c.code}</code>
                          <span className="pa-cpc-desc">{c.description}</span>
                          <ExternalLink size={11} className="pa-cpc-ext" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk areas */}
                <div>
                  <div className="pa-label pa-label-risk">
                    <AlertTriangle size={12} /> Prior art risk areas
                  </div>
                  <ul className="pa-points">
                    {searchResult.risk_areas.map((r, i) => (
                      <li key={i}><span className="pa-dot pa-dot-risk" />{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Distinguishing tips */}
                <div>
                  <button type="button" onClick={() => setShowTips(!showTips)} className="pa-toggle">
                    <Lightbulb size={12} />
                    <span className="pa-label pa-label-novel pa-toggle-flex">
                      Tips for distinguishing ({searchResult.distinguishing_tips.length})
                    </span>
                    {showTips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showTips && (
                    <ul className="pa-points pa-points-top">
                      {searchResult.distinguishing_tips.map((t, i) => (
                        <li key={i}><span className="pa-dot pa-dot-novel" />{t}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Re-run */}
                <div className="pa-rerun">
                  <button type="button" onClick={runSearch} className="pa-textlink-muted">
                    <Search size={11} /> Re-run search
                  </button>
                </div>
              </div>
            )}

            {/* Cited references */}
            <div className="pa-sep">
              <div className="pa-sep-head">
                <div className="pa-label pa-label-brass pa-no-mb">
                  <BookOpen size={12} /> Cited references ({references.length})
                </div>
                <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="pa-textlink">
                  <Plus size={13} /> Add reference
                </button>
              </div>

              {references.length === 0 && !showAddForm && (
                <p className="pa-empty">
                  No prior art cited yet. Search above, then add any relevant patents or publications you find.
                </p>
              )}

              {/* Listed references */}
              {references.length > 0 && (
                <div className="pa-stack pa-stack-mb">
                  {references.map((ref, i) => (
                    <div key={i} className="pa-ref">
                      <div className="pa-ref-num">{i + 1}</div>
                      <div className="pa-ref-body">
                        <div className="pa-ref-top">
                          <p className="pa-ref-title">{ref.title}</p>
                          <button type="button" onClick={() => removeReference(i)} className="pa-ref-x">
                            <X size={14} />
                          </button>
                        </div>
                        {ref.url && (
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="pa-ref-url">
                            {ref.url.length > 60 ? ref.url.slice(0, 60) + '…' : ref.url}
                            <ExternalLink size={10} />
                          </a>
                        )}
                        <p className="pa-ref-desc">{ref.description}</p>
                        {ref.relevance && (
                          <p className="pa-ref-rel">Relevance: {ref.relevance}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              {showAddForm && (
                <div className="pa-form">
                  <input
                    type="text"
                    value={newRef.title}
                    onChange={e => setNewRef(r => ({ ...r, title: e.target.value }))}
                    placeholder="Patent/publication title or number (e.g., US10,123,456)"
                    className="pa-inp"
                  />
                  <input
                    type="url"
                    value={newRef.url}
                    onChange={e => setNewRef(r => ({ ...r, url: e.target.value }))}
                    placeholder="URL (optional)"
                    className="pa-inp"
                  />
                  <textarea
                    value={newRef.description}
                    onChange={e => setNewRef(r => ({ ...r, description: e.target.value }))}
                    placeholder="What does this patent/publication describe? Be specific about the technical approach."
                    rows={2}
                    className="pa-inp pa-textarea"
                  />
                  <textarea
                    value={newRef.relevance}
                    onChange={e => setNewRef(r => ({ ...r, relevance: e.target.value }))}
                    placeholder="How is it relevant to your invention? What does it NOT do that yours does?"
                    rows={2}
                    className="pa-inp pa-textarea"
                  />
                  <div className="pa-form-actions">
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewRef({ title: '', url: '', description: '', relevance: '' }); }}
                      className="pa-textlink-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addReference}
                      disabled={!newRef.title.trim() || !newRef.description.trim()}
                      className="pa-btn pa-btn-brass pa-btn-sm"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {references.length > 0 && (
              <p className="pa-footnote">
                These references will be fed directly into the patent drafting AI. Claims will be written to explicitly distinguish your invention from each cited reference.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Scoped styles. Shares the ClaimSense token set with AuthPage / NewSession —
   lift this into one shared module when you consolidate the theme. */
const CSS = `
.pa-root{
  --pa-card:var(--bg-elevated);--pa-card-2:var(--bg-secondary);
  --pa-line:#27324C;--pa-line-soft:#1A2236;
  --pa-blueprint:var(--blueprint);--pa-brass:var(--accent-primary);--pa-teal:#79C2BC;
  --pa-text:var(--text-primary);--pa-text-2:var(--text-secondary);--pa-text-3:var(--text-muted);
  --pa-novel:var(--success);--pa-risk:var(--warning);--pa-danger:var(--error);
  --pa-sans:var(--font-sans);--pa-serif:var(--font-serif);--pa-mono:var(--font-mono);
  font-family:var(--pa-sans);color:var(--pa-text);-webkit-font-smoothing:antialiased;
}
.pa-root *{box-sizing:border-box}

.pa-card{background:var(--pa-card);border:1px solid var(--pa-line-soft);border-radius:11px;overflow:hidden}

.pa-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;background:#ffffff03;border:0;border-bottom:1px solid var(--pa-line-soft);cursor:pointer;text-align:left;transition:.16s;color:var(--pa-text-3)}
.pa-head:hover{background:#ffffff06}
.pa-head-id{display:flex;align-items:center;gap:12px}
.pa-chip{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
.pa-chip-blue{background:#5B7FC01f;color:var(--pa-blueprint);border:1px solid #5B7FC026}
.pa-title{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;color:var(--pa-text)}
.pa-sub{font-size:12px;color:var(--pa-text-3);margin-top:2px}

.pa-badge{font-family:var(--pa-mono);font-size:10px;letter-spacing:.3px;padding:2px 8px;border-radius:6px;border:1px solid}
.pa-badge-brass{color:var(--pa-brass);background:#C9A45C14;border-color:#C9A45C33}

.pa-body{padding:18px 16px;display:flex;flex-direction:column;gap:20px}

.pa-trigger{text-align:center;padding:8px 0 4px}
.pa-trigger-copy{font-size:13px;line-height:1.6;color:var(--pa-text-2);max-width:440px;margin:0 auto 16px}

.pa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--pa-sans);font-size:13px;font-weight:600;border-radius:9px;padding:10px 16px;cursor:pointer;border:1px solid;transition:.16s}
.pa-btn:disabled{opacity:.4;cursor:not-allowed}
.pa-btn-sm{font-size:12px;padding:8px 13px;border-radius:8px}
.pa-btn-ghost{background:#ffffff08;border-color:var(--pa-line-soft);color:var(--pa-text)}
.pa-btn-ghost:hover{border-color:var(--pa-brass);color:var(--pa-brass)}
.pa-btn-brass{background:var(--pa-brass);border-color:var(--pa-brass);color:#1a1206}
.pa-btn-brass:hover:not(:disabled){background:#d6b46e}

.pa-textlink{display:inline-flex;align-items:center;gap:6px;background:0;border:0;font-family:var(--pa-mono);font-size:11px;letter-spacing:.3px;text-transform:uppercase;color:var(--pa-blueprint);cursor:pointer}
.pa-textlink:hover{color:#fff}
.pa-textlink-muted{display:inline-flex;align-items:center;gap:6px;background:0;border:0;font-family:var(--pa-mono);font-size:11px;letter-spacing:.3px;text-transform:uppercase;color:var(--pa-text-3);cursor:pointer;padding:4px 2px}
.pa-textlink-muted:hover{color:var(--pa-text-2)}

.pa-loading{display:flex;align-items:center;justify-content:center;gap:11px;padding:24px 0;color:var(--pa-text-2);font-size:13.5px}
.pa-msg{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.45;padding:11px 13px;border-radius:9px;border:1px solid}
.pa-msg svg{flex-shrink:0;margin-top:1px}
.pa-err{background:#C5564B17;border-color:#C5564B40;color:var(--pa-danger)}

.pa-results{display:flex;flex-direction:column;gap:20px}

.pa-label{display:flex;align-items:center;gap:7px;font-family:var(--pa-mono);font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:11px}
.pa-no-mb{margin-bottom:0}
.pa-label-neutral{color:var(--pa-text-2)}
.pa-label-blue{color:var(--pa-blueprint)}
.pa-label-teal{color:var(--pa-teal)}
.pa-label-risk{color:var(--pa-risk)}
.pa-label-novel{color:var(--pa-novel)}
.pa-label-brass{color:var(--pa-brass)}
.pa-label-hint{font-weight:400;letter-spacing:.3px;color:var(--pa-text-3);text-transform:none}

.pa-terms{display:flex;flex-wrap:wrap;gap:7px}
.pa-term{font-family:var(--pa-mono);font-size:11.5px;color:var(--pa-text-2);background:#ffffff07;border:1px solid var(--pa-line-soft);padding:4px 10px;border-radius:7px}

.pa-stack{display:flex;flex-direction:column;gap:8px}
.pa-stack-tight{display:flex;flex-direction:column;gap:6px}
.pa-stack-mb{margin-bottom:12px}

.pa-query{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;background:var(--pa-card-2);border:1px solid var(--pa-line-soft);text-decoration:none;transition:.16s}
.pa-query:hover{border-color:#5B7FC066;transform:translateY(-1px)}
.pa-query-ico{width:28px;height:28px;border-radius:8px;background:#5B7FC01a;color:var(--pa-blueprint);display:grid;place-items:center;flex-shrink:0;margin-top:1px}
.pa-query-txt{min-width:0}
.pa-query-q{font-size:13.5px;font-weight:500;color:var(--pa-text);margin:0 0 3px;word-break:break-word;font-family:var(--pa-mono)}
.pa-query:hover .pa-query-q{color:var(--pa-blueprint)}
.pa-query-focus{font-size:12px;color:var(--pa-text-3);margin:0}
.pa-db{display:inline-block;margin-top:6px;font-family:var(--pa-mono);font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.pa-db-uspto{color:var(--pa-brass)}
.pa-db-google{color:var(--pa-blueprint)}

.pa-cpc{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:9px;background:#ffffff04;border:1px solid var(--pa-line-soft);text-decoration:none;transition:.16s}
.pa-cpc:hover{background:#ffffff08;border-color:#79C2BC40}
.pa-cpc-code{font-family:var(--pa-mono);font-size:11.5px;font-weight:700;color:var(--pa-teal);flex-shrink:0}
.pa-cpc-desc{font-size:12px;color:var(--pa-text-2);flex:1}
.pa-cpc-ext{color:var(--pa-text-3);flex-shrink:0;transition:.16s}
.pa-cpc:hover .pa-cpc-ext{color:var(--pa-teal)}

.pa-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.pa-points-top{margin-top:11px}
.pa-points li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.5;color:var(--pa-text)}
.pa-dot{width:6px;height:6px;border-radius:50%;margin-top:6px;flex-shrink:0}
.pa-dot-risk{background:var(--pa-risk)}
.pa-dot-novel{background:var(--pa-novel)}

.pa-toggle{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:0;border:0;cursor:pointer;color:var(--pa-novel)}
.pa-toggle .pa-label{margin-bottom:0}
.pa-toggle-flex{flex:1}

.pa-rerun{display:flex;justify-content:flex-end}

.pa-sep{border-top:1px solid var(--pa-line-soft);padding-top:18px}
.pa-sep-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}

.pa-empty{font-size:12px;color:var(--pa-text-3);text-align:center;padding:10px 0;line-height:1.5}

.pa-ref{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;background:var(--pa-card-2);border:1px solid var(--pa-line-soft)}
.pa-ref-num{width:28px;height:28px;border-radius:8px;background:#C9A45C18;color:var(--pa-brass);font-family:var(--pa-mono);font-size:11px;font-weight:700;display:grid;place-items:center;flex-shrink:0;margin-top:1px}
.pa-ref-body{flex:1;min-width:0}
.pa-ref-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.pa-ref-title{font-size:13.5px;font-weight:500;color:var(--pa-text);margin:0}
.pa-ref-x{background:0;border:0;color:var(--pa-text-3);cursor:pointer;flex-shrink:0;opacity:0;transition:.16s}
.pa-ref:hover .pa-ref-x{opacity:1}
.pa-ref-x:hover{color:var(--pa-danger)}
.pa-ref-url{display:inline-flex;align-items:center;gap:4px;font-family:var(--pa-mono);font-size:11px;color:var(--pa-blueprint);margin-top:3px;text-decoration:none}
.pa-ref-url:hover{text-decoration:underline}
.pa-ref-desc{font-size:12.5px;line-height:1.5;color:var(--pa-text-2);margin:5px 0 0}
.pa-ref-rel{font-size:12px;font-style:italic;color:var(--pa-risk);margin:5px 0 0}

.pa-form{padding:14px;border-radius:10px;background:#ffffff04;border:1px solid var(--pa-line-soft);display:flex;flex-direction:column;gap:10px}
.pa-inp{width:100%;font-family:var(--pa-sans);font-size:13px;color:var(--pa-text);background:var(--pa-card-2);border:1px solid var(--pa-line-soft);border-radius:8px;padding:10px 12px;outline:0;transition:.16s}
.pa-inp::placeholder{color:var(--pa-text-3)}
.pa-inp:hover{border-color:var(--pa-line)}
.pa-inp:focus{border-color:var(--pa-brass);box-shadow:0 0 0 3px #c9a45c2b}
.pa-textarea{resize:none;line-height:1.5}
.pa-form-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px}

.pa-footnote{font-family:var(--pa-mono);font-size:10px;line-height:1.6;letter-spacing:.2px;color:var(--pa-text-3);margin:0}

.pa-spin{animation:pa-sp .7s linear infinite}
@keyframes pa-sp{to{transform:rotate(360deg)}}
`;
