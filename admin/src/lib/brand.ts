export const BRAND_NAME = 'اللذيذ';
export const BRAND_LOGO_URL = '/logo.png';

export function resolveBrandLogoUrl(logoUrl?: string | null) {
  return logoUrl || BRAND_LOGO_URL;
}
