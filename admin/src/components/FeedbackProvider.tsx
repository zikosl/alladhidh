import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type DialogTone = 'danger' | 'warning' | 'info';

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, 'message'>> {
  id: number;
  message?: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

interface PendingDialog {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

interface FeedbackContextValue {
  toast: (input: string | ToastInput) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastToneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800'
};

const alertToneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800'
};

const dialogToneStyles: Record<DialogTone, { icon: string; button: string; badge: string }> = {
  danger: {
    icon: '!',
    button: 'bg-red-600 text-white hover:bg-red-700',
    badge: 'bg-red-100 text-red-700'
  },
  warning: {
    icon: '!',
    button: 'bg-amber-500 text-zinc-950 hover:bg-amber-600',
    badge: 'bg-amber-100 text-amber-800'
  },
  info: {
    icon: 'i',
    button: 'bg-zinc-950 text-white hover:bg-zinc-800',
    badge: 'bg-zinc-100 text-zinc-700'
  }
};

let toastId = 0;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<PendingDialog | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: string | ToastInput) => {
      const next: ToastItem = {
        id: ++toastId,
        title: typeof input === 'string' ? input : input.title,
        message: typeof input === 'string' ? undefined : input.message,
        tone: typeof input === 'string' ? 'info' : input.tone ?? 'info',
        duration: typeof input === 'string' ? 4200 : input.duration ?? 4200
      };
      setToasts((current) => [next, ...current].slice(0, 4));
      window.setTimeout(() => dismissToast(next.id), next.duration);
    },
    [dismissToast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ options, resolve });
    });
  }, []);

  const contextValue = useMemo(() => ({ toast, confirm }), [confirm, toast]);

  function closeDialog(confirmed: boolean) {
    if (!dialog) return;
    dialog.resolve(confirmed);
    setDialog(null);
  }

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {dialog ? <ConfirmDialog dialog={dialog} onClose={closeDialog} /> : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider');
  }
  return context;
}

export function AlertBanner({
  title,
  message,
  tone = 'info',
  onClose
}: {
  title?: string;
  message: string;
  tone?: ToastTone;
  onClose?: () => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-soft ${alertToneStyles[tone]}`}>
      <div>
        {title ? <div className="text-xs font-black uppercase tracking-[0.16em] opacity-70">{title}</div> : null}
        <div className="font-semibold">{message}</div>
      </div>
      {onClose ? (
        <button onClick={onClose} className="rounded-full bg-white/70 px-2 py-1 text-xs font-black">
          x
        </button>
      ) : null}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-motion pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${toastToneStyles[toast.tone]}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black">{toast.title}</div>
              {toast.message ? <div className="mt-1 text-xs font-semibold opacity-80">{toast.message}</div> : null}
            </div>
            <button onClick={() => onDismiss(toast.id)} className="rounded-full bg-white/70 px-2 py-1 text-xs font-black">
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ dialog, onClose }: { dialog: PendingDialog; onClose: (confirmed: boolean) => void }) {
  const tone = dialog.options.tone ?? 'info';
  const styles = dialogToneStyles[tone];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 px-4 backdrop-blur-sm">
      <div className="dialog-panel-motion premium-panel w-full max-w-md rounded-3xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${styles.badge}`}>
            {styles.icon}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-zinc-950">{dialog.options.title}</div>
            {dialog.options.message ? <p className="mt-2 text-sm leading-6 text-zinc-600">{dialog.options.message}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => onClose(false)} className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-200">
            {dialog.options.cancelLabel ?? 'Annuler'}
          </button>
          <button onClick={() => onClose(true)} className={`rounded-2xl px-4 py-3 text-sm font-black ${styles.button}`}>
            {dialog.options.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
