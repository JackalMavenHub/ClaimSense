import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Plus, LogOut, ChevronRight, Home, Keyboard, X,
  Menu, ArrowLeft,
} from 'lucide-react';

export type Breadcrumb = {
  label: string;
  onClick?: () => void;
};

type Props = {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  onNavigateHome: () => void;
  onNewSession: () => void;
  onSignOut: () => void;
  headerRight?: ReactNode;
  headerTabs?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
};

// Single source of truth for the product name.
// (Was inconsistent: "Claim Sense" in the header, "ClaimStream" in the drawer.)
const BRAND = 'ClaimSense';

const SHORTCUTS = [
  { keys: ['Cmd', 'N'], desc: 'New application' },
  { keys: ['Cmd', 'K'], desc: 'Search applications' },
  { keys: ['?'], desc: 'Show keyboard shortcuts' },
];

// Engraved patent seal — the same mark used on the sign-in screen, so the app is bookended by it.
function Seal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <circle cx="21" cy="21" r="20" stroke="#C9A45C" strokeWidth="1" />
      <circle cx="21" cy="21" r="16" stroke="#C9A45C" strokeWidth=".6" strokeDasharray="2 2" />
      <path d="M21 9 L21 33 M14 15 L28 15 M14 27 L28 27" stroke="#C9A45C" strokeWidth="1.2" />
      <path d="M16 21 L26 21" stroke="#5B7FC0" strokeWidth="1.4" />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <span className="font-serif text-white font-semibold text-[15px] tracking-tight">{BRAND}</span>
      <span className="text-[10px] font-semibold tracking-wide text-[#c9a45c] bg-[#c9a45c1a] px-1.5 py-0.5 rounded font-mono">AI</span>
    </div>
  );
}

export default function AppShell({
  children,
  breadcrumbs = [],
  onNavigateHome,
  onNewSession,
  onSignOut,
  headerRight,
  headerTabs,
  showBackButton,
  onBack,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toggleShortcuts = useCallback(() => setShortcutsOpen(prev => !prev), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        toggleShortcuts();
      }
      if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleShortcuts]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Main Header */}
      <header className="glass sticky top-0 z-30 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Top row */}
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Left: hamburger + logo + breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="btn btn-ghost p-2 sm:hidden shrink-0"
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>

              {/* Logo - clickable home */}
              <button
                onClick={onNavigateHome}
                className="flex items-center gap-2.5 shrink-0 group"
                title="Back to applications"
              >
                <span className="transition-transform group-hover:scale-105">
                  <Seal size={34} />
                </span>
                <Wordmark />
              </button>

              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <nav className="hidden sm:flex items-center gap-1 min-w-0 text-sm" aria-label="Breadcrumb">
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                  {breadcrumbs.map((bc, i) => {
                    const isLast = i === breadcrumbs.length - 1;
                    return (
                      <div key={i} className="flex items-center gap-1 min-w-0">
                        {i > 0 && <ChevronRight size={12} className="text-slate-700 shrink-0" />}
                        {bc.onClick && !isLast ? (
                          <button
                            onClick={bc.onClick}
                            className="text-slate-400 hover:text-white transition-colors truncate max-w-[160px]"
                          >
                            {bc.label}
                          </button>
                        ) : (
                          <span className={`truncate max-w-[200px] ${isLast ? 'text-white font-medium' : 'text-slate-400'}`}>
                            {bc.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}

              {/* Mobile: back button + title */}
              {showBackButton && (
                <button
                  onClick={onBack ?? onNavigateHome}
                  className="sm:hidden btn btn-ghost p-1.5 text-slate-400"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              {breadcrumbs.length > 0 && (
                <span className="sm:hidden text-white text-sm font-medium truncate">
                  {breadcrumbs[breadcrumbs.length - 1].label}
                </span>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}

              {/* Desktop-only nav items */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={toggleShortcuts}
                  className="btn btn-ghost p-2 rounded-lg text-slate-500 hover:text-slate-300"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard size={15} />
                </button>
                <button
                  onClick={onSignOut}
                  className="btn btn-ghost p-2 rounded-lg"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Header tabs (e.g. PatentDraftView tabs) */}
          {headerTabs && (
            <div className="flex gap-0 border-t border-white/[0.06] -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
              {headerTabs}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--bg-secondary)] border-r border-white/[0.06] shadow-2xl animate-slide-in-left flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Seal size={30} />
                <span className="font-serif text-white font-semibold text-[15px]">{BRAND}</span>
                <span className="text-[10px] font-semibold tracking-wide text-[#c9a45c] bg-[#c9a45c1a] px-1.5 py-0.5 rounded font-mono">AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="btn btn-ghost p-1.5">
                <X size={16} />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 p-3 space-y-1">
              <button
                onClick={() => { onNavigateHome(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <Home size={16} className="text-slate-500" />
                My applications
              </button>
              <button
                onClick={() => { onNewSession(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#c9a45c] hover:bg-[#c9a45c14] transition-all"
              >
                <Plus size={16} />
                New application
              </button>

              {/* Breadcrumb trail in drawer */}
              {breadcrumbs.length > 0 && (
                <div className="pt-3 mt-3 border-t border-white/[0.06]">
                  <div className="px-4 py-2 text-[11px] text-slate-600 font-semibold uppercase tracking-wider font-mono">Current path</div>
                  {breadcrumbs.map((bc, i) => (
                    <button
                      key={i}
                      onClick={() => { bc.onClick?.(); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                        i === breadcrumbs.length - 1
                          ? 'text-white font-medium bg-white/[0.04]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                      style={{ paddingLeft: `${(i + 1) * 12 + 16}px` }}
                    >
                      <ChevronRight size={12} className="text-slate-600" />
                      {bc.label}
                    </button>
                  ))}
                </div>
              )}
            </nav>

            {/* Drawer footer */}
            <div className="p-3 border-t border-white/[0.06] space-y-1">
              <button
                onClick={toggleShortcuts}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <Keyboard size={16} className="text-slate-500" />
                Shortcuts
              </button>
              <button
                onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <LogOut size={16} className="text-slate-500" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShortcutsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative glass-elevated rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Keyboard size={16} className="text-[#c9a45c]" />
                <h3 className="font-serif text-white font-semibold text-[15px]">Keyboard shortcuts</h3>
              </div>
              <button onClick={() => setShortcutsOpen(false)} className="btn btn-ghost p-1.5">
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                  <span className="text-slate-300 text-sm">{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.map(k => (
                      <kbd
                        key={k}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-400 bg-white/[0.06] border border-white/[0.08] rounded-md min-w-[24px] text-center font-mono"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-white/[0.06]">
              <p className="text-slate-600 text-xs text-center">
                Press <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.06] border border-white/[0.08] rounded font-mono">?</kbd> anywhere to toggle this panel
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
