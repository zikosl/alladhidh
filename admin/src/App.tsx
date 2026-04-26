import { useEffect } from 'react';
import { InventoryWorkspace } from './components/InventoryWorkspace';
import { LoginScreen } from './components/LoginScreen';
import { ModuleLauncher } from './components/ModuleLauncher';
import { PosWorkspace } from './components/PosWorkspace';
import { RecipesWorkspace } from './components/RecipesWorkspace';
import { ReportsWorkspace } from './components/ReportsWorkspace';
import { SalesWorkspace } from './components/SalesWorkspace';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { usePosStore } from './store/usePosStore';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const { currentModule, loading, lastError, hydrate, refreshLiveData } = usePosStore();
  const { user, initialized, bootstrap } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user) {
      hydrate();
    }
  }, [hydrate, user]);

  useEffect(() => {
    if (!user) return undefined;
    const interval = window.setInterval(() => {
      refreshLiveData();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshLiveData, user]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="rounded-2xl bg-white/80 px-6 py-20 text-center text-sm font-semibold text-zinc-500 shadow-soft">
          Initialisation securisee...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen px-3 py-3 text-ink md:px-5 md:py-5">
      <div className="mx-auto max-w-[1700px] space-y-4">
        {lastError && (
          <div className="rounded-3xl bg-red-50 px-5 py-4 text-xs font-medium text-red-600 shadow-soft md:text-sm">
            {lastError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white/80 px-6 py-20 text-center text-sm font-semibold text-zinc-500 shadow-soft">
            Chargement des modules...
          </div>
        ) : null}

        {!loading && currentModule === 'apps' && <ModuleLauncher />}
        {!loading && currentModule === 'inventory' && <InventoryWorkspace />}
        {!loading && currentModule === 'recipes' && <RecipesWorkspace />}
        {!loading && currentModule === 'pos' && <PosWorkspace />}
        {!loading && currentModule === 'sales' && <SalesWorkspace />}
        {!loading && currentModule === 'reports' && <ReportsWorkspace />}
        {!loading && currentModule === 'settings' && <SettingsWorkspace />}
      </div>
    </div>
  );
}
