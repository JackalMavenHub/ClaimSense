import { useState, useCallback, useMemo, Component, ReactNode, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { supabase, PatentSession, PatentDraft, SESSION_STATUS } from './lib/supabase';
import { analyzeDescription, generateDraft, expressDraft, AIQuestion, PriorArtReference } from './lib/api';
import AuthPage from './components/AuthPage';
import AppShell, { Breadcrumb } from './components/AppShell';
import SessionList from './components/SessionList';
import NewSession from './components/NewSession';
import QASession from './components/QASession';
import PatentDraftView from './components/PatentDraftView';

type AppView =
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'qa'; session: PatentSession; questions: AIQuestion[] }
  | { type: 'draft'; session: PatentSession; draft: PatentDraft };

type DbQuestion = {
  question_number: number;
  category: string;
  question_text: string;
  why_it_matters?: string | null;
  example_answer?: string | null;
};

function toAIQuestions(rows: DbQuestion[]): AIQuestion[] {
  return rows.map(q => ({
    number: q.question_number,
    category: q.category,
    question: q.question_text,
    why_it_matters: q.why_it_matters || undefined,
    example_answer: q.example_answer || undefined,
  }));
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-red-400 text-2xl font-bold">!</span>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<AppView>({ type: 'list' });
  const [analyzing, setAnalyzing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftMode, setDraftMode] = useState<'express' | 'guided'>('guided');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [draftHeaderRight, setDraftHeaderRight] = useState<ReactNode>(null);
  const [draftHeaderTabs, setDraftHeaderTabs] = useState<ReactNode>(null);

  const clearError = useCallback(() => setError(''), []);
  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const goHome = useCallback(() => setView({ type: 'list' }), []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  // Clear draft header elements when leaving the draft view
  useEffect(() => {
    if (view.type !== 'draft') {
      setDraftHeaderRight(null);
      setDraftHeaderTabs(null);
    }
  }, [view.type]);

  // Compute breadcrumbs based on current view
  const breadcrumbs: Breadcrumb[] = useMemo(() => {
    switch (view.type) {
      case 'list':
        return [];
      case 'new':
        return [{ label: 'New Application' }];
      case 'qa':
        return [
          { label: view.session.title || 'Untitled', onClick: goHome },
          { label: 'Clarification' },
        ];
      case 'draft':
        return [
          { label: view.session.title || 'Untitled' },
        ];
      default:
        return [];
    }
  }, [view, goHome]);

  const isSubView = view.type !== 'list';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  async function handleNewSession(title: string, description: string, priorArt: PriorArtReference[] = []) {
    if (!user) return;
    setAnalyzing(true);
    setError('');
    try {
      const { data: session, error: sessionErr } = await supabase
        .from('patent_sessions')
        .insert({
          user_id: user.id,
          title,
          technical_description: description,
          status: SESSION_STATUS.QUESTIONING,
          prior_art_references: priorArt,
        })
        .select()
        .single();

      if (sessionErr || !session) throw new Error(sessionErr?.message ?? 'Failed to create session');

      const questions = await analyzeDescription(description);

      await supabase.from('session_questions').insert(
        questions.map(q => ({
          session_id: session.id,
          question_number: q.number,
          question_text: q.question,
          answer_text: '',
          category: q.category,
          why_it_matters: q.why_it_matters ?? '',
          example_answer: q.example_answer ?? '',
        }))
      );

      setView({ type: 'qa', session, questions });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExpressDraft(title: string, description: string, priorArt: PriorArtReference[] = []) {
    if (!user) return;
    setDraftMode('express');
    setDrafting(true);
    setError('');
    try {
      const { data: session, error: sessionErr } = await supabase
        .from('patent_sessions')
        .insert({ user_id: user.id, title, technical_description: description, status: SESSION_STATUS.DRAFTING, prior_art_references: priorArt })
        .select()
        .single();
      if (sessionErr || !session) throw new Error(sessionErr?.message ?? 'Failed to create session');

      const aiDraft = await expressDraft(title, description, priorArt.length > 0 ? priorArt : undefined);

      const independentClaims = aiDraft.claims.filter(c => c.type === 'independent');
      const dependentClaims = aiDraft.claims.filter(c => c.type === 'dependent');
      const claimsText = aiDraft.claims.map(c => `${c.number}. ${c.text}`).join('\n\n');

      const { data: draft, error: draftErr } = await supabase
        .from('patent_drafts')
        .insert({
          session_id: session.id,
          abstract_text: aiDraft.abstract,
          background_text: aiDraft.background,
          summary_text: aiDraft.summary,
          brief_drawings_text: aiDraft.brief_drawings,
          detailed_description_text: aiDraft.detailed_description,
          claims_text: claimsText,
          independent_claims: independentClaims,
          dependent_claims: dependentClaims,
          version: 1,
          is_current: true,
        })
        .select()
        .single();
      if (draftErr || !draft) throw new Error(draftErr?.message ?? 'Failed to save draft');

      await supabase
        .from('patent_sessions')
        .update({ status: SESSION_STATUS.COMPLETE, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      setView({ type: 'draft', session: { ...session, status: SESSION_STATUS.COMPLETE }, draft });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during drafting');
    } finally {
      setDrafting(false);
    }
  }

  async function handleAnswers(session: PatentSession, questions: AIQuestion[], answers: string[]) {
    setDraftMode('guided');
    setDrafting(true);
    setError('');
    try {
      await Promise.all(
        questions.map((q, i) =>
          supabase
            .from('session_questions')
            .update({ answer_text: answers[i] })
            .eq('session_id', session.id)
            .eq('question_number', q.number)
        )
      );

      await supabase
        .from('patent_sessions')
        .update({ status: SESSION_STATUS.DRAFTING, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      const { data: sessionData } = await supabase
        .from('patent_sessions')
        .select('prior_art_references')
        .eq('id', session.id)
        .single();
      const priorArt = Array.isArray(sessionData?.prior_art_references) && sessionData.prior_art_references.length > 0
        ? sessionData.prior_art_references as PriorArtReference[]
        : undefined;

      const aiDraft = await generateDraft(session.technical_description, questions, answers, session.title, priorArt);

      const independentClaims = aiDraft.claims.filter(c => c.type === 'independent');
      const dependentClaims = aiDraft.claims.filter(c => c.type === 'dependent');
      const claimsText = aiDraft.claims.map(c => `${c.number}. ${c.text}`).join('\n\n');

      const { data: previousDraft } = await supabase
        .from('patent_drafts')
        .select('id, version')
        .eq('session_id', session.id)
        .eq('is_current', true)
        .maybeSingle();

      const newVersion = previousDraft ? previousDraft.version + 1 : 1;

      if (previousDraft) {
        await supabase
          .from('patent_drafts')
          .update({ is_current: false })
          .eq('id', previousDraft.id);
      }

      const { data: draft, error: draftErr } = await supabase
        .from('patent_drafts')
        .insert({
          session_id: session.id,
          abstract_text: aiDraft.abstract,
          background_text: aiDraft.background,
          summary_text: aiDraft.summary,
          brief_drawings_text: aiDraft.brief_drawings,
          detailed_description_text: aiDraft.detailed_description,
          claims_text: claimsText,
          independent_claims: independentClaims,
          dependent_claims: dependentClaims,
          version: newVersion,
          is_current: true,
        })
        .select()
        .single();

      if (draftErr || !draft) throw new Error(draftErr?.message ?? 'Failed to save draft');

      await supabase
        .from('patent_sessions')
        .update({ status: SESSION_STATUS.COMPLETE, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      setView({ type: 'draft', session: { ...session, status: SESSION_STATUS.COMPLETE }, draft });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during drafting');
      await supabase
        .from('patent_sessions')
        .update({ status: SESSION_STATUS.QUESTIONING, updated_at: new Date().toISOString() })
        .eq('id', session.id);
    } finally {
      setDrafting(false);
    }
  }

  async function handleOpenSession(session: PatentSession) {
    if (session.status === SESSION_STATUS.COMPLETE) {
      const { data: draft } = await supabase
        .from('patent_drafts')
        .select('*')
        .eq('session_id', session.id)
        .eq('is_current', true)
        .maybeSingle();

      if (draft) {
        setView({ type: 'draft', session, draft });
        return;
      }
      await supabase
        .from('patent_sessions')
        .update({ status: SESSION_STATUS.QUESTIONING, updated_at: new Date().toISOString() })
        .eq('id', session.id);
      session = { ...session, status: SESSION_STATUS.QUESTIONING };
    }

    if (session.status === SESSION_STATUS.QUESTIONING || session.status === SESSION_STATUS.DRAFTING) {
      const { data: dbQuestions } = await supabase
        .from('session_questions')
        .select('*')
        .eq('session_id', session.id)
        .order('question_number');

      if (dbQuestions && dbQuestions.length > 0) {
        setView({ type: 'qa', session, questions: toAIQuestions(dbQuestions) });
        return;
      }
    }

    setView({ type: 'new' });
  }

  async function handleReAnswer(session: PatentSession) {
    const { data: dbQuestions } = await supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', session.id)
      .order('question_number');

    if (dbQuestions && dbQuestions.length > 0) {
      setView({
        type: 'qa',
        session: { ...session, status: SESSION_STATUS.QUESTIONING },
        questions: toAIQuestions(dbQuestions),
      });
    }
  }

  return (
    <>
      {/* Error toast */}
      {error && (
        <div className="fixed top-5 right-5 z-[100] max-w-md animate-slide-in">
          <div className="bg-red-950/95 backdrop-blur border border-red-800/60 rounded-xl overflow-hidden shadow-2xl shadow-red-950/30">
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-400 text-xs font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-red-200 text-sm font-medium mb-0.5">Error</p>
                  <p className="text-red-300/80 text-sm leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-300 transition-colors shrink-0 -mt-0.5 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="h-0.5 bg-red-900/50">
              <div className="h-full bg-red-500 animate-toast-progress" />
            </div>
          </div>
        </div>
      )}

      {/* Success/info toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-md animate-slide-in">
          <div className={`backdrop-blur border rounded-xl overflow-hidden shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-800/60'
              : 'bg-sky-950/95 border-sky-800/60'
          }`}>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-sky-500/20'
              }`}>
                <span className={`text-xs font-bold ${toast.type === 'success' ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {toast.type === 'success' ? '\u2713' : '\u2139'}
                </span>
              </div>
              <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-emerald-200' : 'text-sky-200'}`}>
                {toast.message}
              </p>
            </div>
            <div className={`h-0.5 ${toast.type === 'success' ? 'bg-emerald-900/50' : 'bg-sky-900/50'}`}>
              <div className={`h-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500'} animate-toast-progress-short`} />
            </div>
          </div>
        </div>
      )}

      {/* Loading overlays */}
      {analyzing && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-elevated rounded-2xl p-10 text-center max-w-sm mx-4 shadow-2xl animate-scale-in">
            <div className="relative w-14 h-14 mx-auto mb-5">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-t-blue-500 rounded-full animate-spin" />
            </div>
            <div className="text-white font-semibold text-lg mb-1.5">Analyzing Disclosure</div>
            <div className="text-slate-400 text-sm">Generating targeted clarification questions...</div>
          </div>
        </div>
      )}

      {drafting && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-elevated rounded-2xl p-10 text-center max-w-sm mx-4 shadow-2xl animate-scale-in">
            <div className="relative w-14 h-14 mx-auto mb-5">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-t-emerald-500 rounded-full animate-spin" />
            </div>
            {draftMode === 'express' ? (
              <>
                <div className="text-white font-semibold text-lg mb-1.5">Express Drafting</div>
                <div className="text-slate-400 text-sm">Generating full patent specification from your description...</div>
              </>
            ) : (
              <>
                <div className="text-white font-semibold text-lg mb-1.5">Drafting Application</div>
                <div className="text-slate-400 text-sm">Generating USPTO-compliant patent claims...</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <AppShell
        breadcrumbs={breadcrumbs}
        onNavigateHome={goHome}
        onNewSession={() => setView({ type: 'new' })}
        onSignOut={signOut}
        showBackButton={isSubView}
        onBack={goHome}
        headerRight={draftHeaderRight}
        headerTabs={draftHeaderTabs}
      >
        {view.type === 'list' && (
          <SessionList
            onNewSession={() => setView({ type: 'new' })}
            onOpenSession={handleOpenSession}
            onShowToast={showToast}
          />
        )}

        {view.type === 'new' && (
          <NewSession
            onSubmit={handleNewSession}
            onExpressDraft={handleExpressDraft}
          />
        )}

        {view.type === 'qa' && (
          <QASession
            session={view.session}
            questions={view.questions}
            onSubmit={(answers) => handleAnswers(view.session, view.questions, answers)}
          />
        )}

        {view.type === 'draft' && (
          <PatentDraftView
            session={view.session}
            draft={view.draft}
            onReAnswer={() => handleReAnswer(view.session)}
            onDraftUpdate={(updatedDraft) => setView({ type: 'draft', session: view.session, draft: updatedDraft })}
            onShowToast={showToast}
            onHeaderRight={setDraftHeaderRight}
            onHeaderTabs={setDraftHeaderTabs}
          />
        )}
      </AppShell>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}
