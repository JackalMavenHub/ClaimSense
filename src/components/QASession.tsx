import { useState, useRef, useEffect } from 'react';
import {
  HelpCircle, CheckCircle, Loader2, Sparkles,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Lightbulb, ShieldAlert, Eye,
  CircleDot,
} from 'lucide-react';
import { AIQuestion } from '../lib/api';
import { PatentSession } from '../lib/supabase';

type Props = {
  session: PatentSession;
  questions: AIQuestion[];
  onSubmit: (answers: string[]) => void;
};

const MIN_ANSWER_CHARS = 15;
const GOOD_ANSWER_CHARS = 80;
const STRONG_ANSWER_CHARS = 200;

const CATEGORY_LABELS: Record<string, string> = {
  structural: 'Structural',
  functional: 'Functional',
  novel: 'Novelty',
  prior_art: 'Prior Art',
  scope: 'Scope',
  embodiments: 'Embodiments',
  advantages: 'Advantages',
  process: 'Process',
  general: 'Technical',
};

// Curated on-brand accent per category (one hex; bg/border derived via alpha).
const CATEGORY_ACCENT: Record<string, string> = {
  structural: '#8FB0E6',
  functional: '#6FCB97',
  novel: '#C9A45C',
  prior_art: '#E07E73',
  scope: '#79C2BC',
  embodiments: '#7FA7D9',
  advantages: '#6FCB97',
  process: '#E6C170',
  general: '#9AA3B8',
};

function accentOf(category?: string): string {
  return CATEGORY_ACCENT[category ?? 'general'] ?? CATEGORY_ACCENT.general;
}
function tint(c: string) {
  return { color: c, background: `${c}16`, borderColor: `${c}3d` } as React.CSSProperties;
}

function getAnswerQuality(text: string): { label: string; color: string; bg: string; percent: number } {
  const len = text.trim().length;
  if (len < MIN_ANSWER_CHARS) return { label: 'Keep going…', color: '#6B7693', bg: '#3C4860', percent: Math.min((len / MIN_ANSWER_CHARS) * 20, 20) };
  if (len < GOOD_ANSWER_CHARS) return { label: 'Usable', color: '#E6C170', bg: '#E6C170', percent: 20 + ((len - MIN_ANSWER_CHARS) / (GOOD_ANSWER_CHARS - MIN_ANSWER_CHARS)) * 40 };
  if (len < STRONG_ANSWER_CHARS) return { label: 'Solid detail', color: '#8FB0E6', bg: '#8FB0E6', percent: 60 + ((len - GOOD_ANSWER_CHARS) / (STRONG_ANSWER_CHARS - GOOD_ANSWER_CHARS)) * 30 };
  return { label: 'Patent-ready', color: '#6FCB97', bg: '#6FCB97', percent: 100 };
}

export default function QASession({ questions, onSubmit }: Props) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showExample, setShowExample] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const q = questions[currentStep];
  const accent = accentOf(q?.category);
  const answer = answers[currentStep] ?? '';
  const quality = getAnswerQuality(answer);
  const isCurrentAnswered = answer.trim().length >= MIN_ANSWER_CHARS;
  const totalAnswered = answers.filter(a => a.trim().length >= MIN_ANSWER_CHARS).length;
  const allAnswered = totalAnswered === questions.length;
  const overallProgress = (totalAnswered / questions.length) * 100;

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentStep]);

  function updateAnswer(val: string) {
    setAnswers(prev => { const next = [...prev]; next[currentStep] = val; return next; });
    setError('');
  }

  function goNext() {
    if (!isCurrentAnswered) {
      setError('This answer needs a bit more detail before we can continue.');
      return;
    }
    setError('');
    setShowExample(null);
    setShowWhy(null);
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setError('');
      setShowExample(null);
      setShowWhy(null);
      setCurrentStep(currentStep - 1);
    }
  }

  function goToStep(i: number) {
    setError('');
    setShowExample(null);
    setShowWhy(null);
    setCurrentStep(i);
  }

  function handleSubmit() {
    const unanswered = answers.findIndex(a => a.trim().length < MIN_ANSWER_CHARS);
    if (unanswered !== -1) {
      setCurrentStep(unanswered);
      setError('This answer needs a bit more detail before we can generate your draft.');
      return;
    }
    setSubmitting(true);
    onSubmit(answers);
  }

  return (
    <div className="qa-root">
      <style>{CSS}</style>

      <div className="qa-wrap">
        {/* Overall progress */}
        <div className="qa-progress">
          <div className="qa-progress-track">
            <div className="qa-progress-fill" style={{ width: `${overallProgress}%` }} />
          </div>
          <span className="qa-progress-count">{totalAnswered}/{questions.length}</span>
        </div>

        {/* Step indicators */}
        <div className="qa-steps">
          {questions.map((qq, i) => {
            const answered = answers[i].trim().length >= MIN_ANSWER_CHARS;
            const isCurrent = i === currentStep;
            const stepAccent = accentOf(qq.category);
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`qa-step ${isCurrent ? 'qa-step-cur' : answered ? 'qa-step-done' : 'qa-step-todo'}`}
                style={isCurrent ? { background: `${stepAccent}18`, borderColor: `${stepAccent}59` } : undefined}
                title={`Question ${i + 1}: ${CATEGORY_LABELS[qq.category] ?? 'Technical'}`}
              >
                {answered && !isCurrent ? (
                  <CheckCircle size={14} />
                ) : (
                  <span className="qa-step-num" style={isCurrent ? { color: stepAccent } : undefined}>{i + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current question card */}
        <div className="qa-card qa-fade" key={currentStep}>
          {/* Question header */}
          <div className="qa-qhead" style={{ background: `${accent}0d` }}>
            <div className="qa-qhead-row">
              <div className="qa-qnum" style={tint(accent)}>
                <span style={{ color: accent }}>{q.number}</span>
              </div>
              <div className="qa-qhead-main">
                <div className="qa-qmeta">
                  <span className="qa-badge" style={tint(accent)}>{CATEGORY_LABELS[q.category] ?? 'Technical'}</span>
                  <span className="qa-qcount">Question {currentStep + 1} of {questions.length}</span>
                </div>
                <p className="qa-question">{q.question}</p>
              </div>
            </div>
          </div>

          {/* Why it matters + Example toggles */}
          {(q.why_it_matters || q.example_answer) && (
            <div className="qa-aux">
              {q.why_it_matters && (
                <button
                  onClick={() => setShowWhy(showWhy === currentStep ? null : currentStep)}
                  className="qa-aux-btn"
                >
                  <ShieldAlert size={13} className={showWhy === currentStep ? 'qa-amber' : ''} />
                  Why this matters
                  {showWhy === currentStep ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
              {q.example_answer && (
                <button
                  onClick={() => setShowExample(showExample === currentStep ? null : currentStep)}
                  className="qa-aux-btn"
                >
                  <Eye size={13} className={showExample === currentStep ? 'qa-blue' : ''} />
                  See example answer
                  {showExample === currentStep ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
          )}

          {/* Expandable panels */}
          {showWhy === currentStep && q.why_it_matters && (
            <div className="qa-panel qa-panel-amber qa-fade">
              <div className="qa-panel-ico"><ShieldAlert size={14} /></div>
              <div>
                <p className="qa-panel-label">Patent impact</p>
                <p className="qa-panel-text">{q.why_it_matters}</p>
              </div>
            </div>
          )}

          {showExample === currentStep && q.example_answer && (
            <div className="qa-panel qa-panel-blue qa-fade">
              <div className="qa-panel-ico"><Lightbulb size={14} /></div>
              <div>
                <p className="qa-panel-label">Example of a strong answer</p>
                <p className="qa-panel-text qa-italic">"{q.example_answer}"</p>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="qa-field">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => updateAnswer(e.target.value)}
              rows={6}
              placeholder="Be specific — name parts, include numbers, describe how things connect…"
              className="qa-textarea"
            />

            {/* Answer quality indicator */}
            <div className="qa-quality">
              <div className="qa-q-track">
                <div className="qa-q-fill" style={{ width: `${quality.percent}%`, background: quality.bg }} />
              </div>
              <div className="qa-q-meta">
                <CircleDot size={10} style={{ color: quality.color }} />
                <span className="qa-q-label" style={{ color: quality.color }}>{quality.label}</span>
              </div>
            </div>

            {answer.trim().length > 0 && answer.trim().length < GOOD_ANSWER_CHARS && answer.trim().length >= MIN_ANSWER_CHARS && (
              <div className="qa-hint">
                <Lightbulb size={12} />
                <span>More detail here means stronger claims. Try adding part names, measurements, or specific steps.</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="qa-err-wrap">
              <div className="qa-err">
                <HelpCircle size={14} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="qa-nav">
            <button onClick={goPrev} disabled={currentStep === 0} className="qa-nav-prev">
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="qa-nav-right">
              {currentStep === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allAnswered}
                  className="qa-btn qa-btn-brass qa-btn-lg"
                >
                  {submitting ? (
                    <><Loader2 size={16} className="qa-spin" /> Drafting your patent…</>
                  ) : (
                    <><Sparkles size={16} /> Generate patent application</>
                  )}
                </button>
              ) : (
                <button onClick={goNext} className="qa-btn qa-btn-brass">
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick review panel - shown when on last question and all answered */}
        {allAnswered && currentStep === questions.length - 1 && (
          <div className="qa-card qa-fade">
            <div className="qa-review-head">
              <div className="qa-review-ico"><CheckCircle size={16} /></div>
              <div>
                <p className="qa-review-title">Ready to generate</p>
                <p className="qa-review-sub">Review your answers below, then hit generate</p>
              </div>
            </div>
            <div className="qa-review-list">
              {questions.map((qq, i) => {
                const qAccent = accentOf(qq.category);
                const aq = getAnswerQuality(answers[i]);
                return (
                  <button key={i} onClick={() => goToStep(i)} className="qa-review-item">
                    <span className="qa-review-num" style={tint(qAccent)}>{i + 1}</span>
                    <div className="qa-review-body">
                      <p className="qa-review-q">{qq.question}</p>
                      <p className="qa-review-a">{answers[i]}</p>
                      <span className="qa-review-qual" style={{ color: aq.color }}>{aq.label}</span>
                    </div>
                    <ChevronRight size={14} className="qa-review-chev" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Scoped styles. Shares the ClaimSense token set with the other screens. */
const CSS = `
.qa-root{
  --qa-card:var(--bg-elevated);--qa-card-2:var(--bg-secondary);
  --qa-line:#27324C;--qa-line-soft:#1A2236;
  --qa-blueprint:var(--blueprint);--qa-brass:var(--accent-primary);
  --qa-text:var(--text-primary);--qa-text-2:var(--text-secondary);--qa-text-3:var(--text-muted);
  --qa-novel:var(--success);--qa-risk:var(--warning);--qa-danger:var(--error);
  --qa-sans:var(--font-sans);--qa-serif:var(--font-serif);--qa-mono:var(--font-mono);
  font-family:var(--qa-sans);color:var(--qa-text);-webkit-font-smoothing:antialiased;
}
.qa-root *{box-sizing:border-box}
.qa-wrap{max-width:760px;margin:0 auto;padding:40px 24px 60px}
.qa-amber{color:var(--qa-risk)!important}
.qa-blue{color:var(--qa-blueprint)!important}

.qa-progress{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.qa-progress-track{position:relative;flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
.qa-progress-fill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--qa-blueprint),var(--qa-novel));border-radius:3px;transition:width .5s ease}
.qa-progress-count{font-family:var(--qa-mono);font-size:11px;letter-spacing:.5px;color:var(--qa-text-3);flex-shrink:0}

.qa-steps{display:flex;align-items:center;gap:7px;margin-bottom:30px;overflow-x:auto;padding-bottom:4px}
.qa-step{display:grid;place-items:center;flex-shrink:0;border-radius:10px;border:1px solid;cursor:pointer;transition:.2s;background:transparent}
.qa-step-cur{width:40px;height:40px}
.qa-step-done{width:32px;height:32px;background:#6FCB9718;border-color:#6FCB9740;color:var(--qa-novel)}
.qa-step-done:hover{background:#6FCB9728}
.qa-step-todo{width:32px;height:32px;background:#ffffff05;border-color:var(--qa-line-soft)}
.qa-step-todo:hover{background:#ffffff0a}
.qa-step-num{font-family:var(--qa-mono);font-size:12px;font-weight:700;color:var(--qa-text-3)}

.qa-card{background:var(--qa-card);border:1px solid var(--qa-line-soft);border-radius:13px;overflow:hidden;margin-bottom:22px}

.qa-qhead{padding:22px 24px;border-bottom:1px solid var(--qa-line-soft)}
.qa-qhead-row{display:flex;align-items:flex-start;gap:16px}
.qa-qnum{width:48px;height:48px;border-radius:12px;border:1px solid;display:grid;place-items:center;flex-shrink:0;font-family:var(--qa-serif);font-size:20px;font-weight:600}
.qa-qhead-main{flex:1;min-width:0}
.qa-qmeta{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.qa-badge{font-family:var(--qa-mono);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 9px;border-radius:6px;border:1px solid}
.qa-qcount{font-family:var(--qa-mono);font-size:11px;letter-spacing:.3px;color:var(--qa-text-3)}
.qa-question{font-family:var(--qa-serif);font-size:19px;font-weight:500;line-height:1.4;color:#fff;margin:0}

.qa-aux{padding:11px 24px;background:#ffffff02;border-bottom:1px solid var(--qa-line-soft);display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.qa-aux-btn{display:inline-flex;align-items:center;gap:6px;background:0;border:0;font-family:var(--qa-mono);font-size:11px;letter-spacing:.3px;text-transform:uppercase;color:var(--qa-text-2);cursor:pointer;padding:3px 0;transition:.15s}
.qa-aux-btn:hover{color:#fff}

.qa-panel{display:flex;align-items:flex-start;gap:13px;padding:16px 24px;border-bottom:1px solid}
.qa-panel-amber{background:#E6C1700a;border-color:#E6C17017}
.qa-panel-amber .qa-panel-ico{background:#E6C17018;color:var(--qa-risk)}
.qa-panel-amber .qa-panel-label{color:var(--qa-risk)}
.qa-panel-blue{background:#8FB0E60a;border-color:#8FB0E617}
.qa-panel-blue .qa-panel-ico{background:#8FB0E618;color:var(--qa-blueprint)}
.qa-panel-blue .qa-panel-label{color:var(--qa-blueprint)}
.qa-panel-ico{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.qa-panel-label{font-family:var(--qa-mono);font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 5px}
.qa-panel-text{font-size:14px;line-height:1.6;color:var(--qa-text);margin:0}
.qa-italic{font-style:italic;font-family:var(--qa-serif)}

.qa-field{padding:24px}
.qa-textarea{width:100%;font-family:var(--qa-sans);font-size:14.5px;line-height:1.6;color:var(--qa-text);background:var(--qa-card-2);border:1px solid var(--qa-line-soft);border-radius:10px;padding:14px 16px;outline:0;resize:none;transition:.16s}
.qa-textarea::placeholder{color:var(--qa-text-3)}
.qa-textarea:hover{border-color:var(--qa-line)}
.qa-textarea:focus{border-color:var(--qa-brass);box-shadow:0 0 0 3px #c9a45c2b}

.qa-quality{margin-top:13px;display:flex;align-items:center;gap:13px}
.qa-q-track{flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
.qa-q-fill{height:100%;border-radius:3px;transition:width .3s ease}
.qa-q-meta{display:flex;align-items:center;gap:7px;flex-shrink:0}
.qa-q-label{font-family:var(--qa-mono);font-size:11px;font-weight:500;letter-spacing:.3px}

.qa-hint{margin-top:13px;display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.5;color:var(--qa-text-3)}
.qa-hint svg{color:var(--qa-risk);margin-top:2px;flex-shrink:0;opacity:.7}

.qa-err-wrap{padding:0 24px 16px}
.qa-err{display:flex;align-items:flex-start;gap:9px;padding:10px 13px;border-radius:9px;background:#C5564B17;border:1px solid #C5564B40;color:var(--qa-danger);font-size:13px}
.qa-err svg{flex-shrink:0;margin-top:1px}

.qa-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#ffffff03;border-top:1px solid var(--qa-line-soft)}
.qa-nav-prev{display:inline-flex;align-items:center;gap:6px;background:0;border:0;font-family:var(--qa-sans);font-size:13.5px;font-weight:500;color:var(--qa-text-2);cursor:pointer;transition:.15s}
.qa-nav-prev:hover:not(:disabled){color:#fff}
.qa-nav-prev:disabled{opacity:.3;cursor:not-allowed}
.qa-nav-right{display:flex;align-items:center;gap:12px}

.qa-btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--qa-sans);font-size:13.5px;font-weight:600;border-radius:10px;padding:11px 20px;cursor:pointer;border:1px solid;transition:.16s}
.qa-btn:disabled{opacity:.5;cursor:not-allowed}
.qa-btn-lg{padding:12px 24px}
.qa-btn-brass{background:var(--qa-brass);border-color:var(--qa-brass);color:#1a1206;box-shadow:0 4px 16px #c9a45c26}
.qa-btn-brass:hover:not(:disabled){background:#d6b46e}

.qa-review-head{display:flex;align-items:center;gap:13px;padding:16px 20px;border-bottom:1px solid var(--qa-line-soft);background:#6FCB9709}
.qa-review-ico{width:36px;height:36px;border-radius:11px;background:#6FCB9718;border:1px solid #6FCB9740;color:var(--qa-novel);display:grid;place-items:center;flex-shrink:0}
.qa-review-title{font-size:13.5px;font-weight:600;color:#fff;margin:0}
.qa-review-sub{font-size:12px;color:var(--qa-text-3);margin:2px 0 0}
.qa-review-list{max-height:320px;overflow-y:auto}
.qa-review-item{width:100%;text-align:left;display:flex;align-items:flex-start;gap:12px;padding:14px 20px;background:0;border:0;border-top:1px solid #ffffff08;cursor:pointer;transition:.15s}
.qa-review-list .qa-review-item:first-child{border-top:0}
.qa-review-item:hover{background:#ffffff05}
.qa-review-num{width:24px;height:24px;border-radius:7px;border:1px solid;display:grid;place-items:center;font-family:var(--qa-mono);font-size:10px;font-weight:700;flex-shrink:0;margin-top:2px}
.qa-review-body{flex:1;min-width:0}
.qa-review-q{font-size:12px;color:var(--qa-text-3);margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qa-review-a{font-size:13.5px;line-height:1.5;color:var(--qa-text);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.qa-review-qual{font-family:var(--qa-mono);font-size:10px;letter-spacing:.3px;margin-top:5px;display:inline-block}
.qa-review-chev{color:var(--qa-text-3);flex-shrink:0;margin-top:3px}

.qa-spin{animation:qa-sp .7s linear infinite}
@keyframes qa-sp{to{transform:rotate(360deg)}}
.qa-fade{animation:qa-fade .3s ease}
@keyframes qa-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
`;
