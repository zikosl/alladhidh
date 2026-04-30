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
  const activeItem = navigation.find((item) => item.id === activeView);

  return (
    <section className="grid gap-3 xl:grid-cols-[255px_minmax(0,1fr)]">
      <aside className="premium-panel rounded-[1.7rem] p-2.5 xl:sticky xl:top-4 xl:self-start">
        <button
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-zinc-800"
        >
          ← Retour aux modules
        </button>

        <div className="mt-2.5 overflow-hidden rounded-[1.35rem] p-3 text-white shadow-lg shadow-zinc-950/10" style={{ background: accent }}>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 text-xl ring-1 ring-white/20">{icon}</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                {sectionLabel}
              </div>
              <div className="mt-0.5 text-base font-black">{title}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-white/75">{subtitle}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold">
            <div className="rounded-xl bg-white/14 px-2.5 py-2 ring-1 ring-white/15">
              <div className="text-white/55">Vue</div>
              <div className="mt-0.5 truncate">{activeItem?.label ?? activeView}</div>
            </div>
            <div className="rounded-xl bg-white/14 px-2.5 py-2 ring-1 ring-white/15">
              <div className="text-white/55">Etat</div>
              <div className="mt-0.5 flex items-center gap-1.5"><span className="status-dot !h-1.5 !w-1.5" /> Actif</div>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`group relative w-full overflow-hidden rounded-2xl px-3 py-2.5 text-left transition ${
                activeView === item.id ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/10' : 'mesh-chip text-zinc-700 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black">{item.label}</div>
                <div className={`h-1.5 w-1.5 rounded-full ${activeView === item.id ? 'bg-brand' : 'bg-zinc-300 group-hover:bg-zinc-500'}`} />
              </div>
              {item.hint && (
                <div className={`mt-0.5 line-clamp-1 text-[11px] ${activeView === item.id ? 'text-white/70' : 'text-zinc-500'}`}>
                  {item.hint}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-500">
            <span>Navigation URL</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">active</span>
          </div>
          <div className="mt-1 text-[11px] leading-4 text-zinc-500">
            Retour navigateur et liens directs restent synchronises.
          </div>
        </div>
      </aside>

      <div className="space-y-3">
        <div className="premium-panel rounded-[1.7rem] px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">{sectionLabel}</div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-zinc-950">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mesh-chip rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600">{activeItem?.label ?? 'Vue active'}</span>
              <span className="mesh-chip rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600">Mode production</span>
            </div>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
