import { ReactNode } from 'react';

interface WorkspaceShellProps {
  title: string;
  subtitle: string;
  accent: string;
  icon: string;
  sectionLabel: string;
  onBack: () => void;
  navigation: Array<{ id: string; label: string; hint?: string }>;
  activeView: string;
  onChangeView: (id: string) => void;
  children: ReactNode;
}

export function WorkspaceShell({
  title,
  subtitle,
  accent,
  icon,
  sectionLabel,
  onBack,
  navigation,
  activeView,
  onChangeView,
  children
}: WorkspaceShellProps) {
  return (
    <section className="grid gap-3 xl:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/60 bg-white/90 p-2.5 shadow-soft backdrop-blur xl:sticky xl:top-4 xl:self-start">
        <button
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-200"
        >
          ← Retour aux modules
        </button>

        <div className="mt-2.5 rounded-xl p-3 text-white" style={{ background: accent }}>
          <div className="flex items-center gap-3">
            <div className="text-xl">{icon}</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                {sectionLabel}
              </div>
              <div className="mt-0.5 text-base font-black">{title}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-white/75">{subtitle}</p>
        </div>

        <div className="mt-3 space-y-1.5">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full rounded-lg px-2.5 py-2 text-left transition ${
                activeView === item.id ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="text-xs font-black">{item.label}</div>
              {item.hint && (
                <div className={`mt-0.5 line-clamp-1 text-[11px] ${activeView === item.id ? 'text-white/70' : 'text-zinc-500'}`}>
                  {item.hint}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-3">{children}</div>
    </section>
  );
}
