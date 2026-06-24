import { useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, ChevronDown, ChevronUp, FileText, Scale, BookOpen, List, AlignLeft, Layers, Download, RotateCcw, CreditCard as Edit3, Save, X, FileDown, AlertTriangle, ExternalLink, Search, Zap, Loader2, Wand2, ChevronRight, BookMarked, TrendingUp, Users, Ligature as FileSignature, MessageSquareText, Briefcase } from 'lucide-react';
import { PatentDraft, PatentSession, InventorDeclaration, supabase } from '../lib/supabase';
import { analyzeClaimScope, ClaimScopeAnalysis, refineClaim, translateClaimsToPlainEnglish, ClaimPlainEnglish, patentabilityCheck, PatentabilityCheck } from '../lib/api';
import ClaimsTree from './ClaimsTree';

type Props = {
  session: PatentSession;
  draft: PatentDraft;
  onReAnswer: () => void;
  onDraftUpdate?: (draft: PatentDraft) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  onHeaderRight?: (node: ReactNode) => void;
  onHeaderTabs?: (node: ReactNode) => void;
};

type Section = {
  id: string;
  label: string;
  icon: React.ElementType;
  content: string;
};

function CopyButton({ text, label, onCopy }: { text: string; label?: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
        copied
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {label && (copied ? 'Copied' : label)}
    </button>
  );
}

function EditableSectionPanel({
  section,
  defaultOpen = false,
  onUpdate,
  isEditing,
  onToggleEdit,
}: {
  section: Section;
  defaultOpen?: boolean;
  onUpdate: (content: string) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [localContent, setLocalContent] = useState(section.content);
  const [saving, setSaving] = useState(false);
  const Icon = section.icon;

  const isAbstract = section.id === 'abstract_text';
  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
  const abstractLimit = 150;
  const isOverLimit = isAbstract && wordCount > abstractLimit;

  useEffect(() => {
    setLocalContent(section.content);
  }, [section.content]);

  const handleSave = useCallback(() => {
    if (localContent === section.content) {
      onToggleEdit();
      return;
    }
    setSaving(true);
    onUpdate(localContent);
    setTimeout(() => {
      setSaving(false);
      onToggleEdit();
    }, 300);
  }, [localContent, section.content, onUpdate, onToggleEdit]);

  const handleCancel = () => {
    setLocalContent(section.content);
    onToggleEdit();
  };

  return (
    <div className={`bg-slate-900/40 border rounded-xl overflow-hidden transition-all ${
      isEditing ? 'border-sky-500/30' : 'border-slate-800/50'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isEditing ? 'bg-sky-500/20' : 'bg-slate-800/80'
          }`}>
            <Icon size={14} className={isEditing ? 'text-sky-400' : 'text-slate-400'} />
          </div>
          <span className="text-white font-medium text-sm">{section.label}</span>
          {isEditing && (
            <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Editing
            </span>
          )}
          {isAbstract && !isEditing && !open && (
            <span className={`text-xs ${isOverLimit ? 'text-amber-400' : 'text-slate-500'}`}>
              {wordCount} words
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && <CopyButton text={section.content} />}
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className={`px-5 pb-5 border-t ${isEditing ? 'border-sky-500/20' : 'border-slate-800/50'}`}>
          {isAbstract && !isEditing && (
            <div className={`mt-4 mb-3 px-4 py-3 rounded-xl ${isOverLimit ? 'bg-amber-950/30 border border-amber-900/40' : 'bg-slate-800/40'}`}>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Word Count</span>
                <span className={`text-sm font-semibold ${isOverLimit ? 'text-amber-400' : 'text-slate-300'}`}>
                  {wordCount} / {abstractLimit} words
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-amber-500' : 'bg-sky-500'}`}
                  style={{ width: `${Math.min(100, (wordCount / abstractLimit) * 100)}%` }}
                />
              </div>
              {isOverLimit && (
                <p className="text-amber-400/80 text-xs mt-2">
                  Abstracts over {abstractLimit} words may be flagged by the USPTO. Consider trimming.
                </p>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="mt-4">
              <textarea
                value={localContent}
                onChange={e => setLocalContent(e.target.value)}
                rows={12}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 text-sm leading-[1.8] font-serif resize-none focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs">{localContent.length} characters</span>
                  {isAbstract && (
                    <span className={`text-xs font-medium ${isOverLimit ? 'text-amber-400' : wordCount > abstractLimit * 0.8 ? 'text-slate-400' : 'text-slate-600'}`}>
                      {wordCount} words {isOverLimit && `(${wordCount - abstractLimit} over limit)`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-slate-300 text-sm leading-[1.8] whitespace-pre-wrap font-serif">
              {section.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const REFINE_PRESETS = [
  { label: 'Make Broader', instruction: 'Make this claim broader by removing overly specific limitations. Use functional language where possible to maximize coverage without losing validity.', color: 'emerald' },
  { label: 'Make Narrower', instruction: 'Make this claim narrower by adding specific structural or functional limitations to improve defensibility against prior art.', color: 'amber' },
  { label: 'Add Method Variant', instruction: 'Create a method claim version of this claim that covers the same inventive concept but as a process or method of operation.', color: 'sky' },
  { label: 'Improve Language', instruction: 'Improve the patent claim language for clarity and USPTO compliance: fix antecedent basis, tighten transitions, ensure single-sentence format.', color: 'slate' },
] as const;

function ClaimCard({
  claim,
  allClaims,
  sessionTitle,
  onUpdate,
  isEditing,
  onToggleEdit,
}: {
  claim: { number: number; type: string; depends_on?: number; text: string };
  allClaims: Array<{ number: number; text: string }>;
  sessionTitle: string;
  onUpdate: (text: string) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const [localText, setLocalText] = useState(claim.text);
  const [saving, setSaving] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refinedPreview, setRefinedPreview] = useState<{ text: string; explanation: string } | null>(null);
  const [refineError, setRefineError] = useState('');

  useEffect(() => {
    setLocalText(claim.text);
    setRefinedPreview(null);
    setShowRefine(false);
  }, [claim.text]);

  const handleSave = () => {
    if (localText === claim.text) {
      onToggleEdit();
      return;
    }
    setSaving(true);
    onUpdate(localText);
    setTimeout(() => {
      setSaving(false);
      onToggleEdit();
    }, 300);
  };

  async function handleRefine(instruction: string) {
    setRefining(true);
    setRefineError('');
    setRefinedPreview(null);
    try {
      const result = await refineClaim(claim.number, claim.text, instruction, allClaims, sessionTitle);
      setRefinedPreview({ text: result.refined_text, explanation: result.explanation });
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setRefining(false);
    }
  }

  function acceptRefined() {
    if (!refinedPreview) return;
    onUpdate(refinedPreview.text);
    setRefinedPreview(null);
    setShowRefine(false);
  }

  const isIndependent = claim.type === 'independent';

  return (
    <div className={`rounded-xl transition-all ${
      isEditing
        ? 'bg-sky-950/30 border border-sky-500/30'
        : showRefine
          ? 'bg-slate-900/60 border border-slate-700/60'
          : isIndependent
            ? 'bg-slate-900/40 border border-sky-500/10 hover:border-sky-500/20'
            : 'bg-slate-900/30 border border-slate-800/50 hover:border-slate-700/50'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              isEditing
                ? 'bg-sky-500/20 text-sky-400'
                : isIndependent
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'bg-slate-800/80 text-slate-400'
            }`}>
              {claim.number}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
              isIndependent
                ? 'text-sky-400 bg-sky-400/10'
                : 'text-slate-500 bg-slate-800/80'
            }`}>
              {isIndependent ? 'Independent' : `Depends on Claim ${claim.depends_on}`}
            </span>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowRefine(!showRefine); setRefinedPreview(null); setRefineError(''); }}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                  showRefine
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <Wand2 size={12} />
                Refine
              </button>
              <button
                onClick={onToggleEdit}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
              >
                <Edit3 size={12} />
                Edit
              </button>
              <CopyButton text={`${claim.number}. ${claim.text}`} label="Copy" />
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={localText}
              onChange={e => setLocalText(e.target.value)}
              rows={4}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 text-sm leading-[1.8] font-serif resize-none focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-slate-600 text-xs">{localText.split(/\s+/).length} words</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setLocalText(claim.text); onToggleEdit(); }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-200 text-sm leading-[1.8] font-serif pl-[42px]">{claim.text}</p>
        )}
      </div>

      {/* AI Refinement Panel */}
      {showRefine && !isEditing && (
        <div className="border-t border-slate-700/40 px-5 pb-5 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 size={13} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Refinement</span>
          </div>

          {!refinedPreview && !refining && (
            <div className="grid grid-cols-2 gap-2">
              {REFINE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleRefine(preset.instruction)}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg text-left transition-all group"
                >
                  <span className="text-slate-300 text-xs font-medium">{preset.label}</span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {refining && (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Loader2 size={16} className="text-emerald-400 animate-spin" />
              <span className="text-slate-400 text-sm">Rewriting claim with your instructions...</span>
            </div>
          )}

          {refineError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-950/30 border border-red-900/40 rounded-xl">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300 text-xs">{refineError}</span>
            </div>
          )}

          {refinedPreview && (
            <div className="space-y-3">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Refined Claim</div>
                <p className="text-emerald-100/90 text-sm leading-[1.8] font-serif">{refinedPreview.text}</p>
                <div className="mt-3 pt-3 border-t border-emerald-800/30">
                  <p className="text-emerald-400/70 text-xs italic">{refinedPreview.explanation}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={acceptRefined}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                >
                  <Check size={12} />
                  Apply Change
                </button>
                <button
                  onClick={() => setRefinedPreview(null)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { setRefinedPreview(null); setShowRefine(false); }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X size={12} />
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrintDocument({ title, draft, claims }: { title: string; draft: PatentDraft; claims: Array<{ number: number; type: string; depends_on?: number; text: string }> }) {
  return createPortal(
    <div id="print-container" style={{ display: 'none' }}>
      {/* Cover Page */}
      <div className="print-page">
        <div className="print-header">
          <div className="print-title">{title}</div>
          <div className="print-subtitle">Patent Application Draft</div>
        </div>
        <div style={{ marginTop: '48pt', textAlign: 'center' }}>
          <p style={{ fontSize: '10pt', color: '#666' }}>
            Generated by ClaimStream AI<br />
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ marginTop: '72pt', textAlign: 'center', fontSize: '9pt', color: '#999' }}>
          <p>DISCLAIMER: This document is an AI-generated draft for review by a licensed</p>
          <p>patent practitioner. It does not constitute legal advice.</p>
        </div>
      </div>

      {/* Abstract Page */}
      <div className="print-page">
        <div className="print-section">
          <div className="print-section-title">Abstract</div>
          <div className="print-content">
            <p>{draft.abstract_text}</p>
          </div>
        </div>
      </div>

      {/* Background & Summary */}
      <div className="print-page">
        <div className="print-section">
          <div className="print-section-title">Background of the Invention</div>
          <div className="print-content">
            {draft.background_text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-title">Summary of the Invention</div>
          <div className="print-content">
            {draft.summary_text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>

      {/* Drawings */}
      <div className="print-page">
        <div className="print-section">
          <div className="print-section-title">Brief Description of the Drawings</div>
          <div className="print-content">
            {draft.brief_drawings_text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>

      {/* Detailed Description */}
      <div className="print-page">
        <div className="print-section">
          <div className="print-section-title">Detailed Description</div>
          <div className="print-content">
            {draft.detailed_description_text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>

      {/* Claims */}
      <div className="print-page">
        <div className="print-section">
          <div className="print-section-title">Claims</div>
          <div style={{ marginTop: '16pt' }}>
            {claims.map(claim => (
              <div key={claim.number} className="print-claim">
                <span className="print-claim-number">{claim.number}.</span> {claim.text}
              </div>
            ))}
          </div>
        </div>
        <div className="print-disclaimer">
          <p>This document was generated by ClaimStream AI and is intended for review by a licensed</p>
          <p>patent attorney or agent. It does not constitute legal advice or an offer of legal services.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PatentDraftView({ session, draft, onReAnswer, onDraftUpdate, onShowToast, onHeaderRight, onHeaderTabs }: Props) {
  const [activeTab, setActiveTab] = useState<'claims' | 'sections' | 'handoff'>('claims');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editedDraft, setEditedDraft] = useState<PatentDraft>(draft);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingClaim, setEditingClaim] = useState<number | null>(null);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [scopeAnalysis, setScopeAnalysis] = useState<ClaimScopeAnalysis[] | null>(null);
  const [analyzingScope, setAnalyzingScope] = useState(false);
  const [plainEnglish, setPlainEnglish] = useState<ClaimPlainEnglish[] | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<PatentDraft[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [diffVersion, setDiffVersion] = useState<PatentDraft | null>(null);

  // Inventor declarations
  const [inventors, setInventors] = useState<InventorDeclaration[]>([]);
  const [loadingInventors, setLoadingInventors] = useState(true);

  // Session notes
  const [notes, setNotes] = useState(session.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Handoff export state
  const [handoffCheck, setHandoffCheck] = useState<PatentabilityCheck | null>(null);
  const [loadingHandoffCheck, setLoadingHandoffCheck] = useState(false);

  // Load inventors on mount
  useEffect(() => {
    async function loadInventors() {
      setLoadingInventors(true);
      const { data } = await supabase
        .from('inventor_declarations')
        .select('*')
        .eq('session_id', session.id)
        .order('inventor_order');
      setInventors(data ?? []);
      setLoadingInventors(false);
    }
    loadInventors();
  }, [session.id]);

  async function addInventor() {
    const newOrder = inventors.length + 1;
    const { data } = await supabase
      .from('inventor_declarations')
      .insert({ session_id: session.id, inventor_order: newOrder })
      .select()
      .single();
    if (data) setInventors([...inventors, data]);
  }

  async function updateInventor(id: string, field: keyof InventorDeclaration, value: string) {
    setInventors(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    await supabase
      .from('inventor_declarations')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  async function removeInventor(id: string) {
    await supabase.from('inventor_declarations').delete().eq('id', id);
    setInventors(prev => prev.filter(i => i.id !== id));
  }

  async function saveNotes() {
    setSavingNotes(true);
    await supabase
      .from('patent_sessions')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    setSavingNotes(false);
    onShowToast?.('Notes saved');
  }

  async function generateHandoffPackage() {
    setLoadingHandoffCheck(true);
    try {
      const result = await patentabilityCheck(session.title, session.technical_description);
      setHandoffCheck(result);
    } catch {
      // Use cached null if failed
    } finally {
      setLoadingHandoffCheck(false);
    }
  }

  const title = session.title;
  const allClaims = [...(editedDraft.independent_claims ?? []), ...(editedDraft.dependent_claims ?? [])].sort((a, b) => a.number - b.number);
  const independentClaims = allClaims.filter(c => c.type === 'independent');
  const dependentClaims = allClaims.filter(c => c.type === 'dependent');

  const sections: Section[] = [
    { id: 'abstract_text', label: 'Abstract', icon: FileText, content: editedDraft.abstract_text },
    { id: 'background_text', label: 'Background of the Invention', icon: BookOpen, content: editedDraft.background_text },
    { id: 'summary_text', label: 'Summary of the Invention', icon: AlignLeft, content: editedDraft.summary_text },
    { id: 'brief_drawings_text', label: 'Brief Description of the Drawings', icon: Layers, content: editedDraft.brief_drawings_text },
    { id: 'detailed_description_text', label: 'Detailed Description', icon: List, content: editedDraft.detailed_description_text },
  ].filter(s => s.content?.trim());

  async function updateSection(sectionId: string, content: string) {
    const updated = { ...editedDraft, [sectionId]: content };
    setEditedDraft(updated);

    await supabase
      .from('patent_drafts')
      .update({ [sectionId]: content, updated_at: new Date().toISOString() })
      .eq('id', draft.id);

    onDraftUpdate?.(updated);
  }

  async function updateClaim(claimNumber: number, newText: string) {
    const updatedIndependent = editedDraft.independent_claims.map(c =>
      c.number === claimNumber ? { ...c, text: newText } : c
    );
    const updatedDependent = editedDraft.dependent_claims.map(c =>
      c.number === claimNumber ? { ...c, text: newText } : c
    );

    const allClaimsText = [...updatedIndependent, ...updatedDependent]
      .sort((a, b) => a.number - b.number)
      .map(c => `${c.number}. ${c.text}`)
      .join('\n\n');

    const updated = {
      ...editedDraft,
      independent_claims: updatedIndependent,
      dependent_claims: updatedDependent,
      claims_text: allClaimsText,
    };

    setEditedDraft(updated);

    await supabase
      .from('patent_drafts')
      .update({
        independent_claims: updatedIndependent,
        dependent_claims: updatedDependent,
        claims_text: allClaimsText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id);

    onDraftUpdate?.(updated);
  }

  async function handleAnalyzeScopeClick() {
    setAnalyzingScope(true);
    try {
      const claimsToAnalyze = allClaims.map(c => ({ number: c.number, text: c.text }));
      const analysis = await analyzeClaimScope(claimsToAnalyze);
      setScopeAnalysis(analysis);
    } catch (err) {
      console.error('Scope analysis failed:', err);
    } finally {
      setAnalyzingScope(false);
    }
  }

  async function handleTranslateClaims() {
    setTranslating(true);
    setTranslateError('');
    try {
      const claimsToTranslate = allClaims.map(c => ({ number: c.number, type: c.type, text: c.text }));
      const result = await translateClaimsToPlainEnglish(claimsToTranslate, session.title);
      setPlainEnglish(result);
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  }

  async function handleShowVersionHistory() {
    setShowVersionHistory(true);
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('patent_drafts')
        .select('*')
        .eq('session_id', session.id)
        .order('version', { ascending: false });
      setVersionHistory(data ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }

  function getPriorArtSearchLinks() {
    // Extract keywords from title and independent claims
    const titleWords = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'that', 'this', 'which', 'where', 'when', 'such', 'more', 'less', 'both', 'each', 'every'].includes(w));

    const claimKeywords = independentClaims.flatMap(claim => {
      const text = claim.text.toLowerCase();
      // Extract key noun phrases
      const match = text.match(/(?:comprising|including|having)([^.]+)/i);
      if (match) {
        return match[1].split(/,|\s+and\s+/)
          .map(s => s.trim().replace(/[^a-z0-9\s]/gi, '').trim())
          .filter(s => s && s.length > 4);
      }
      return [];
    }).slice(0, 5);

    // Create search queries
    const searches = [
      {
        label: 'Title Search',
        query: titleWords.slice(0, 5).join(' '),
        description: 'Search by invention title keywords',
      },
      ...claimKeywords.slice(0, 3).map((kw, i) => ({
        label: `Claim Element ${i + 1}`,
        query: `"${kw}"`,
        description: kw.slice(0, 50) + (kw.length > 50 ? '...' : ''),
      })),
    ];

    return searches.map(s => ({
      ...s,
      url: `https://patents.google.com/?q=${encodeURIComponent(s.query)}&status=GRANT&status=PENDING&type=PATENT`,
    }));
  }

  function getFullApplicationText() {
    return [
      `PATENT APPLICATION`,
      '',
      `TITLE: ${title}`,
      '',
      'ABSTRACT',
      editedDraft.abstract_text,
      '',
      'BACKGROUND OF THE INVENTION',
      editedDraft.background_text,
      '',
      'SUMMARY OF THE INVENTION',
      editedDraft.summary_text,
      '',
      'BRIEF DESCRIPTION OF THE DRAWINGS',
      editedDraft.brief_drawings_text,
      '',
      'DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS',
      editedDraft.detailed_description_text,
      '',
      'CLAIMS',
      allClaims.map(c => `${c.number}. ${c.text}`).join('\n\n'),
    ].join('\n');
  }

  function downloadAsText() {
    const text = getFullApplicationText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}_patent_draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderHandoffPackageText(): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('PATENT ATTORNEY HANDOFF PACKAGE');
    lines.push('═'.repeat(60));
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Application: ${title}`);
    lines.push('');

    // Inventors
    lines.push('─'.repeat(60));
    lines.push('INVENTOR DECLARATIONS');
    lines.push('─'.repeat(60));
    if (inventors.length === 0) {
      lines.push('[No inventors declared]');
    } else {
      inventors.forEach((inv, idx) => {
        lines.push('');
        lines.push(`Inventor ${idx + 1}:`);
        lines.push(`  Full Legal Name: ${inv.full_legal_name || '[Not provided]'}`);
        lines.push(`  Citizenship: ${inv.citizenship || '[Not provided]'}`);
        lines.push(`  Address: ${inv.mailing_address || '[Not provided]'}`);
        lines.push(`  City: ${inv.city || '[Not provided]'}`);
        lines.push(`  State/Province: ${inv.state_province || '[Not provided]'}`);
        lines.push(`  Postal Code: ${inv.postal_code || '[Not provided]'}`);
        lines.push(`  Country: ${inv.country || '[Not provided]'}`);
      });
    }
    lines.push('');

    // Patentability check
    if (handoffCheck) {
      lines.push('─'.repeat(60));
      lines.push('PATENTABILITY PRE-CHECK SUMMARY');
      lines.push('─'.repeat(60));
      lines.push('');
      lines.push(`Confidence Score: ${handoffCheck.confidence}/100`);
      lines.push(`Assessment: ${handoffCheck.confidence_label}`);
      lines.push('');
      lines.push(`Summary: ${handoffCheck.summary}`);
      lines.push('');
      lines.push('Novel Aspects:');
      handoffCheck.novel_aspects.forEach(a => lines.push(`  • ${a}`));
      lines.push('');
      lines.push('Risk Factors:');
      handoffCheck.risk_factors.forEach(r => lines.push(`  • ${r}`));
      lines.push('');
      lines.push(`Recommendation: ${handoffCheck.recommendation}`);
      lines.push(`Patent Type: ${handoffCheck.patent_type}`);
      lines.push(`IPC Codes: ${handoffCheck.ipc_codes.join(', ')}`);
      lines.push('');
    }

    // Claims with plain English
    lines.push('─'.repeat(60));
    lines.push('CLAIMS');
    lines.push('─'.repeat(60));
    allClaims.forEach(claim => {
      lines.push('');
      lines.push(`Claim ${claim.number} (${claim.type}${claim.depends_on ? `, depends on ${claim.depends_on}` : ''}):`);
      lines.push(`  ${claim.text}`);
      if (plainEnglish) {
        const pe = plainEnglish.find(p => p.claim_number === claim.number);
        if (pe) {
          lines.push('');
          lines.push(`  Plain-English: ${pe.plain_english}`);
          lines.push(`  Business Value: ${pe.business_value}`);
        }
      }
    });

    // Session notes
    if (notes.trim()) {
      lines.push('');
      lines.push('─'.repeat(60));
      lines.push('SESSION NOTES');
      lines.push('─'.repeat(60));
      lines.push('');
      lines.push(notes);
    }

    // Disclaimer
    lines.push('');
    lines.push('─'.repeat(60));
    lines.push('DISCLAIMER');
    lines.push('─'.repeat(60));
    lines.push('');
    lines.push('This document was generated by ClaimStream AI and is intended for');
    lines.push('review by a licensed patent attorney or agent. It does not');
    lines.push('constitute legal advice or an offer of legal services.');
    lines.push('');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  function downloadHandoffPackage() {
    const text = renderHandoffPackageText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}_handoff_package.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Handoff package downloaded');
  }

  function exportAsPDF() {
    const printContainer = document.getElementById('print-container');
    if (printContainer) {
      printContainer.style.display = 'block';
    }
    window.print();
    if (printContainer) {
      printContainer.style.display = 'none';
    }
  }

  // Hoist header actions and tabs to AppShell
  useEffect(() => {
    onHeaderRight?.(
      <div className="flex items-center gap-1 sm:gap-2">
        {(draft.version ?? 1) > 1 && (
          <button
            onClick={handleShowVersionHistory}
            className="btn btn-ghost text-xs px-2 sm:px-3 py-2 text-blue-400"
            title="View version history"
          >
            <Layers size={13} /> <span className="hidden sm:inline">v{draft.version}</span>
          </button>
        )}
        <button
          onClick={() => setShowReviseModal(true)}
          className="btn btn-ghost text-xs px-2 sm:px-3 py-2 text-amber-400"
          title="Re-answer questions and regenerate"
        >
          <RotateCcw size={13} /> <span className="hidden sm:inline">Revise</span>
        </button>
        <span className="hidden md:contents">
          <CopyButton text={getFullApplicationText()} label="Copy" onCopy={() => onShowToast?.('Application copied to clipboard')} />
          <button onClick={downloadAsText} className="btn btn-ghost text-xs px-3 py-2">
            <Download size={13} /> TXT
          </button>
          <button onClick={exportAsPDF} className="btn btn-ghost text-xs px-3 py-2">
            <FileDown size={13} /> PDF
          </button>
        </span>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.version, allClaims.length, editedDraft]);

  useEffect(() => {
    onHeaderTabs?.(
      <>
        {[
          { id: 'claims', label: 'Claims', badge: allClaims.length },
          { id: 'sections', label: 'Specification', badge: sections.length },
          { id: 'handoff', label: 'Handoff', badge: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as 'claims' | 'sections' | 'handoff')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
              activeTab === t.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.badge !== null && (
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                activeTab === t.id ? 'bg-blue-500/15 text-blue-400' : 'bg-white/[0.04] text-slate-500'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, allClaims.length, sections.length]);

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const showOutline = activeTab === 'claims' || activeTab === 'sections';

  return (
    <>
      <PrintDocument title={title} draft={editedDraft} claims={allClaims} />
      <div>
        <div className={`mx-auto px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ${showOutline ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className={`${showOutline ? 'lg:flex lg:gap-6' : ''}`}>

            {/* Collapsible outline sidebar */}
            {showOutline && (
              <div className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-10'}`}>
                <div className="sticky top-20">
                  <div className={`${sidebarOpen ? 'w-56' : 'w-10'} transition-all duration-300`}>
                    {/* Toggle button */}
                    <button
                      onClick={() => setSidebarOpen(o => !o)}
                      className="mb-3 w-10 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
                      title={sidebarOpen ? 'Collapse outline' : 'Expand outline'}
                    >
                      <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {sidebarOpen && (
                      <div className="card overflow-hidden animate-fade-in">
                        <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {activeTab === 'claims' ? 'Claims Outline' : 'Sections'}
                          </span>
                        </div>
                        <nav className="p-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                          {activeTab === 'claims' && (
                            <div className="space-y-0.5">
                              {independentClaims.map(c => (
                                <div key={c.number}>
                                  <button
                                    onClick={() => scrollToId(`claim-${c.number}`)}
                                    className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">{c.number}</span>
                                      <span className="text-[11px] leading-tight truncate text-slate-400 group-hover:text-slate-200">
                                        {c.text.slice(0, 32)}{c.text.length > 32 ? '…' : ''}
                                      </span>
                                    </div>
                                  </button>
                                  {allClaims.filter(d => d.type === 'dependent' && d.depends_on === c.number).map(dep => (
                                    <button
                                      key={dep.number}
                                      onClick={() => scrollToId(`claim-${dep.number}`)}
                                      className="w-full text-left pl-7 pr-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all text-[11px]"
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded bg-white/[0.04] border border-white/[0.06] inline-flex items-center justify-center text-[9px] font-bold text-slate-500">{dep.number}</span>
                                        <span className="truncate leading-tight">{dep.text.slice(0, 24)}…</span>
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          {activeTab === 'sections' && (
                            <div className="space-y-0.5">
                              {sections.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => scrollToId(`section-${s.id}`)}
                                  className="w-full text-left px-2.5 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all group"
                                >
                                  <div className="flex items-start gap-2">
                                    <s.icon size={12} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                                    <span className="text-[11px] leading-tight">{s.label}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </nav>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main content */}
            <div className="flex-1 min-w-0">

          {activeTab === 'claims' && (
            <div className="space-y-6">
              {/* Disclaimer */}
              <div className="card px-5 py-4 flex gap-4 bg-amber-500/5 border-amber-500/20">
                <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Scale size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-300 text-sm font-semibold mb-1">Review Before Filing</p>
                  <p className="text-amber-400/70 text-xs leading-relaxed">
                    These are AI-generated drafts to accelerate your workflow -- not legal advice. A licensed patent practitioner should review all claims before filing.
                  </p>
                </div>
              </div>

              {/* Claims Tree Visualization */}
              <ClaimsTree claims={allClaims} onViewClaim={(num) => setEditingClaim(num)} />

              {/* Independent Claims */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Independent Claims</h2>
                </div>
                <div className="space-y-3">
                  {independentClaims.map(claim => (
                    <div key={claim.number} id={`claim-${claim.number}`} className="scroll-mt-20">
                      <ClaimCard
                        claim={claim}
                        allClaims={allClaims}
                        sessionTitle={session.title}
                        onUpdate={(text) => updateClaim(claim.number, text)}
                        isEditing={editingClaim === claim.number}
                        onToggleEdit={() => setEditingClaim(editingClaim === claim.number ? null : claim.number)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dependent Claims */}
              {dependentClaims.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dependent Claims</h2>
                  </div>
                  <div className="space-y-2.5">
                    {dependentClaims.map(claim => (
                      <div key={claim.number} id={`claim-${claim.number}`} className="scroll-mt-20">
                        <ClaimCard
                          claim={claim}
                          allClaims={allClaims}
                          sessionTitle={session.title}
                          onUpdate={(text) => updateClaim(claim.number, text)}
                          isEditing={editingClaim === claim.number}
                          onToggleEdit={() => setEditingClaim(editingClaim === claim.number ? null : claim.number)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plain-English Translation */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02] border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center">
                      <BookMarked size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Plain-English Translation</div>
                      <div className="text-slate-500 text-xs">What competitors can and cannot do, in everyday language</div>
                    </div>
                  </div>
                  <button
                    onClick={handleTranslateClaims}
                    disabled={translating}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white transition-all border border-slate-700/50"
                  >
                    {translating ? (
                      <><Loader2 size={12} className="animate-spin" /> Translating...</>
                    ) : plainEnglish ? (
                      <><BookMarked size={12} /> Re-translate</>
                    ) : (
                      <><BookMarked size={12} /> Translate Claims</>
                    )}
                  </button>
                </div>

                {translateError && (
                  <div className="px-5 py-3 border-t border-slate-800/50 bg-red-950/20">
                    <p className="text-red-400 text-xs flex items-center gap-2">
                      <AlertTriangle size={12} />
                      {translateError}
                    </p>
                  </div>
                )}

                {translating && (
                  <div className="px-5 py-6 border-t border-slate-800/50 flex items-center justify-center gap-3">
                    <Loader2 size={16} className="text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-sm">Converting legal language to plain English...</span>
                  </div>
                )}

                {plainEnglish && !translating && (
                  <div className="border-t border-slate-800/50 divide-y divide-slate-800/40">
                    {plainEnglish.map(t => {
                      const bvColor = t.business_value === 'HIGH'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : t.business_value === 'MEDIUM'
                          ? 'text-sky-400 bg-sky-500/10'
                          : 'text-slate-400 bg-slate-800/60';
                      const claimMeta = allClaims.find(c => c.number === t.claim_number);
                      return (
                        <div key={t.claim_number} className="px-5 py-4">
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                              {t.claim_number}
                            </span>
                            <span className="text-xs text-slate-500">
                              {claimMeta?.type === 'independent' ? 'Independent' : `Depends on Claim ${claimMeta?.depends_on}`}
                            </span>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${bvColor}`}>
                              {t.business_value} value
                            </span>
                          </div>
                          <p className="text-slate-200 text-sm leading-relaxed mb-2">{t.plain_english}</p>
                          <div className="flex items-start gap-2">
                            <TrendingUp size={12} className="text-slate-500 mt-0.5 shrink-0" />
                            <p className="text-slate-500 text-xs italic">{t.business_value_reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!plainEnglish && !translating && !translateError && (
                  <div className="px-5 py-4 border-t border-slate-800/50">
                    <p className="text-slate-600 text-xs text-center">
                      Get a plain-language breakdown of what each claim protects and its commercial significance.
                    </p>
                  </div>
                )}
              </div>

              {/* Claim Scope Analyzer */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02] border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Zap size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Claim Scope Analysis</div>
                      <div className="text-slate-500 text-xs">Find weak spots and get suggestions to strengthen each claim</div>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyzeScopeClick}
                    disabled={analyzingScope}
                    className="btn px-4 py-2 text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
                  >
                    {analyzingScope ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap size={12} />
                        Analyze
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5">
                  {scopeAnalysis && scopeAnalysis.length > 0 ? (
                    <div className="space-y-4">
                      {scopeAnalysis.map(analysis => (
                        <div key={analysis.claim_number} className="card">
                          <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium text-sm">Claim {analysis.claim_number}</span>
                              <span className={`badge ${
                                analysis.scope === 'BROAD' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                                analysis.scope === 'MEDIUM' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                                'bg-amber-500/15 text-amber-400 border-amber-500/20'
                              }`}>
                                {analysis.scope}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs">{analysis.rationale}</p>
                          </div>
                          <div className="px-5 py-4 space-y-3">
                            <div>
                              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Strengths</span>
                              <ul className="mt-2 space-y-1.5">
                                {analysis.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {analysis.vulnerabilities.length > 0 && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vulnerabilities</span>
                                <ul className="mt-2 space-y-1.5">
                                  {analysis.vulnerabilities.map((v, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                      {v}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="card bg-blue-500/5 border-blue-500/20 px-4 py-3">
                              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Suggestion</span>
                              <p className="text-blue-300/80 text-xs mt-1.5 leading-relaxed">{analysis.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap size={20} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Analyze your claims to understand their scope and strength</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prior Art Search Links */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center">
                      <Search size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <span className="text-white font-medium text-sm">Prior Art Research</span>
                      <p className="text-slate-500 text-xs mt-0.5">Prior art references cited during drafting</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-2.5">
                  {getPriorArtSearchLinks().map((search, i) => (
                    <a
                      key={i}
                      href={search.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-blue-500/20 rounded-xl transition-all group"
                    >
                      <div className="min-w-0">
                        <span className="text-white text-sm font-medium">{search.label}</span>
                        <p className="text-slate-500 text-xs truncate">{search.description}</p>
                      </div>
                      <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 ml-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-2.5">
              {sections.map((section, i) => (
                <div key={section.id} id={`section-${section.id}`} className="scroll-mt-20">
                  <EditableSectionPanel
                    section={section}
                    defaultOpen={i === 0}
                    onUpdate={(content) => updateSection(section.id, content)}
                    isEditing={editingSection === section.id}
                    onToggleEdit={() => setEditingSection(editingSection === section.id ? null : section.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'handoff' && (
            <div className="space-y-6">
              {/* Handoff intro */}
              <div className="card p-6 bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-500/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0">
                    <Briefcase size={22} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">Attorney Handoff Package</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Bundle everything your attorney needs: inventor declarations, plain-English claim summaries, and the full draft -- ready to download and send.
                    </p>
                  </div>
                </div>
              </div>

              {/* Inventor Declarations */}
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800/80 rounded-lg flex items-center justify-center">
                      <Users size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Inventor Declarations</div>
                      <div className="text-slate-500 text-xs">Add each inventor's name and address for the filing</div>
                    </div>
                  </div>
                  <button
                    onClick={addInventor}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all"
                  >
                    + Add Inventor
                  </button>
                </div>

                {loadingInventors ? (
                  <div className="px-5 py-6 flex items-center justify-center gap-3">
                    <Loader2 size={16} className="text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-sm">Loading...</span>
                  </div>
                ) : inventors.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Users size={24} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm mb-3">No inventors added yet</p>
                    <button
                      onClick={addInventor}
                      className="text-sky-400 text-sm font-medium hover:text-sky-300"
                    >
                      Add the first inventor
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {inventors.map((inv, idx) => (
                      <div key={inv.id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            Inventor {idx + 1}
                          </span>
                          <button
                            onClick={() => removeInventor(inv.id)}
                            className="text-slate-600 hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={inv.full_legal_name}
                            onChange={e => updateInventor(inv.id, 'full_legal_name', e.target.value)}
                            placeholder="Full Legal Name"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.citizenship}
                            onChange={e => updateInventor(inv.id, 'citizenship', e.target.value)}
                            placeholder="Citizenship"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.mailing_address}
                            onChange={e => updateInventor(inv.id, 'mailing_address', e.target.value)}
                            placeholder="Street Address"
                            className="col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.city}
                            onChange={e => updateInventor(inv.id, 'city', e.target.value)}
                            placeholder="City"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.state_province}
                            onChange={e => updateInventor(inv.id, 'state_province', e.target.value)}
                            placeholder="State / Province"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.postal_code}
                            onChange={e => updateInventor(inv.id, 'postal_code', e.target.value)}
                            placeholder="Postal Code"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                          <input
                            type="text"
                            value={inv.country}
                            onChange={e => updateInventor(inv.id, 'country', e.target.value)}
                            placeholder="Country"
                            className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Session Notes */}
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800/80 rounded-lg flex items-center justify-center">
                      <MessageSquareText size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Session Notes</div>
                      <div className="text-slate-500 text-xs">Keep track of attorney feedback, decisions, and open questions</div>
                    </div>
                  </div>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-all"
                  >
                    {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div className="p-5">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={6}
                    placeholder="Add notes for your attorney or future reference. Example: 'Attorney suggested narrowing claim 3 to specify the worm gear mechanism...'"
                    className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3.5 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/50 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Generate Handoff */}
              <button
                onClick={generateHandoffPackage}
                disabled={loadingHandoffCheck}
                className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold py-4 rounded-xl transition-all"
              >
                {loadingHandoffCheck ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Package...
                  </>
                ) : (
                  <>
                    <FileSignature size={18} />
                    Generate Handoff Package
                  </>
                )}
              </button>

              {/* Handoff Preview Area */}
              {handoffCheck && (
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Package Preview</span>
                    <button
                      onClick={() => downloadHandoffPackage()}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all"
                    >
                      <Download size={13} />
                      Download TXT
                    </button>
                  </div>
                  <div className="p-5 max-h-96 overflow-y-auto">
                    <pre className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                      {renderHandoffPackageText()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

            </div>{/* end flex-1 main content */}
          </div>{/* end flex container */}
        </div>
      </div>

      {/* Revise Confirmation Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-md w-full shadow-2xl animate-slide-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold mb-1.5">Return to Q&A and Re-Draft?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    You'll go back to the clarification questions to update your answers. A new draft version will be generated -- your current version is saved and can be restored from version history.
                  </p>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 mb-6">
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-500">Application:</span>{' '}
                  <span className="font-medium">{title}</span>
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowReviseModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowReviseModal(false);
                    onReAnswer();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all"
                >
                  <RotateCcw size={14} />
                  Continue to Q&A
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && !diffVersion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-lg w-full shadow-2xl animate-slide-in max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <div>
                <h3 className="text-white text-base font-bold">Version History</h3>
                <p className="text-slate-500 text-xs mt-0.5">See how your draft evolved across revisions</p>
              </div>
              <button onClick={() => setShowVersionHistory(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 size={18} className="text-slate-500 animate-spin" />
                  <span className="text-slate-500 text-sm">Loading history...</span>
                </div>
              ) : versionHistory.length <= 1 ? (
                <div className="text-center py-10">
                  <Layers size={24} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">This is your first version. Each time you revise and regenerate, previous versions are saved here for comparison.</p>
                </div>
              ) : (
                versionHistory.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                      v.is_current
                        ? 'bg-sky-950/40 border-sky-700/40'
                        : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-white text-sm font-semibold">Version {v.version}</span>
                        {v.is_current && (
                          <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md uppercase tracking-wider">Current</span>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!v.is_current && (
                      <button
                        onClick={() => setDiffVersion(v)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                      >
                        Compare
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diff View Modal */}
      {diffVersion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl shadow-2xl animate-slide-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-white text-base font-bold">Comparing Versions</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  v{diffVersion.version} (older) → v{draft.version} (current)
                </p>
              </div>
              <button onClick={() => setDiffVersion(null)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Claims comparison */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-3">Claims</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                      v{diffVersion.version}
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
                      {[...(diffVersion.independent_claims ?? []), ...(diffVersion.dependent_claims ?? [])]
                        .sort((a, b) => a.number - b.number)
                        .map(c => (
                          <div key={c.number}>
                            <span className="text-slate-500 text-xs font-mono">{c.number}.</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-serif mt-0.5">{c.text}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                      v{draft.version} (current)
                    </div>
                    <div className="bg-sky-950/20 border border-sky-800/30 rounded-xl p-4 space-y-3">
                      {allClaims.map(c => {
                        const old = [...(diffVersion.independent_claims ?? []), ...(diffVersion.dependent_claims ?? [])].find(o => o.number === c.number);
                        const changed = !old || old.text !== c.text;
                        return (
                          <div key={c.number} className={changed ? 'relative' : ''}>
                            {changed && (
                              <span className="absolute -left-2 top-0 w-1 h-full bg-emerald-500/60 rounded-full" />
                            )}
                            <span className="text-slate-500 text-xs font-mono">{c.number}.</span>
                            <p className={`text-xs leading-relaxed font-serif mt-0.5 ${changed ? 'text-emerald-200' : 'text-slate-300'}`}>{c.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Abstract comparison */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-3">Abstract</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <p className="text-slate-400 text-xs leading-relaxed font-serif">{diffVersion.abstract_text}</p>
                  </div>
                  <div className={`rounded-xl p-4 border ${diffVersion.abstract_text !== editedDraft.abstract_text ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-slate-800/40 border-slate-700/40'}`}>
                    <p className={`text-xs leading-relaxed font-serif ${diffVersion.abstract_text !== editedDraft.abstract_text ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {editedDraft.abstract_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setDiffVersion(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
