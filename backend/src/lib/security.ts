import crypto from 'crypto';

const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 12);

function getSecret() {
  return process.env.AUTH_SECRET || 'restaurant-pos-dev-secret-change-me';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, stored] = hashedPassword.split(':');
  if (!salt || !stored) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(derived, 'hex'));
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function signAuthToken(payload: { userId: number; username: string; permissions: string[] }) {
  const body = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): { userId: number; username: string; permissions: string[] } | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      userId: number;
      username: string;
      permissions: string[];
      exp: number;
    };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : []
    };
  } catch {
    return null;
  }
}
