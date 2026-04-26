import { prisma } from '../lib/prisma';
import { signAuthToken, verifyAuthToken, verifyPassword } from '../lib/security';
import { AuthLoginResponse, AuthUserSummary } from '../types/pos';
import { HttpError } from '../utils/httpError';
import { requireField } from '../utils/validation';

async function mapAuthUser(userId: number): Promise<AuthUserSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new HttpError(404, 'Utilisateur introuvable');
  }

  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    status: user.status,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((item) => item.permission.code).sort()
  };
}

export async function loginUser(input: { login: string; password: string }): Promise<AuthLoginResponse> {
  requireField(input, 'login');
  requireField(input, 'password');

  const login = String(input.login).trim();
  const password = String(input.password);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: login }, { email: login }]
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'Identifiants invalides');
  }

  if (user.status !== 'active') {
    throw new HttpError(403, 'Compte desactive');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const mappedUser = await mapAuthUser(user.id);
  return {
    token: signAuthToken({
      userId: mappedUser.id,
      username: mappedUser.username,
      permissions: mappedUser.permissions
    }),
    user: mappedUser
  };
}

export async function getCurrentUserFromToken(token: string): Promise<AuthUserSummary> {
  const payload = verifyAuthToken(token);
  if (!payload) {
    throw new HttpError(401, 'Session invalide');
  }

  const user = await mapAuthUser(payload.userId);
  if (user.status !== 'active') {
    throw new HttpError(403, 'Compte desactive');
  }
  return user;
}
