import { ModuleId, PosScreen } from '../types/pos';

const modulePaths: Record<Exclude<ModuleId, 'pos'>, string> = {
  apps: '/apps',
  inventory: '/stock',
  recipes: '/recettes',
  sales: '/ventes',
  reports: '/rapports',
  finance: '/finance',
  payroll: '/paie',
  settings: '/parametres'
};

const moduleAliases: Record<string, ModuleId> = {
  '': 'apps',
  apps: 'apps',
  modules: 'apps',
  stock: 'inventory',
  inventory: 'inventory',
  recettes: 'recipes',
  recipes: 'recipes',
  menu: 'recipes',
  pos: 'pos',
  ventes: 'sales',
  sales: 'sales',
  commandes: 'sales',
  rapports: 'reports',
  reports: 'reports',
  statistiques: 'reports',
  finance: 'finance',
  paie: 'payroll',
  payroll: 'payroll',
  parametres: 'settings',
  settings: 'settings'
};

const posPaths: Record<PosScreen, string> = {
  order: 'caisse',
  kitchen: 'caisse',
  cashier: 'paiement',
  delivery: 'livraison'
};

const posAliases: Record<string, PosScreen> = {
  '': 'order',
  caisse: 'order',
  order: 'order',
  commande: 'order',
  cuisine: 'cashier',
  kitchen: 'cashier',
  kds: 'cashier',
  paiement: 'cashier',
  caissement: 'cashier',
  cashier: 'cashier',
  livraison: 'delivery',
  delivery: 'delivery'
};

function pathSegments(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

export function navigationPath(module: ModuleId, posScreen: PosScreen = 'order') {
  if (module === 'pos') {
    return `/pos/${posPaths[posScreen]}`;
  }
  return modulePaths[module];
}

export function resolveNavigationPath(pathname: string): {
  module: ModuleId;
  posScreen: PosScreen;
  canonicalPath: string;
} {
  const [moduleSlug = '', subSlug = ''] = pathSegments(pathname);
  const module = moduleAliases[moduleSlug] ?? 'apps';
  const posScreen = module === 'pos' ? posAliases[subSlug] ?? 'order' : 'order';

  return {
    module,
    posScreen,
    canonicalPath: navigationPath(module, posScreen)
  };
}

export function writeNavigationPath(module: ModuleId, posScreen: PosScreen = 'order', mode: 'push' | 'replace' = 'push') {
  if (typeof window === 'undefined') return;
  const nextPath = navigationPath(module, posScreen);
  if (window.location.pathname === nextPath) return;

  if (mode === 'replace') {
    window.history.replaceState({ module, posScreen }, '', nextPath);
    return;
  }

  window.history.pushState({ module, posScreen }, '', nextPath);
}
