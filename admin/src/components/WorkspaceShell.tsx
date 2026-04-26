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
    <section className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-soft backdrop-blur xl:sticky xl:top-5 xl:self-start">
        <button
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          ← Retour aux modules
        </button>

        <div className="mt-3 rounded-xl p-4 text-white" style={{ background: accent }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                {sectionLabel}
              </div>
              <div className="mt-1 text-lg font-bold">{title}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full rounded-xl px-3 py-3 text-left transition ${
                activeView === item.id ? 'bg-ink text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              {item.hint && (
                <div className={`mt-1 text-xs ${activeView === item.id ? 'text-white/70' : 'text-zinc-500'}`}>
                  {item.hint}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
