import { BRAND_LOGO_URL, BRAND_NAME } from '../lib/brand';

export function BrandLogo({
  size = 64,
  showName = false,
  className = ''
}: {
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={BRAND_LOGO_URL} alt={BRAND_NAME} width={size} height={size} className="shrink-0 object-contain" />
      {showName ? (
        <div>
          <div className="text-2xl font-black leading-none text-zinc-950">{BRAND_NAME}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">Caisse restaurant</div>
        </div>
      ) : null}
    </div>
  );
}
