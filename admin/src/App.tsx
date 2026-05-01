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
  const { currentModule, loading, submitting, lastError, hydrate, refreshLiveData, syncNavigationFromUrl } = usePosStore();
  const { user, initialized, bootstrap } = useAuthStore();
  const { toast } = useFeedback();
  const lastToastRef = useRef<string | null>(null);
  const [backendBusy, setBackendBusy] = useState(false);

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
          <div className="rounded-2xl bg-white/80 px-6 py-20 text-center text-sm font-semibold text-zinc-500 shadow-soft">
            Initialisation securisee...
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

        <BackendBusyOverlay visible={backendBusy || submitting} submitting={submitting} />
      </div>
    </div>
  );
}

function BackendBusyOverlay({ visible, submitting }: { visible: boolean; submitting: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/35 px-4 backdrop-blur-[2px]">
      <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-4 text-center shadow-soft">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-brand" />
        <div className="mt-3 text-sm font-black text-zinc-950">
          {submitting ? 'Envoi en cuisine...' : 'Sauvegarde en cours...'}
        </div>
        <div className="mt-1 text-xs text-zinc-500">Veuillez patienter, action en cours.</div>
      </div>
    </div>
  );
}
