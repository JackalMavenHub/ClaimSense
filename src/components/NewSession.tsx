import { useState } from 'react';
import {
  ArrowRight, Lightbulb, AlertCircle,
  Zap, MessageSquare, ShieldCheck, Loader2, CheckCircle2,
  AlertTriangle, TrendingUp, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { patentabilityCheck, PatentabilityCheck, PriorArtReference } from '../lib/api';
import PriorArtPanel from './PriorArtPanel';

type Props = {
  onSubmit: (title: string, description: string, priorArt: PriorArtReference[]) => void;
  onExpressDraft: (title: string, description: string, priorArt: PriorArtReference[]) => void;
};

const MIN_CHARS = 100;

const EXAMPLE = `A solar panel mounting system that uses two independent servo motors to rotate the panel on both a horizontal (azimuth) axis and a vertical (elevation) axis. The system uses a light-sensing array consisting of four photodiodes arranged in a quadrant configuration to detect the brightest point in the sky. A microcontroller processes the differential signals from the photodiodes and sends PWM control signals to each servo motor to align the panel perpendicular to the incoming solar radiation. The system also incorporates a weather mode that parks the panel flat during high wind conditions detected by an onboard anemometer.`;

// Semantic colours for the pre-check result. c = base, c2 = lighter (used for text/score on the dark surface).
const CONFIDENCE_CONFIG: Record<PatentabilityCheck['confidence_label'], {
  c: string; c2: string; icon: React.ElementType;
}> = {
  'Strong Candidate':       { c: '#3E9E6B', c2: '#6FCB97', icon: CheckCircle2 },
  'Likely Patentable':      { c: '#5B7FC0', c2: '#92B2E6', icon: TrendingUp },
  'Patentable with Caution':{ c: '#C99A3C', c2: '#E6C170', icon: AlertTriangle },
  'Significant Hurdles':    { c: '#CC7B3D', c2: '#E59E68', icon: AlertTriangle },
  'Major Obstacles':        { c: '#C5564B', c2: '#E07E73', icon: AlertCircle },
};

function ConfidenceMeter({ score, label }: { score: number; label: PatentabilityCheck['confidence_label'] }) {
  const cfg = CONFIDENCE_CONFIG[label] ?? CONFIDENCE_CONFIG['Likely Patentable'];
  const Icon = cfg.icon;
  const CIRC = 2 * Math.PI * 34;
  return (
    <div className="cs-conf">
      <div className="cs-conf-ring">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke="url(#csConfGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <defs>
            <linearGradient id="csConfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={cfg.c} />
              <stop offset="100%" stopColor={cfg.c2} />
            </linearGradient>
          </defs>
        </svg>
        <span className="cs-conf-score" style={{ color: cfg.c2 }}>{score}</span>
      </div>
      <div>
        <div className="cs-conf-label" style={{ color: cfg.c2 }}>
          <Icon size={15} /> {label}
        </div>
        <div className="cs-conf-bar">
          <div style={{ width: `${score}%`, background: `linear-gradient(90deg, ${cfg.c}, ${cfg.c2})` }} />
        </div>
        <p className="cs-conf-cap">Patentability score</p>
      </div>
    </div>
  );
}

function Marker({ n, label, action }: { n: string; label: string; action?: React.ReactNode }) {
  return (
    <div className="cs-marker">
      <span className="cs-mk-num">{n}</span>
      <span className="cs-mk-lab">{label}</span>
      {action && <span className="cs-mk-action">{action}</span>}
    </div>
  );
}

export default function NewSession({ onSubmit, onExpressDraft }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<PatentabilityCheck | null>(null);
  const [checkError, setCheckError] = useState('');
  const [showRisks, setShowRisks] = useState(false);
  const [priorArtRefs, setPriorArtRefs] = useState<PriorArtReference[]>([]);

  const ready = title.trim().length > 0 && description.trim().length >= MIN_CHARS;

  function validate(): boolean {
    if (!title.trim()) {
      setFormError('Give your invention a title so we can organize your draft.');
      return false;
    }
    if (description.trim().length < MIN_CHARS) {
      setFormError(`Your description needs a bit more detail to generate useful claims (${MIN_CHARS - description.trim().length} more characters).`);
      return false;
    }
    return true;
  }

  async function runPatentabilityCheck() {
    if (!validate()) return;
    setChecking(true);
    setCheckError('');
    setCheckResult(null);
    try {
      const result = await patentabilityCheck(title.trim(), description.trim());
      setCheckResult(result);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Check failed. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  function handleGuided(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(title.trim(), description.trim(), priorArtRefs);
  }

  function handleExpress() {
    if (!validate()) return;
    onExpressDraft(title.trim(), description.trim(), priorArtRefs);
  }

  return (
    <div className="cs-app">
      <style>{CSS}</style>

      <div className="cs-wrap">
        {/* Header */}
        <header className="cs-hd">
          <div className="cs-eyebrow">New disclosure · Intake</div>
          <h1 className="cs-h1">Describe your invention</h1>
          <p className="cs-lede">
            Write what your invention does and how it works. The more detail you provide,
            the stronger your patent claims will be.
          </p>
        </header>

        {/* Drafting guidance */}
        <div className="cs-note">
          <div className="cs-note-head">
            <Lightbulb size={15} />
            <span>Stronger descriptions lead to stronger patents</span>
          </div>
          <ul className="cs-note-list">
            <li>Name each part of the invention and how they connect</li>
            <li>Explain what makes it new — what did existing solutions get wrong?</li>
            <li>Include numbers: dimensions, speeds, ranges, thresholds</li>
            <li>Mention materials, sensors, protocols, or algorithms used</li>
          </ul>
        </div>

        <form onSubmit={handleGuided} className="cs-form">
          {/* 01 — Title */}
          <section>
            <Marker n="01" label="Invention title" action={<span className="cs-req">Required</span>} />
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setFormError(''); setCheckResult(null); }}
              placeholder="e.g., Dual-axis solar tracking mechanism"
              className="cs-inp"
            />
          </section>

          {/* 02 — Description */}
          <section>
            <Marker
              n="02"
              label="Technical disclosure"
              action={
                <button
                  type="button"
                  className="cs-textlink"
                  onClick={() => { setDescription(EXAMPLE); setCheckResult(null); }}
                >
                  Try a sample
                </button>
              }
            />
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setFormError(''); setCheckResult(null); }}
              rows={10}
              placeholder="What does your invention do? How does it work? What parts does it have? What problem does it solve that existing solutions don't?"
              className="cs-inp cs-textarea"
            />
            <div className="cs-count">
              <span>{description.length} characters</span>
              <span className={description.length >= MIN_CHARS ? 'cs-ok-t' : ''}>
                {description.length >= MIN_CHARS ? 'Ready to draft' : `${MIN_CHARS - description.length} more characters needed`}
              </span>
            </div>
          </section>

          {formError && (
            <div className="cs-msg cs-err" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          {/* 03 — Patentability pre-check */}
          <section>
            <Marker n="03" label="Patentability pre-check" />
            <div className="cs-card cs-precheck">
              <div className="cs-precheck-head">
                <div className="cs-precheck-id">
                  <div className="cs-chip cs-chip-neutral"><ShieldCheck size={17} /></div>
                  <div>
                    <div className="cs-precheck-title">Estimate before you draft</div>
                    <div className="cs-precheck-sub">See how likely your invention is to be approved</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runPatentabilityCheck}
                  disabled={!ready || checking}
                  className="cs-btn-ghost"
                >
                  {checking ? (
                    <><Loader2 size={13} className="cs-spin" /> Checking…</>
                  ) : checkResult ? (
                    <><ShieldCheck size={13} /> Check again</>
                  ) : (
                    <><ShieldCheck size={13} /> Check patentability</>
                  )}
                </button>
              </div>

              {checkError && (
                <div className="cs-precheck-row cs-precheck-err">
                  <AlertCircle size={13} /> {checkError}
                </div>
              )}

              {checking && (
                <div className="cs-precheck-loading">
                  <Loader2 size={17} className="cs-spin" />
                  <span>Evaluating novelty and identifying potential obstacles…</span>
                </div>
              )}

              {checkResult && !checking && (() => {
                const cfg = CONFIDENCE_CONFIG[checkResult.confidence_label] ?? CONFIDENCE_CONFIG['Likely Patentable'];
                return (
                  <div
                    className="cs-result"
                    style={{ background: `${cfg.c}12`, borderTop: `1px solid ${cfg.c}33` }}
                  >
                    <ConfidenceMeter score={checkResult.confidence} label={checkResult.confidence_label} />

                    <p className="cs-result-summary">{checkResult.summary}</p>

                    <div className="cs-tags">
                      <span className="cs-tags-label">Type</span>
                      <span className="cs-badge cs-badge-type">{checkResult.patent_type}</span>
                      {checkResult.ipc_codes?.map(code => (
                        <span key={code} className="cs-badge cs-badge-ipc">{code}</span>
                      ))}
                    </div>

                    <div>
                      <div className="cs-sub-label cs-sub-novel">
                        <CheckCircle2 size={12} /> What makes this novel
                      </div>
                      <ul className="cs-points">
                        {checkResult.novel_aspects.map((a, i) => (
                          <li key={i}><span className="cs-dot cs-dot-novel" />{a}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRisks(!showRisks)}
                        className="cs-risk-toggle"
                      >
                        <AlertTriangle size={12} />
                        <span className="cs-sub-label cs-sub-risk cs-risk-flex">
                          Risk factors ({checkResult.risk_factors.length})
                        </span>
                        {showRisks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {showRisks && (
                        <ul className="cs-points cs-points-risk">
                          {checkResult.risk_factors.map((r, i) => (
                            <li key={i}><span className="cs-dot cs-dot-risk" />{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="cs-reco">
                      <Info size={14} />
                      <div>
                        <span className="cs-sub-label cs-sub-reco">Suggested next step</span>
                        <p>{checkResult.recommendation}</p>
                      </div>
                    </div>

                    <p className="cs-disclaimer">
                      This is an AI estimate, not legal advice. Have a patent attorney review before filing.
                    </p>
                  </div>
                );
              })()}

              {!checkResult && !checking && !checkError && (
                <div className="cs-precheck-empty">
                  Optional but recommended — helps you spot issues before investing time in drafting.
                </div>
              )}
            </div>
          </section>

          {/* 04 — Prior art */}
          {ready && (
            <section>
              <Marker n="04" label="Prior art research" />
              <PriorArtPanel
                title={title}
                description={description}
                references={priorArtRefs}
                onChange={setPriorArtRefs}
              />
            </section>
          )}

          {/* Draft route */}
          <div className="cs-route">
            <button
              type="button"
              onClick={handleExpress}
              disabled={!ready}
              className="cs-route-btn cs-route-blue"
            >
              <div className="cs-route-top">
                <div className="cs-chip cs-chip-blue"><Zap size={19} /></div>
                <span className="cs-route-badge">Instant</span>
              </div>
              <div className="cs-route-title">Express draft</div>
              <p className="cs-route-desc">Get a complete draft in one step. Best when your description is already detailed.</p>
              <div className="cs-route-go">Generate draft <ArrowRight size={13} /></div>
            </button>

            <button
              type="submit"
              disabled={!ready}
              className="cs-route-btn cs-route-brass"
            >
              <div className="cs-route-top">
                <div className="cs-chip cs-chip-brass"><MessageSquare size={19} /></div>
                <span className="cs-route-badge">Guided</span>
              </div>
              <div className="cs-route-title">Guided draft</div>
              <p className="cs-route-desc">Answer 8 focused questions first. Produces stronger, harder-to-reject claims.</p>
              <div className="cs-route-go">Start guided process <ArrowRight size={13} /></div>
            </button>
          </div>

          <p className="cs-footnote">
            Either way, you can refine individual claims with AI after your draft is generated.
          </p>
        </form>
      </div>
    </div>
  );
}

/* Scoped styles + fonts. Shares the ClaimSense token set with AuthPage —
   you can lift this CSS string into one shared module to avoid duplication. */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');

.cs-app{
  --cs-card:#0F1626;--cs-card-2:#0C1322;
  --cs-line:#27324C;--cs-line-soft:#1A2236;
  --cs-blueprint:#8FB0E6;--cs-brass:#C9A45C;--cs-brass-d:#A8854A;
  --cs-text:#E7EAF2;--cs-text-2:#9AA3B8;--cs-text-3:#6B7693;
  --cs-novel:#6FCB97;--cs-risk:#E6C170;
  --cs-sans:'Inter',system-ui,sans-serif;--cs-serif:'Newsreader',Georgia,serif;--cs-mono:'JetBrains Mono',monospace;
  font-family:var(--cs-sans);color:var(--cs-text);-webkit-font-smoothing:antialiased;
}
.cs-app *{box-sizing:border-box}
.cs-wrap{max-width:760px;margin:0 auto;padding:40px 24px 64px}

.cs-hd{margin-bottom:30px;padding-bottom:24px;border-bottom:1px solid var(--cs-line-soft)}
.cs-eyebrow{font-family:var(--cs-mono);font-size:11px;letter-spacing:2.5px;color:var(--cs-brass);text-transform:uppercase;display:flex;align-items:center;gap:9px;margin-bottom:14px}
.cs-eyebrow::before{content:"";width:22px;height:1px;background:var(--cs-brass-d)}
.cs-h1{font-family:var(--cs-serif);font-weight:600;font-size:33px;letter-spacing:-.5px;color:#fff;margin:0 0 10px}
.cs-lede{color:var(--cs-text-2);font-size:15px;line-height:1.6;max-width:520px;margin:0}

.cs-note{background:var(--cs-card);border:1px solid var(--cs-line-soft);border-left:2px solid var(--cs-brass);border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:30px}
.cs-note-head{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;color:var(--cs-brass);margin-bottom:10px}
.cs-note-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.cs-note-list li{position:relative;padding-left:18px;font-size:13.5px;line-height:1.5;color:var(--cs-text-2)}
.cs-note-list li::before{content:"";position:absolute;left:2px;top:8px;width:5px;height:5px;border:1px solid var(--cs-brass-d);transform:rotate(45deg)}

.cs-form{display:flex;flex-direction:column;gap:26px}

.cs-marker{display:flex;align-items:center;gap:11px;margin-bottom:11px}
.cs-mk-num{font-family:var(--cs-mono);font-size:11px;font-weight:700;color:var(--cs-brass);letter-spacing:1px}
.cs-mk-lab{font-size:13.5px;font-weight:500;color:var(--cs-text)}
.cs-mk-action{margin-left:auto;display:flex;align-items:center}
.cs-req{font-family:var(--cs-mono);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--cs-text-3);border:1px solid var(--cs-line-soft);padding:2px 7px;border-radius:5px}
.cs-textlink{background:0;border:0;font-family:var(--cs-mono);font-size:11px;letter-spacing:.3px;color:var(--cs-blueprint);cursor:pointer;text-transform:uppercase}
.cs-textlink:hover{color:#fff}

.cs-inp{width:100%;font-family:var(--cs-sans);font-size:14px;color:var(--cs-text);background:var(--cs-card-2);border:1px solid var(--cs-line-soft);border-radius:9px;padding:12px 14px;outline:0;transition:.16s}
.cs-inp::placeholder{color:var(--cs-text-3)}
.cs-inp:hover{border-color:var(--cs-line)}
.cs-inp:focus{border-color:var(--cs-brass);box-shadow:0 0 0 3px #c9a45c2b}
.cs-textarea{font-family:var(--cs-mono);font-size:13px;line-height:1.65;resize:none}
.cs-count{display:flex;justify-content:space-between;margin-top:9px;font-family:var(--cs-mono);font-size:10.5px;letter-spacing:.3px;color:var(--cs-text-3);text-transform:uppercase}
.cs-ok-t{color:var(--cs-novel)}

.cs-msg{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.45;padding:11px 13px;border-radius:9px;border:1px solid}
.cs-msg svg{flex-shrink:0;margin-top:1px}
.cs-err{background:#C5564B17;border-color:#C5564B40;color:#E07E73}

.cs-card{background:var(--cs-card);border:1px solid var(--cs-line-soft);border-radius:11px;overflow:hidden}
.cs-precheck-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;background:#ffffff03;border-bottom:1px solid var(--cs-line-soft)}
.cs-precheck-id{display:flex;align-items:center;gap:12px}
.cs-chip{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
.cs-chip-neutral{background:#ffffff08;color:var(--cs-text-2)}
.cs-precheck-title{font-size:13.5px;font-weight:500;color:var(--cs-text)}
.cs-precheck-sub{font-size:12px;color:var(--cs-text-3);margin-top:2px}

.cs-btn-ghost{display:inline-flex;align-items:center;gap:7px;font-family:var(--cs-sans);font-size:12px;font-weight:600;color:var(--cs-text);background:#ffffff08;border:1px solid var(--cs-line-soft);border-radius:8px;padding:8px 13px;cursor:pointer;white-space:nowrap;transition:.16s}
.cs-btn-ghost:hover:not(:disabled){border-color:var(--cs-brass);color:var(--cs-brass)}
.cs-btn-ghost:disabled{opacity:.4;cursor:not-allowed}

.cs-precheck-row{padding:13px 16px;font-size:12px;display:flex;align-items:center;gap:7px;border-bottom:1px solid var(--cs-line-soft)}
.cs-precheck-err{color:#E07E73;background:#C5564B0d}
.cs-precheck-loading{padding:28px 16px;display:flex;align-items:center;justify-content:center;gap:11px;color:var(--cs-text-2);font-size:13.5px}
.cs-precheck-empty{padding:15px 16px;text-align:center;font-size:12px;color:var(--cs-text-3)}

.cs-result{padding:20px;display:flex;flex-direction:column;gap:18px}
.cs-result-summary{font-size:13.5px;line-height:1.6;color:var(--cs-text);margin:0}

.cs-conf{display:flex;align-items:center;gap:18px}
.cs-conf-ring{position:relative;width:76px;height:76px;flex-shrink:0}
.cs-conf-ring svg{width:100%;height:100%}
.cs-conf-score{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--cs-serif);font-size:23px;font-weight:600}
.cs-conf-label{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;margin-bottom:9px}
.cs-conf-bar{width:160px;height:4px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden}
.cs-conf-bar>div{height:100%;border-radius:3px;transition:width .7s ease}
.cs-conf-cap{font-family:var(--cs-mono);font-size:9.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--cs-text-3);margin:8px 0 0}

.cs-tags{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.cs-tags-label{font-family:var(--cs-mono);font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--cs-text-3)}
.cs-badge{font-family:var(--cs-mono);font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid var(--cs-line-soft)}
.cs-badge-type{color:var(--cs-text);background:#ffffff0a;text-transform:capitalize}
.cs-badge-ipc{color:var(--cs-text-2);background:#ffffff05}

.cs-sub-label{display:inline-flex;align-items:center;gap:6px;font-family:var(--cs-mono);font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px}
.cs-sub-novel{color:var(--cs-novel)}
.cs-sub-risk{color:var(--cs-risk)}
.cs-sub-reco{color:var(--cs-blueprint);margin-bottom:5px}
.cs-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.cs-points li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.5;color:var(--cs-text)}
.cs-points-risk{margin-top:11px}
.cs-dot{width:6px;height:6px;border-radius:50%;margin-top:6px;flex-shrink:0}
.cs-dot-novel{background:var(--cs-novel)}
.cs-dot-risk{background:var(--cs-risk)}

.cs-risk-toggle{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:0;border:0;cursor:pointer;color:var(--cs-risk)}
.cs-risk-toggle .cs-sub-label{margin-bottom:0}
.cs-risk-flex{flex:1}
.cs-risk-toggle>svg:last-child{color:var(--cs-text-3)}

.cs-reco{display:flex;gap:11px;align-items:flex-start;background:#5B7FC00f;border:1px solid #5B7FC026;border-radius:9px;padding:13px 14px;color:var(--cs-blueprint)}
.cs-reco>svg{margin-top:1px;flex-shrink:0}
.cs-reco p{font-size:13.5px;line-height:1.55;color:var(--cs-text);margin:0}

.cs-disclaimer{font-family:var(--cs-mono);font-size:10px;letter-spacing:.3px;color:var(--cs-text-3);margin:0;line-height:1.5}

.cs-route{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding-top:4px}
.cs-route-btn{text-align:left;background:var(--cs-card);border:1px solid var(--cs-line-soft);border-radius:12px;padding:18px;cursor:pointer;transition:.18s}
.cs-route-btn:disabled{opacity:.4;cursor:not-allowed}
.cs-route-btn:hover:not(:disabled){transform:translateY(-2px)}
.cs-route-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.cs-route-title{font-size:14px;font-weight:600;color:#fff;margin-bottom:6px}
.cs-route-desc{font-size:12.5px;line-height:1.55;color:var(--cs-text-3);margin:0 0 14px}
.cs-route-go{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500}
.cs-route-badge{font-family:var(--cs-mono);font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:6px;border:1px solid}
.cs-chip-blue{background:#5B7FC01f;color:var(--cs-blueprint)}
.cs-chip-brass{background:#C9A45C1f;color:var(--cs-brass)}
.cs-route-blue:hover:not(:disabled){border-color:#5B7FC066}
.cs-route-blue .cs-route-go{color:var(--cs-blueprint)}
.cs-route-blue .cs-route-badge{color:var(--cs-blueprint);background:#5B7FC014;border-color:#5B7FC033}
.cs-route-brass:hover:not(:disabled){border-color:#C9A45C66}
.cs-route-brass .cs-route-go{color:var(--cs-brass)}
.cs-route-brass .cs-route-badge{color:var(--cs-brass);background:#C9A45C14;border-color:#C9A45C33}
.cs-route-go svg{transition:transform .18s}
.cs-route-btn:hover:not(:disabled) .cs-route-go svg{transform:translateX(3px)}

.cs-footnote{text-align:center;font-size:12px;color:var(--cs-text-3);margin:2px 0 0}

.cs-spin{animation:cs-sp .7s linear infinite}
@keyframes cs-sp{to{transform:rotate(360deg)}}

@media (max-width:560px){
  .cs-route{grid-template-columns:1fr}
  .cs-h1{font-size:28px}
}
`;
