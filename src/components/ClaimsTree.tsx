import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

type Claim = {
  number: number;
  type: 'independent' | 'dependent';
  depends_on?: number;
  text: string;
};

type Props = {
  claims: Claim[];
  onViewClaim?: (number: number) => void;
};

export default function ClaimsTree({ claims, onViewClaim }: Props) {
  const tree = useMemo(() => {
    const independents = claims.filter(c => c.type === 'independent').sort((a, b) => a.number - b.number);
    const dependents = claims.filter(c => c.type === 'dependent');

    const childrenByParent = new Map<number, Claim[]>();
    dependents.forEach(d => {
      const parent = d.depends_on ?? 1;
      const existing = childrenByParent.get(parent) ?? [];
      childrenByParent.set(parent, [...existing, d].sort((a, b) => a.number - b.number));
    });

    return independents.map(ind => ({
      claim: ind,
      children: childrenByParent.get(ind.number) ?? [],
    }));
  }, [claims]);

  const totalDependents = claims.filter(c => c.type === 'dependent').length;

  if (claims.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="4" cy="8" r="2" />
              <circle cx="12" cy="4" r="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 8h2m1-4l-2 3m1 4l-2-3" />
            </svg>
          </div>
          <div>
            <div className="text-white text-sm font-semibold">Claims Portfolio</div>
            <div className="text-slate-500 text-xs">
              {claims.length} total — {tree.length} independent, {totalDependents} dependent
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {tree.map(({ claim, children }) => (
            <div key={claim.number} className="flex flex-col items-center">
              {/* Independent claim node */}
              <button
                onClick={() => onViewClaim?.(claim.number)}
                className="group relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-500/40 flex items-center justify-center transition-all hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/20">
                  <span className="text-blue-300 text-lg font-bold">{claim.number}</span>
                </div>
                <ChevronRight size={14} className="absolute -right-1 top-1/2 -translate-y-1/2 text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400 transition-all" />
              </button>

              {/* Connector and dependents */}
              {children.length > 0 && (
                <div className="mt-3 flex flex-col items-center">
                  <div className="w-px h-4 bg-gradient-to-b from-blue-500/40 to-transparent" />
                  <div className="flex gap-3 mt-1">
                    {children.map((child) => (
                      <div key={child.number} className="flex flex-col items-center group relative">
                        <div className="w-px h-3 bg-white/[0.06]" />
                        <button
                          onClick={() => onViewClaim?.(child.number)}
                          className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center transition-all hover:bg-white/[0.08] hover:border-white/[0.12] mt-1"
                        >
                          <span className="text-slate-300 text-sm font-semibold">{child.number}</span>
                        </button>

                        {/* Hover preview */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                          <div className="card p-3 shadow-xl">
                            <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3">
                              {child.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {children.length === 0 && (
                <div className="mt-4 text-slate-600 text-[10px] font-medium uppercase tracking-wider">
                  No dependents
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/40" />
          <span className="text-slate-400">Independent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08]" />
          <span className="text-slate-400">Dependent</span>
        </div>
      </div>
    </div>
  );
}
