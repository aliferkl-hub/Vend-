import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, persistDatabase, detectStorageStatus } from '../db/index.ts';
import { users, sessions, profiles, auditLogs } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';

const router = Router();

const SESSION_EXPIRY_DAYS = 30;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

// 1. REGISTER
router.post('/register', async (req: AuthRequest, res) => {
  try {
    const { name, email, password, phone, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    // Normalize email: trim and lowercase
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido. Verifique e tente novamente.' });
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Este e-mail já está cadastrado. Faça login.',
        message: 'Este e-mail já está cadastrado. Faça login.',
      });
    }

    // Password hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = 'vend_' + crypto.randomUUID();

    // Check if this is master owner email
    const isMasterOwner =
      process.env.MASTER_OWNER_EMAIL &&
      normalizedEmail === process.env.MASTER_OWNER_EMAIL.trim().toLowerCase();

    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        location: location ? location.trim() : 'Brasil',
        role: isMasterOwner ? 'MASTER_OWNER' : 'USER',
        status: 'ACTIVE',
        planSlug: 'free',
      })
      .returning();

    // Create profile
    await db.insert(profiles).values({
      userId: newUser.id,
      bio: `Membro VEND+ desde ${new Date().toLocaleDateString('pt-BR')}`,
    });

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db.insert(sessions).values({
      userId: newUser.id,
      token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    setSessionCookie(res, token);

    // Audit log
    await db.insert(auditLogs).values({
      userId: newUser.id,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: String(newUser.id),
      details: JSON.stringify({ email: normalizedEmail, role: newUser.role }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Explicitly guarantee persistence immediately
    persistDatabase();

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
        planSlug: newUser.planSlug,
        phone: newUser.phone,
        location: newUser.location,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Erro ao criar conta. Tente novamente mais tarde.' });
  }
});

// 2. LOGIN
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (result.length === 0) {
      return res.status(401).json({ error: 'Conta não encontrada. Verifique seus dados ou cadastre-se.' });
    }

    const user = result[0];

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Esta conta está bloqueada. Entre em contato com o suporte.' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'Esta conta foi vinculada via Google. Por favor, utilize o botão "Entrar com Google".',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    setSessionCookie(res, token);

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: String(user.id),
      details: JSON.stringify({ email: normalizedEmail }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Ensure session is persisted to disk immediately
    persistDatabase();

    return res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        planSlug: user.planSlug,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        location: user.location,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Erro ao realizar login. Tente novamente mais tarde.' });
  }
});

// 3. LOGOUT
router.post('/logout', async (req: AuthRequest, res) => {
  try {
    const cookieToken = req.cookies?.vend_session;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearerToken || cookieToken;

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    res.clearCookie('vend_session', { path: '/' });

    if (req.user) {
      await db.insert(auditLogs).values({
        userId: req.user.id,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: String(req.user.id),
        details: JSON.stringify({ email: req.user.email }),
      });
    }

    // Ensure session deletion is immediately persisted to disk
    persistDatabase();

    return res.json({ message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Erro ao sair.' });
  }
});

// 4. ME (current session check)
router.get('/me', async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false, user: null, error: 'Sessão não encontrada ou expirada.' });
  }

  // Fetch full and fresh details from database
  const [freshUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!freshUser || freshUser.status === 'BLOCKED') {
    return res.status(401).json({ authenticated: false, user: null, error: 'Usuário não encontrado ou inativo.' });
  }

  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, freshUser.id))
    .limit(1);

  return res.json({
    authenticated: true,
    user: {
      id: freshUser.id,
      uid: freshUser.uid,
      email: freshUser.email,
      name: freshUser.name,
      role: freshUser.role,
      status: freshUser.status,
      planSlug: freshUser.planSlug,
      phone: freshUser.phone,
      avatarUrl: freshUser.avatarUrl,
      location: freshUser.location,
      profile: userProfile || null,
    },
  });
});

// 5. RECOVER PASSWORD
router.post('/recover-password', async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (result.length > 0) {
      await db.insert(auditLogs).values({
        userId: result[0].id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: String(result[0].id),
        details: JSON.stringify({ email: normalizedEmail }),
      });
    }

    // Always respond with same safe message
    return res.json({
      message:
        'Se o e-mail estiver cadastrado, você receberá as instruções de redefinição. (Em modo desenvolvimento, contate o Master Owner).',
    });
  } catch (err) {
    console.error('Password recovery error:', err);
    return res.status(500).json({ error: 'Erro ao processar recuperação de senha.' });
  }
});

// 6. STORAGE & PERSISTENCE DIAGNOSTICS
router.get('/storage-status', (req, res) => {
  const status = detectStorageStatus();
  return res.json(status);
});

export default router;
