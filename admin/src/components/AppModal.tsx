import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AppModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function AppModal({ title, onClose, children, maxWidthClassName = 'max-w-3xl' }: AppModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed z-50 grid place-items-center overflow-hidden bg-[#1a1714]/45 p-3 backdrop-blur-[5px] sm:p-6"
      style={{
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog-panel-motion premium-panel flex max-h-[calc(100vh-1.5rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[2rem] border border-[#e8d2af] bg-white p-[1.05rem] shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-[1.35rem]`}
      >
        <div className="z-10 mb-4 flex shrink-0 items-center justify-between gap-4 rounded-[1.45rem] bg-white/95 py-1.5 pl-1.5 pr-1 backdrop-blur">
          <h3 className="text-lg font-bold text-zinc-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[1.25rem] bg-[#fffaf1] px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-[#fff4e3]"
          >
            Fermer
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1.5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
