import { useState, useMemo, useCallback } from 'react';
import { Eye, EyeOff, ChevronRight, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../lib/auth';

// Single source of truth for the product name.
// (Was inconsistent in the original: "ClaimSense" / "ClaimStream AI" / "ClaimStream".)
const BRAND = 'ClaimSense';

type Mode = 'signin' | 'signup';
type Notice = { kind: 'err' | 'ok' | 'info'; text: string } | null;

const SIGNS = [
  { ref: 10, title: 'Antecedent Basis Engine', desc: 'Tracks element references across claims and spec' },
  { ref: 12, title: 'Claim Dependency Map', desc: 'Independent & dependent claim structure' },
  { ref: 14, title: 'Patentability Pre-Check', desc: 'Novelty & prior-art risk assessment' },
  { ref: 16, title: 'Full Application Output', desc: 'Abstract through Claims, USPTO structure' },
];

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, Math.max(1, s));
}

const STRENGTH = [
  { label: '', color: '' },
  { label: 'Too weak', color: '#A8392F' },
  { label: 'Weak', color: '#9A6A1E' },
  { label: 'Good', color: '#3F7D55' },
  { label: 'Strong', color: '#C9A45C' },
];

function Seal({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <circle cx="21" cy="21" r="20" stroke="#C9A45C" strokeWidth="1" />
      <circle cx="21" cy="21" r="16" stroke="#C9A45C" strokeWidth=".6" strokeDasharray="2 2" />
      <path d="M21 9 L21 33 M14 15 L28 15 M14 27 L28 27" stroke="#C9A45C" strokeWidth="1.2" />
      <path d="M16 21 L26 21" stroke="#5B7FC0" strokeWidth="1.4" />
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const isIn = mode === 'signin';
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setPassword('');
    setShow(false);
    setCaps(false);
    setNotice(null);
  }, []);

  const onPwKey = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState?.('CapsLock') ?? false);

  function handleForgot() {
    setNotice(null);
    if (!email.trim()) {
      setNotice({ kind: 'err', text: 'Enter your email above, then select Forgot password.' });
      return;
    }
    // TODO: wire to your auth provider's reset flow, e.g. resetPassword(email).
    setNotice({ kind: 'info', text: `If an account exists for ${email.trim()}, a reset link is on its way.` });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (password.length < 8) {
      setNotice({ kind: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    const { error } = isIn ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) {
      setNotice({ kind: 'err', text: error });
    } else if (mode === 'signup') {
      setMode('signin');
      setPassword('');
      setNotice({ kind: 'ok', text: 'Account created. You can sign in now.' });
    }
  }

  const noticeIcon = notice
    ? { err: <AlertCircle size={15} />, ok: <CheckCircle2 size={15} />, info: <Info size={15} /> }[notice.kind]
    : null;

  return (
    <div className="cs-root">
      <style>{CSS}</style>

      <div className="cs-stage">
        {/* ===== INK HERO ===== */}
        <section className="cs-hero">
          <div className="cs-grid" />
          <div className="cs-glow cs-glow-a" />
          <div className="cs-glow cs-glow-b" />

          <div className="cs-brand">
            <Seal />
            <div>
              <div className="cs-brand-name">{BRAND}</div>
              <div className="cs-brand-tag">Patent Drafting System</div>
            </div>
          </div>

          <div className="cs-hero-mid">
            <div className="cs-eyebrow">Fig. 1 · Automated Drafting Apparatus</div>
            <h1 className="cs-display">Disclosure in.<br /><em>Filing-ready</em> out.</h1>
            <p className="cs-lede">
              Precise claim language, tracked antecedent basis, and a full USPTO specification —
              drafted in minutes, then reviewed in your own voice.
            </p>

            <div className="cs-fig-cap">— Reference signs below —</div>
            <svg className="cs-figure" viewBox="0 0 560 250" aria-labelledby="csFigTtl csFigDesc">
              <title id="csFigTtl">{BRAND} drafting apparatus, Figure 1</title>
              <desc id="csFigDesc">A schematic of the drafting engine with four numbered reference signs.</desc>

              <rect className="cs-part" x="210" y="40" width="140" height="170" rx="6" />
              <line className="cs-part-soft" x1="210" y1="78" x2="350" y2="78" />
              <line className="cs-part-soft" x1="210" y1="172" x2="350" y2="172" />
              <text x="280" y="64" textAnchor="middle" className="cs-fig-t">DISCLOSURE</text>
              <text x="280" y="192" textAnchor="middle" className="cs-fig-t">APPLICATION</text>

              <circle className="cs-part" cx="280" cy="100" r="6" />
              <line className="cs-part" x1="280" y1="106" x2="258" y2="128" />
              <line className="cs-part" x1="280" y1="106" x2="302" y2="128" />
              <circle className="cs-part" cx="258" cy="134" r="5" />
              <circle className="cs-part" cx="302" cy="134" r="5" />
              <line className="cs-part-soft" x1="258" y1="139" x2="248" y2="156" />
              <line className="cs-part-soft" x1="258" y1="139" x2="268" y2="156" />
              <circle className="cs-part-soft" cx="248" cy="160" r="3.5" />
              <circle className="cs-part-soft" cx="268" cy="160" r="3.5" />
              <circle className="cs-part-soft" cx="302" cy="160" r="3.5" />
              <line className="cs-part-soft" x1="302" y1="139" x2="302" y2="156" />

              <circle className="cs-part" cx="210" cy="100" r="3.5" />
              <circle className="cs-part" cx="210" cy="150" r="3.5" />
              <circle className="cs-part" cx="350" cy="100" r="3.5" />
              <circle className="cs-part" cx="350" cy="150" r="3.5" />

              {([
                { id: 10, x1: 210, y1: 100, x2: 96, y2: 78, cx: 78, cy: 78 },
                { id: 12, x1: 210, y1: 150, x2: 96, y2: 172, cx: 78, cy: 172 },
                { id: 14, x1: 350, y1: 100, x2: 464, y2: 78, cx: 482, cy: 78 },
                { id: 16, x1: 350, y1: 150, x2: 464, y2: 172, cx: 482, cy: 172 },
              ] as const).map(n => (
                <g key={n.id} className={`cs-num${hovered === n.id ? ' cs-hot' : ''}`}>
                  <line
                    className="cs-leader"
                    x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
                    style={{ ['--len' as string]: 120 } as React.CSSProperties}
                  />
                  <circle cx={n.cx} cy={n.cy} r="14" />
                  <text x={n.cx} y={n.cy + 4} textAnchor="middle">{n.id}</text>
                </g>
              ))}
            </svg>

            <div className="cs-signs">
              {SIGNS.map(s => (
                <div
                  key={s.ref}
                  className="cs-sign"
                  onMouseEnter={() => setHovered(s.ref)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="cs-ref">{s.ref}</div>
                  <div className="cs-sign-txt">
                    <b>{s.title}</b>
                    <span>{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="cs-hero-foot">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5B647C" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />
            </svg>
            For licensed Patent Agents & IP Attorneys. Not a substitute for professional legal judgment.
          </p>
        </section>

        {/* ===== PAPER FORM ===== */}
        <section className="cs-panel">
          <div className="cs-form-card">
            <div className="cs-m-brand">
              <Seal size={34} />
              <b>{BRAND}</b>
            </div>

            <div className="cs-head">
              <h2>{isIn ? 'Welcome back' : 'Create account'}</h2>
              <p>{isIn ? 'Sign in to your patent workspace' : 'Start drafting USPTO-compliant applications'}</p>
            </div>

            <div className="cs-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button" role="tab" aria-selected={isIn}
                className={isIn ? 'cs-on' : ''}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button" role="tab" aria-selected={!isIn}
                className={!isIn ? 'cs-on' : ''}
                onClick={() => switchMode('signup')}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="cs-field">
                <label htmlFor="cs-email">Email</label>
                <input
                  id="cs-email" type="email" autoComplete="email" autoFocus
                  className="cs-inp" placeholder="attorney@lawfirm.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>

              <div className="cs-field">
                <div className="cs-row-label">
                  <label htmlFor="cs-pw">Password</label>
                  {isIn && (
                    <button type="button" className="cs-link" onClick={handleForgot}>Forgot password</button>
                  )}
                </div>
                <div className="cs-control">
                  <input
                    id="cs-pw"
                    type={show ? 'text' : 'password'}
                    autoComplete={isIn ? 'current-password' : 'new-password'}
                    className="cs-inp cs-pw"
                    placeholder="Minimum 8 characters"
                    minLength={8} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyUp={onPwKey}
                    onKeyDown={onPwKey}
                  />
                  <button
                    type="button" className="cs-reveal" tabIndex={-1}
                    aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                    onClick={() => setShow(s => !s)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {caps && (
                  <div className="cs-caps">
                    <AlertCircle size={13} /> Caps Lock is on
                  </div>
                )}

                {!isIn && password.length > 0 && (
                  <div className="cs-meter">
                    <div className="cs-bars" aria-hidden="true">
                      {[1, 2, 3, 4].map(seg => (
                        <i key={seg} style={{ background: seg <= strength ? STRENGTH[strength].color : 'var(--cs-paper-line)' }} />
                      ))}
                    </div>
                    <div className="cs-meter-lab">
                      Strength · <b style={{ color: STRENGTH[strength].color || 'var(--cs-ink-muted)' }}>{STRENGTH[strength].label}</b>
                    </div>
                  </div>
                )}
              </div>

              <div aria-live="polite" className="cs-msgs">
                {notice && (
                  <div className={`cs-msg cs-${notice.kind}`} role="alert">
                    {noticeIcon}
                    <span>{notice.text}</span>
                  </div>
                )}
              </div>

              <button type="submit" className="cs-submit" disabled={!canSubmit} aria-busy={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="cs-spin" />
                    <span>{isIn ? 'Signing in…' : 'Creating account…'}</span>
                  </>
                ) : (
                  <>
                    <span>{isIn ? 'Sign in' : 'Create account'}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="cs-alt">
              {isIn ? `New to ${BRAND}? ` : 'Already have an account? '}
              <button type="button" onClick={() => switchMode(isIn ? 'signup' : 'signin')}>
                {isIn ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* Scoped layout styles. Fonts + accent come from the global ClaimSense theme (index.css). */
const CSS = `
.cs-root{
  --cs-ink-850:#0A0E1A;--cs-ink-800:#0D1426;--cs-line-soft:#1A2236;
  --cs-blueprint:var(--blueprint-dim);--cs-blueprint-dim:#37496F;
  --cs-brass:var(--accent-primary);--cs-brass-soft:#9C7E45;
  --cs-paper:#FAF8F3;--cs-paper-2:#F3EFE6;--cs-paper-line:#E4DECE;
  --cs-ink:#171514;--cs-ink-muted:#6E665A;--cs-ink-faint:#9A9183;
  --cs-sans:var(--font-sans);--cs-serif:var(--font-serif);--cs-mono:var(--font-mono);
  font-family:var(--cs-sans);color:var(--cs-ink);-webkit-font-smoothing:antialiased;
}
.cs-root *{box-sizing:border-box}
.cs-stage{min-height:100vh;display:flex}

.cs-hero{position:relative;width:56%;flex-shrink:0;background:var(--cs-ink-850);color:#E9ECF4;
  display:flex;flex-direction:column;justify-content:space-between;padding:40px 48px;overflow:hidden}
.cs-grid{position:absolute;inset:0;
  background-image:linear-gradient(var(--cs-line-soft) 1px,transparent 1px),linear-gradient(90deg,var(--cs-line-soft) 1px,transparent 1px),linear-gradient(var(--cs-line-soft) 1px,transparent 1px),linear-gradient(90deg,var(--cs-line-soft) 1px,transparent 1px);
  background-size:96px 96px,96px 96px,16px 16px,16px 16px;opacity:.55;
  -webkit-mask-image:radial-gradient(120% 120% at 30% 35%,#000 40%,transparent 92%);mask-image:radial-gradient(120% 120% at 30% 35%,#000 40%,transparent 92%)}
.cs-glow{position:absolute;border-radius:50%;filter:blur(120px);pointer-events:none}
.cs-glow-a{width:520px;height:520px;background:#1d2c52;top:-160px;left:-120px;opacity:.5}
.cs-glow-b{width:360px;height:360px;background:#3a2c14;bottom:-120px;right:-80px;opacity:.4}

.cs-brand{position:relative;display:flex;align-items:center;gap:13px;z-index:2}
.cs-brand-name{font-family:var(--cs-serif);font-size:21px;font-weight:600;letter-spacing:.2px;color:#fff}
.cs-brand-tag{font-family:var(--cs-mono);font-size:10px;letter-spacing:2px;color:var(--cs-brass);text-transform:uppercase;margin-top:3px}

.cs-hero-mid{position:relative;z-index:2;max-width:540px}
.cs-eyebrow{font-family:var(--cs-mono);font-size:11px;letter-spacing:3px;color:var(--cs-blueprint);text-transform:uppercase;display:flex;align-items:center;gap:10px;margin-bottom:22px}
.cs-eyebrow::before{content:"";width:26px;height:1px;background:var(--cs-blueprint-dim)}
.cs-display{font-family:var(--cs-serif);font-weight:500;font-size:clamp(2.4rem,3.4vw,3.35rem);line-height:1.02;letter-spacing:-.5px;color:#fff;margin:0 0 18px}
.cs-display em{font-style:italic;color:var(--cs-brass);font-weight:500}
.cs-lede{color:#9AA3B8;font-size:15.5px;line-height:1.65;max-width:440px;margin:0 0 28px}

.cs-fig-cap{font-family:var(--cs-mono);font-size:10.5px;letter-spacing:1.5px;color:#6B7693;text-transform:uppercase;margin-bottom:8px}
.cs-figure{width:100%;max-width:520px;height:auto;display:block}
.cs-fig-t{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;fill:#6B7693}
.cs-leader{stroke:var(--cs-blueprint-dim);stroke-width:1;fill:none;stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:cs-draw .9s ease forwards}
.cs-part{stroke:var(--cs-blueprint);stroke-width:1.25;fill:none}
.cs-part-soft{stroke:var(--cs-blueprint-dim);stroke-width:1;fill:none}
.cs-num circle{fill:var(--cs-ink-800);stroke:var(--cs-blueprint-dim);stroke-width:1;transition:.18s}
.cs-num text{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;fill:#AFC0E6;transition:.18s}
.cs-num.cs-hot circle{stroke:var(--cs-brass);fill:#1a1710}
.cs-num.cs-hot text{fill:var(--cs-brass)}
@keyframes cs-draw{to{stroke-dashoffset:0}}

.cs-signs{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px;margin-top:22px;max-width:540px}
.cs-sign{display:flex;align-items:flex-start;gap:11px;padding:7px 8px;border-radius:7px;transition:.15s}
.cs-sign:hover{background:#ffffff08}
.cs-ref{font-family:var(--cs-mono);font-size:12px;font-weight:700;color:var(--cs-brass);width:20px;flex-shrink:0;padding-top:1px}
.cs-sign-txt b{display:block;font-size:13.5px;font-weight:500;color:#E9ECF4}
.cs-sign-txt span{font-size:12px;color:#7F889E;line-height:1.45}

.cs-hero-foot{position:relative;z-index:2;display:flex;align-items:center;gap:9px;font-size:11.5px;color:#5B647C;padding-top:18px;border-top:1px solid #ffffff0d;margin:0}

.cs-panel{flex:1;background:var(--cs-paper);position:relative;display:flex;align-items:center;justify-content:center;padding:40px 36px}
.cs-panel::before{content:"";position:absolute;inset:0;opacity:.5;pointer-events:none;background-image:linear-gradient(var(--cs-paper-line) 1px,transparent 1px);background-size:100% 30px;-webkit-mask-image:linear-gradient(transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(transparent,#000 18%,#000 82%,transparent)}
.cs-form-card{position:relative;width:100%;max-width:392px}

.cs-m-brand{display:none;align-items:center;gap:11px;margin-bottom:34px}
.cs-m-brand b{font-family:var(--cs-serif);font-size:18px;font-weight:600}

.cs-head{margin-bottom:26px}
.cs-head h2{font-family:var(--cs-serif);font-size:27px;font-weight:600;letter-spacing:-.3px;margin:0 0 6px}
.cs-head p{color:var(--cs-ink-muted);font-size:14px;margin:0}

.cs-tabs{display:flex;gap:4px;background:var(--cs-paper-2);border:1px solid var(--cs-paper-line);border-radius:10px;padding:4px;margin-bottom:24px}
.cs-tabs button{flex:1;border:0;background:transparent;font-family:var(--cs-sans);font-size:13.5px;font-weight:500;color:var(--cs-ink-muted);padding:9px 0;border-radius:7px;cursor:pointer;transition:.18s}
.cs-tabs button.cs-on{background:#fff;color:var(--cs-ink);box-shadow:0 1px 2px #0000000f,0 0 0 1px var(--cs-paper-line)}

.cs-field{margin-bottom:17px}
.cs-field label{display:block;font-size:12.5px;font-weight:500;color:var(--cs-ink-muted);margin-bottom:7px}
.cs-row-label{display:flex;justify-content:space-between;align-items:center}
.cs-link{background:0;border:0;font-family:var(--cs-mono);font-size:11px;letter-spacing:.3px;color:var(--cs-brass-soft);cursor:pointer;text-transform:uppercase}
.cs-link:hover{color:var(--cs-brass)}
.cs-control{position:relative}
.cs-inp{width:100%;font-family:var(--cs-sans);font-size:14.5px;color:var(--cs-ink);background:#fff;border:1px solid var(--cs-paper-line);border-radius:9px;padding:12px 14px;transition:.16s;outline:0}
.cs-inp::placeholder{color:var(--cs-ink-faint)}
.cs-inp:hover{border-color:#D5CEBC}
.cs-inp:focus{border-color:var(--cs-brass);box-shadow:0 0 0 3px #c9a45c33}
.cs-inp.cs-pw{padding-right:44px}
.cs-reveal{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:0;border:0;width:32px;height:32px;border-radius:7px;color:var(--cs-ink-faint);cursor:pointer;display:grid;place-items:center;transition:.15s}
.cs-reveal:hover{color:var(--cs-ink-muted);background:var(--cs-paper-2)}
.cs-caps{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;color:#9A6A1E}
.cs-meter{margin-top:11px}
.cs-bars{display:flex;gap:5px}
.cs-bars i{height:3px;flex:1;border-radius:2px;background:var(--cs-paper-line);transition:.25s}
.cs-meter-lab{font-family:var(--cs-mono);font-size:10.5px;letter-spacing:.5px;color:var(--cs-ink-faint);margin-top:7px;text-transform:uppercase}
.cs-meter-lab b{font-weight:500}

.cs-msgs{margin-bottom:17px}
.cs-msgs:empty{display:none}
.cs-msg{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.45;padding:11px 13px;border-radius:9px;border:1px solid}
.cs-msg svg{flex-shrink:0;margin-top:1px}
.cs-msg.cs-err{background:#F6E9E7;border-color:#e6c4bf;color:#A8392F}
.cs-msg.cs-ok{background:#EAF1EB;border-color:#cadbcd;color:#3F7D55}
.cs-msg.cs-info{background:#E9EEF4;border-color:#cfdae6;color:#3A5577}

.cs-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;font-family:var(--cs-sans);font-size:14.5px;font-weight:600;color:var(--cs-paper);background:var(--cs-ink);border:1px solid var(--cs-ink);border-radius:10px;padding:13px;cursor:pointer;transition:.18s;position:relative;overflow:hidden}
.cs-submit::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,#c9a45c2e,transparent);transform:translateX(-120%);transition:.5s}
.cs-submit:hover:not(:disabled)::after{transform:translateX(120%)}
.cs-submit:hover:not(:disabled){background:#231f1a}
.cs-submit:active:not(:disabled){transform:scale(.99)}
.cs-submit:disabled{opacity:.5;cursor:not-allowed}
.cs-spin{animation:cs-sp .7s linear infinite}
@keyframes cs-sp{to{transform:rotate(360deg)}}

.cs-alt{text-align:center;font-size:13px;color:var(--cs-ink-muted);margin-top:22px;padding-top:20px;border-top:1px solid var(--cs-paper-line)}
.cs-alt button{background:0;border:0;color:var(--cs-brass-soft);font-weight:600;font-size:13px;cursor:pointer}
.cs-alt button:hover{color:var(--cs-brass)}

@media (max-width:980px){
  .cs-hero{display:none}
  .cs-panel{padding:36px 22px}
  .cs-m-brand{display:flex}
}
@media (prefers-reduced-motion:reduce){
  .cs-leader{animation:none;stroke-dashoffset:0}
  .cs-submit::after{display:none}
}
`;
