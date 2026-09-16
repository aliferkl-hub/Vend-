import { Router, Response } from 'express';
import { db, persistDatabase, detectStorageStatus } from '../db/index.ts';
import { profiles, auditLogs } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';
import { normalizeEmail, isValidEmail } from '../utils/normalizeEmail.ts';
import { UserRepository } from './repositories/UserRepository.ts';
import { SessionRepository } from './repositories/SessionRepository.ts';
import { PasswordResetRepository } from './repositories/PasswordResetRepository.ts';
import { AuthDatabase, VendAuthMemory } from './repositories/AuthDatabase.ts';

const router = Router();

const SESSION_EXPIRY_DAYS = 30;

// Rate limiting and brute force protection in-memory tracker
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}
const loginAttempts = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) {
    return { allowed: true };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  // Reset window after 5 minutes
  if (now - entry.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
    if (entry.count >= 5) {
      entry.lockedUntil = now + 2 * 60 * 1000; // 2 minute lock
      console.warn(`[AUTH SECURITY] Rate limit atingido para chave ${key}. Bloqueado por 2 minutos.`);
    }
  }
}

function clearFailedAttempts(key: string): void {
  loginAttempts.delete(key);
}

function setSessionCookie(res: Response, token: string) {
  res.cookie('vend_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// 1. REGISTER: POST /api/auth/register
router.post('/register', async (req: AuthRequest, res) => {
  try {
    const {
      name,
      username,
      email: rawEmail,
      password,
      confirmPassword,
      phone,
      location,
      role,
    } = req.body;

    console.log('[AUTH REGISTER] Requisição de cadastro de conta recebida');

    // Basic required fields
    if (!name || typeof name !== 'string' || !name.trim() || !rawEmail || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Nome, e-mail e senha são obrigatórios.',
        message: 'Nome, e-mail e senha são obrigatórios.',
      });
    }

    // Password length validation
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'A senha deve ter no mínimo 6 caracteres.',
        message: 'A senha deve ter no mínimo 6 caracteres.',
      });
    }

    // Password confirmation check if provided
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'As senhas não coincidem. Verifique e tente novamente.',
        message: 'As senhas não coincidem. Verifique e tente novamente.',
      });
    }

    const cleanEmail = normalizeEmail(rawEmail);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Formato de e-mail inválido. Verifique e tente novamente.',
        message: 'Formato de e-mail inválido. Verifique e tente novamente.',
      });
    }

    // Check unique normalized_email
    console.log(`[AUTH USER LOOKUP] Verificando se e-mail já existe na base oficial: ${cleanEmail}`);
    const existingEmail = await UserRepository.findByEmail(cleanEmail);

    if (existingEmail) {
      console.log(`[AUTH USER FOUND] Cadastro bloqueado por duplicidade para e-mail: ${cleanEmail}`);
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        error: 'Este e-mail já possui uma conta. Faça login.',
        message: 'Este e-mail já possui uma conta. Faça login.',
      });
    }

    // Check unique username if provided
    if (username && typeof username === 'string' && username.trim()) {
      const cleanUsername = username.trim().toLowerCase();
      const existingUsername = await UserRepository.findByUsername(cleanUsername);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          code: 'USERNAME_ALREADY_EXISTS',
          error: 'Este nome de usuário já está em uso. Escolha outro.',
          message: 'Este nome de usuário já está em uso. Escolha outro.',
        });
      }
    }

    // Role protection: prevent unauthorized elevation to MASTER_OWNER
    const isMasterOwnerEmail =
      process.env.MASTER_OWNER_EMAIL &&
      cleanEmail === normalizeEmail(process.env.MASTER_OWNER_EMAIL);

    const safeRole = isMasterOwnerEmail
      ? 'MASTER_OWNER'
      : role === 'DELIVERY_DRIVER'
      ? 'DELIVERY_DRIVER'
      : 'USER';

    const newUser = await UserRepository.createUser({
      email: cleanEmail,
      username: username ? String(username).trim().toLowerCase() : undefined,
      password,
      name: name.trim(),
      phone: phone ? String(phone).trim() : null,
      location: location ? String(location).trim() : 'Brasil',
      role: safeRole,
    });

    console.log(`[AUTH REGISTER] Usuário id ${newUser.id} persistido com sucesso na VEND_AUTH_MEMORY`);

    // Create user profile
    await db.insert(profiles).values({
      userId: newUser.id,
      bio: `Membro VEND+ desde ${new Date().toLocaleDateString('pt-BR')}`,
    }).catch((err) => {
      console.warn('[AUTH REGISTER] Aviso ao criar perfil complementar:', err.message);
    });

    // Create persistent session
    const session = await SessionRepository.createSession(newUser.id, req.ip, req.headers['user-agent']);
    setSessionCookie(res, session.token);

    // Audit log
    await db.insert(auditLogs).values({
      userId: newUser.id,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: String(newUser.id),
      details: JSON.stringify({ email: cleanEmail, role: newUser.role }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    persistDatabase();

    return res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      token: session.token,
      user: UserRepository.sanitizeUser(newUser),
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro no registro de conta:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Não foi possível verificar sua conta agora. Tente novamente.',
      message: 'Não foi possível verificar sua conta agora. Tente novamente.',
    });
  }
});

// 2. LOGIN: POST /api/auth/login
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email: rawEmail, password } = req.body;

    console.log('[AUTH LOGIN ATTEMPT] Tentativa de login recebida');

    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim() || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'E-mail e senha são obrigatórios.',
        message: 'E-mail e senha são obrigatórios.',
      });
    }

    const cleanEmail = normalizeEmail(rawEmail);
    const rateLimitKey = `${req.ip || 'ip'}_${cleanEmail}`;

    // Rate limiter check
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        error: `Muitas tentativas incorretas. Aguarde ${rateLimit.waitSeconds || 60} segundos antes de tentar novamente.`,
        message: `Muitas tentativas incorretas. Aguarde ${rateLimit.waitSeconds || 60} segundos antes de tentar novamente.`,
      });
    }

    console.log(`[AUTH USER LOOKUP] Buscando conta persistente para: ${cleanEmail}`);
    const user = await UserRepository.findByEmail(cleanEmail);

    if (!user) {
      console.log(`[AUTH USER NOT FOUND] Conta inexistente para email: ${cleanEmail}`);
      recordFailedAttempt(rateLimitKey);
      await UserRepository.recordLoginFailure(cleanEmail, 'USER_NOT_FOUND', req.ip, req.headers['user-agent']);

      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'Conta não encontrada. Verifique o e-mail ou cadastre-se.',
        message: 'Conta não encontrada. Verifique o e-mail ou cadastre-se.',
      });
    }

    console.log(`[AUTH USER FOUND] Usuário encontrado id ${user.id} (${user.email}), status: ${user.status}`);

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        error: 'Esta conta está temporariamente desativada. Entre em contato com o suporte.',
        message: 'Esta conta está temporariamente desativada. Entre em contato com o suporte.',
      });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        code: 'GOOGLE_AUTH_REQUIRED',
        error: 'Esta conta foi vinculada via Google. Por favor, utilize o botão "Entrar com Google".',
        message: 'Esta conta foi vinculada via Google. Por favor, utilize o botão "Entrar com Google".',
      });
    }

    console.log(`[AUTH PASSWORD CHECK] Verificando credenciais para id ${user.id}...`);
    const isMatch = await UserRepository.verifyPassword(password, user.passwordHash);

    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      await UserRepository.recordLoginFailure(cleanEmail, 'INVALID_PASSWORD', req.ip, req.headers['user-agent']);

      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Senha incorreta. Verifique seus dados.',
        message: 'Senha incorreta. Verifique seus dados.',
      });
    }

    // Success: clear rate limit
    clearFailedAttempts(rateLimitKey);

    // Record login timestamp and audit event
    await UserRepository.recordLogin(user.id, req.ip, req.headers['user-agent']);

    // Create persistent session
    const session = await SessionRepository.createSession(user.id, req.ip, req.headers['user-agent']);
    setSessionCookie(res, session.token);

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: String(user.id),
      details: JSON.stringify({ email: cleanEmail }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    persistDatabase();

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: session.token,
      user: UserRepository.sanitizeUser(user),
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro durante o processo de login:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Não foi possível verificar sua conta agora. Tente novamente.',
      message: 'Não foi possível verificar sua conta agora. Tente novamente.',
    });
  }
});

// 3. LOGOUT: POST /api/auth/logout
router.post('/logout', async (req: AuthRequest, res) => {
  try {
    const cookieToken = req.cookies?.vend_session;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearerToken || cookieToken;

    if (token) {
      await SessionRepository.revokeSession(token);
    }

    res.clearCookie('vend_session', { path: '/' });

    const userId = req.user?.id;
    console.log(`[AUTH LOGOUT] Sessão finalizada para userId: ${userId || 'anônimo'}`);

    if (userId) {
      await AuthDatabase.logEvent({
        eventType: 'LOGOUT',
        userId,
        email: req.user?.email,
      });

      await db.insert(auditLogs).values({
        userId,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: String(userId),
        details: JSON.stringify({ email: req.user?.email }),
      }).catch(() => {});
    }

    persistDatabase();

    return res.json({
      success: true,
      message: 'Sessão encerrada com sucesso.',
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro ao sair:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Erro ao sair.',
    });
  }
});

// 4. ME: GET /api/auth/me (current session check & account reload)
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.vend_session;
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        authenticated: false,
        code: 'SESSION_EXPIRED',
        user: null,
        error: 'Sessão não encontrada ou expirada.',
      });
    }

    // Validate token against persistent database
    const user = await SessionRepository.validateSession(token);

    if (!user) {
      return res.status(401).json({
        authenticated: false,
        code: 'SESSION_EXPIRED',
        user: null,
        error: 'Sessão não encontrada ou expirada.',
      });
    }

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      return res.status(403).json({
        authenticated: false,
        code: 'ACCOUNT_DISABLED',
        user: null,
        error: 'Usuário bloqueado ou inativo.',
      });
    }

    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1)
      .catch(() => []);

    return res.json({
      authenticated: true,
      user: {
        ...UserRepository.sanitizeUser(user),
        profile: userProfile || null,
      },
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Falha no endpoint /api/auth/me:', err);
    return res.status(500).json({
      authenticated: false,
      code: 'DATABASE_ERROR',
      user: null,
      error: 'Não foi possível verificar sua conta agora. Tente novamente.',
    });
  }
});

// 5. CHANGE PASSWORD: POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Senha atual e nova senha são obrigatórias.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'A nova senha e a confirmação não coincidem.',
      });
    }

    // Retrieve user password hash
    const user = await UserRepository.findById(userId);
    if (!user || !user.passwordHash) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        error: 'Não foi possível alterar a senha desta conta.',
      });
    }

    // Check current password
    const isCurrentValid = await UserRepository.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Senha atual incorreta. Tente novamente.',
      });
    }

    // Update password
    await UserRepository.updatePassword(userId, newPassword);

    // Revoke previous sessions except current one if desired
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.cookies?.vend_session;

    if (currentToken) {
      await SessionRepository.revokeAllUserSessions(userId, currentToken);
    }

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso!',
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro na alteração de senha:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Não foi possível alterar sua senha agora. Tente novamente.',
    });
  }
});

// 6. FORGOT PASSWORD: POST /api/auth/forgot-password
router.post('/forgot-password', async (req: AuthRequest, res) => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'E-mail é obrigatório.',
      });
    }

    const cleanEmail = normalizeEmail(rawEmail);
    console.log(`[AUTH FORGOT PASSWORD] Solicitação para email: ${cleanEmail}`);

    const user = await UserRepository.findByEmail(cleanEmail);
    let devResetToken: string | undefined;

    if (user) {
      const { rawToken } = await PasswordResetRepository.createResetToken(user.id, cleanEmail, req.ip);
      devResetToken = rawToken;

      await db.insert(auditLogs).values({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: String(user.id),
        details: JSON.stringify({ email: cleanEmail }),
      }).catch(() => {});
    }

    // Return safe message (and include dev token for development/test purposes)
    return res.json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas.',
      resetToken: devResetToken || null,
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro na recuperação de senha:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Não foi possível processar a recuperação agora. Tente novamente.',
    });
  }
});

// 7. RESET PASSWORD: POST /api/auth/reset-password
router.post('/reset-password', async (req: AuthRequest, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Token e nova senha são obrigatórios.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'As senhas não coincidem.',
      });
    }

    const userId = await PasswordResetRepository.consumeToken(token);
    if (!userId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        error: 'Link de redefinição inválido ou expirado. Solicite uma nova redefinição.',
      });
    }

    await UserRepository.updatePassword(userId, newPassword);
    await SessionRepository.revokeAllUserSessions(userId);

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Faça login com sua nova senha.',
    });
  } catch (err: any) {
    console.error('[AUTH DATABASE ERROR] Erro ao redefinir senha:', err);
    return res.status(500).json({
      success: false,
      code: 'DATABASE_ERROR',
      error: 'Erro ao redefinir senha. Tente novamente.',
    });
  }
});

// 8. VEND_AUTH_MEMORY AUDIT EVENTS (Protected for Master Owner)
router.get('/events', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const events = await AuthDatabase.getRecentEvents(100);
    return res.json({ success: true, events });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. STORAGE & PERSISTENCE DIAGNOSTICS
router.get('/storage-status', (req, res) => {
  const status = detectStorageStatus();
  return res.json(status);
});

export default router;
