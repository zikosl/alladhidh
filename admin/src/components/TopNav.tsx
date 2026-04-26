import { PosScreen } from '../types/pos';

const screens: Array<{ id: PosScreen; label: string; hint: string }> = [
  { id: 'order', label: 'Caisse', hint: 'Commande rapide' },
  { id: 'kitchen', label: 'Cuisine', hint: 'KDS' },
  { id: 'cashier', label: 'Paiement', hint: 'Cloture' },
  { id: 'delivery', label: 'Livraison', hint: 'Suivi' }
];

interface TopNavProps {
  activeScreen: PosScreen;
  onChange: (screen: PosScreen) => void;
}

export function TopNav({ activeScreen, onChange }: TopNavProps) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/75 p-2 shadow-soft backdrop-blur">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onChange(screen.id)}
            className={`rounded-3xl px-4 py-3 text-left transition ${
              activeScreen === screen.id
                ? 'bg-ink text-white'
                : 'bg-transparent text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <div className="text-sm font-semibold">{screen.label}</div>
            <div className={`text-xs ${activeScreen === screen.id ? 'text-white/70' : 'text-zinc-500'}`}>
              {screen.hint}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
