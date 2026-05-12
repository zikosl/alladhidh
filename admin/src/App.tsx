import { useEffect, useRef, useState } from 'react';
import { AlertBanner, FeedbackProvider, useFeedback } from './components/FeedbackProvider';
import { FinanceWorkspace } from './components/FinanceWorkspace';
import { InventoryWorkspace } from './components/InventoryWorkspace';
import { LoginScreen } from './components/LoginScreen';
import { ModuleLauncher } from './components/ModuleLauncher';
import { PayrollWorkspace } from './components/PayrollWorkspace';
import { PosWorkspace } from './components/PosWorkspace';
import { RecipesWorkspace } from './components/RecipesWorkspace';
import { ReportsWorkspace } from './components/ReportsWorkspace';
import { SalesWorkspace } from './components/SalesWorkspace';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { ThemeProvider } from './components/ThemeProvider';
import { usePosStore } from './store/usePosStore';
import { useAuthStore } from './store/useAuthStore';

type InstallPromptEvent = WindowEventMap['restaurant-pos:pwa-install-ready']['detail'];

export default function App() {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <AppContent />
      </FeedbackProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const {
    currentModule,
    loading,
    submitting,
    lastError,
    alerts,
    addAlert,
    markAlertCompleted,
    hydrate,
    refreshLiveData,
    syncNavigationFromUrl
  } = usePosStore();
  const { user, initialized, bootstrap } = useAuthStore();
  const { toast } = useFeedback();
  const lastToastRef = useRef<string | null>(null);
  const [backendBusy, setBackendBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user) {
      hydrate();
    }
  }, [hydrate, user]);

  useEffect(() => {
    syncNavigationFromUrl();
    const handlePopState = () => syncNavigationFromUrl();
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncNavigationFromUrl]);

  useEffect(() => {
    const handleBackendBusy = (event: Event) => {
      const pending = (event as CustomEvent<{ pending: number }>).detail?.pending ?? 0;
      setBackendBusy(pending > 0);
    };
    window.addEventListener('restaurant-pos:backend-busy', handleBackendBusy);

    return () => window.removeEventListener('restaurant-pos:backend-busy', handleBackendBusy);
  }, []);

  useEffect(() => {
    const handleInstallReady = (event: WindowEventMap['restaurant-pos:pwa-install-ready']) => {
      setInstallPrompt(event.detail);
    };
    const handleUpdateReady = (event: WindowEventMap['restaurant-pos:pwa-update-ready']) => {
      setUpdateRegistration(event.detail);
    };

    window.addEventListener('restaurant-pos:pwa-install-ready', handleInstallReady);
    window.addEventListener('restaurant-pos:pwa-update-ready', handleUpdateReady);

    return () => {
      window.removeEventListener('restaurant-pos:pwa-install-ready', handleInstallReady);
      window.removeEventListener('restaurant-pos:pwa-update-ready', handleUpdateReady);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const interval = window.setInterval(() => {
      refreshLiveData();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshLiveData, user]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshLiveData();
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [refreshLiveData, user]);

  useEffect(() => {
    if (!lastError || lastToastRef.current === lastError) return;
    lastToastRef.current = lastError;
    toast({ title: 'Action impossible', message: lastError, tone: 'error' });
  }, [lastError, toast]);

  if (!initialized) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="premium-panel rounded-2xl px-6 py-20 text-center text-sm font-semibold text-zinc-500">
            Initialisation de l’espace restaurant...
          </div>
        </div>
        <BackendBusyOverlay visible={backendBusy || submitting} submitting={submitting} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <BackendBusyOverlay visible={backendBusy || submitting} submitting={submitting} />
      </>
    );
  }

  return (
    <div className="compact-app app-chrome min-h-screen px-3 py-3 text-ink md:px-4 md:py-4">
      <div className="mx-auto max-w-[1700px] space-y-3">
        {lastError && (
          <AlertBanner title="Attention" message={lastError} tone="error" />
        )}

        {loading ? (
          <div className="rounded-2xl bg-white/80 px-6 py-20 text-center text-sm font-semibold text-zinc-500 shadow-soft">
            Chargement des modules...
          </div>
        ) : null}

        {!loading ? (
          <div key={currentModule} className="app-page-motion">
            {currentModule === 'apps' && <ModuleLauncher />}
            {currentModule === 'inventory' && <InventoryWorkspace />}
            {currentModule === 'recipes' && <RecipesWorkspace />}
            {currentModule === 'pos' && <PosWorkspace />}
            {currentModule === 'sales' && <SalesWorkspace />}
            {currentModule === 'reports' && <ReportsWorkspace />}
            {currentModule === 'finance' && <FinanceWorkspace />}
            {currentModule === 'payroll' && <PayrollWorkspace />}
            {currentModule === 'settings' && <SettingsWorkspace />}
          </div>
        ) : null}

        <AlertsPanel alerts={alerts} onAdd={addAlert} onComplete={markAlertCompleted} />
        <PwaPrompt
          installPrompt={installPrompt}
          updateRegistration={updateRegistration}
          onDismissInstall={() => setInstallPrompt(null)}
          onInstall={async () => {
            if (!installPrompt) return;
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            setInstallPrompt(null);
            toast({
              title: choice.outcome === 'accepted' ? 'Application installee' : 'Installation annulee',
              message: choice.outcome === 'accepted' ? 'اللذيذ est disponible depuis votre ecran.' : "Vous pourrez l'installer plus tard.",
              tone: choice.outcome === 'accepted' ? 'success' : 'info'
            });
          }}
          onDismissUpdate={() => setUpdateRegistration(null)}
          onUpdate={() => {
            updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
            setUpdateRegistration(null);
          }}
        />
        <BackendBusyOverlay visible={backendBusy || submitting} submitting={submitting} />
      </div>
    </div>
  );
}

function AlertsPanel({
  alerts,
  onAdd,
  onComplete
}: {
  alerts: ReturnType<typeof usePosStore.getState>['alerts'];
  onAdd: ReturnType<typeof usePosStore.getState>['addAlert'];
  onComplete: ReturnType<typeof usePosStore.getState>['markAlertCompleted'];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const pendingCount = alerts.filter((alert) => alert.status !== 'completed').length;
  const history = alerts.slice(0, 12);

  return (
    <div className="fixed right-4 top-4 z-[75]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-lg text-white shadow-card"
        aria-label="Rappels"
      >
        🔔
        {pendingCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-black text-white">
            {pendingCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="mt-2 w-[min(380px,calc(100vw-2rem))] rounded-[1.4rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] p-3 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--color-text-primary)]">Rappels</div>
              <div className="text-xs text-[color:var(--color-text-secondary)]">{pendingCount} actif(s)</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              Fermer
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre rappel" className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description optionnelle" className="min-h-16 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none" />
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none" />
            </div>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => {
                void onAdd({ title, description: description || null, date, time });
                setTitle('');
                setDescription('');
              }}
              className="rounded-2xl bg-brand px-3 py-2 text-sm font-black text-white disabled:bg-zinc-300"
            >
              Ajouter rappel
            </button>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {history.map((alert) => (
              <div key={alert.id} className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-zinc-950">{alert.title}</div>
                    <div className="mt-1 text-xs font-semibold text-zinc-500">{new Date(alert.dueAt).toLocaleString('fr-DZ')}</div>
                    {alert.description ? <div className="mt-1 text-xs text-zinc-500">{alert.description}</div> : null}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${alert.status === 'overdue' ? 'bg-red-50 text-red-600' : alert.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {alert.status === 'overdue' ? 'Retard' : alert.status === 'completed' ? 'Fait' : 'A faire'}
                  </span>
                </div>
                {alert.status !== 'completed' ? (
                  <button type="button" onClick={() => void onComplete(alert.id)} className="mt-2 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-white">
                    Marquer fait
                  </button>
                ) : null}
              </div>
            ))}
            {history.length === 0 ? <div className="rounded-2xl bg-zinc-50 p-4 text-center text-xs font-semibold text-zinc-500">Aucun rappel.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PwaPrompt({
  installPrompt,
  updateRegistration,
  onInstall,
  onDismissInstall,
  onUpdate,
  onDismissUpdate
}: {
  installPrompt: InstallPromptEvent | null;
  updateRegistration: ServiceWorkerRegistration | null;
  onInstall: () => void | Promise<void>;
  onDismissInstall: () => void;
  onUpdate: () => void;
  onDismissUpdate: () => void;
}) {
  if (!installPrompt && !updateRegistration) return null;

  const isUpdate = Boolean(updateRegistration);

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-[1.35rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] p-3 text-[color:var(--color-text-primary)] shadow-card">
      <div className="flex items-start gap-3">
        <img src="/logo.png" alt="اللذيذ" className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {isUpdate ? 'Nouvelle version disponible' : 'Installer اللذيذ POS'}
          </div>
          <div className="mt-1 text-xs leading-5 text-[color:var(--color-text-secondary)]">
            {isUpdate ? 'Rechargez pour utiliser la derniere version.' : 'Acces rapide, plein ecran et experience plus stable sur tablette.'}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={isUpdate ? onUpdate : onInstall}
              className="rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-strong active:scale-[0.98]"
            >
              {isUpdate ? 'Mettre a jour' : 'Installer'}
            </button>
            <button
              type="button"
              onClick={isUpdate ? onDismissUpdate : onDismissInstall}
              className="rounded-full border border-[color:var(--color-border)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-surface-secondary)] active:scale-[0.98]"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackendBusyOverlay({ visible, submitting }: { visible: boolean; submitting: boolean }) {
  if (!visible) return null;

  return (
    <div className="backend-busy-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-white/35 px-4 backdrop-blur-[2px]">
      <div className="premium-panel rounded-2xl px-5 py-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-brand" />
        <div className="mt-3 text-sm font-black text-zinc-950">
          {submitting ? 'Validation en cours...' : 'Sauvegarde en cours...'}
        </div>
        <div className="mt-1 text-xs text-zinc-500">Veuillez patienter, action en cours.</div>
      </div>
    </div>
  );
}
