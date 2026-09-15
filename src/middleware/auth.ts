import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, sessions } from '../db/schema.ts';
import { eq, and, gt } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string; // 'USER' | 'MASTER_OWNER' | 'DELIVERY_DRIVER'
  status: string; // 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  planSlug: string;
  phone?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1].trim();
    }

    // 2. Check cookie if header not present
    if (!token && req.cookies && req.cookies.vend_session) {
      token = req.cookies.vend_session;
    }

    if (!token) {
      return next();
    }

    // A. First check internal PostgreSQL sessions
    const validSession = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (validSession.length > 0) {
      const u = validSession[0].user;
      if (u.status === 'BLOCKED') {
        return res.status(403).json({ error: 'Conta bloqueada por motivos de segurança. Contate o suporte.' });
      }
      req.user = {
        id: u.id,
        uid: u.uid,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        planSlug: u.planSlug,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        location: u.location,
      };
      return next();
    }

    // B. If not a session token, try verifying as Firebase ID token
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded && decoded.uid) {
        // Sync or get user from PostgreSQL
        const email = (decoded.email || `${decoded.uid}@vendmais.com`).trim().toLowerCase();
        let existing = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);

        if (existing.length === 0) {
          // Check by email
          existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (existing.length > 0) {
            await db.update(users).set({ uid: decoded.uid }).where(eq(users.id, existing[0].id));
          }
        }

        if (existing.length === 0) {
          const inserted = await db
            .insert(users)
            .values({
              uid: decoded.uid,
              email,
              name: decoded.name || email.split('@')[0],
              avatarUrl: decoded.picture || null,
              role: 'USER',
              status: 'ACTIVE',
              planSlug: 'free',
            })
            .returning();
          existing = inserted;
        }

        const u = existing[0];
        if (u.status === 'BLOCKED') {
          return res.status(403).json({ error: 'Conta bloqueada por motivos de segurança.' });
        }

        req.user = {
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          planSlug: u.planSlug,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          location: u.location,
        };
      }
    } catch {
      // Token not a valid Firebase token, ignore
    }

    next();
  } catch (err) {
    console.error('Error in authenticateUser middleware:', err);
    next();
  }
};

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado. Por favor, faça login para continuar.' });
  }
  next();
};

export const requireMasterOwner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado. Faça login.' });
  }
  if (req.user.role !== 'MASTER_OWNER') {
    return res.status(403).json({ error: 'Acesso restrito ao Master Owner da plataforma.' });
  }
  next();
};

export const requireDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado. Faça login.' });
  }
  if (req.user.role !== 'DELIVERY_DRIVER' && req.user.role !== 'MASTER_OWNER') {
    return res.status(403).json({ error: 'Acesso restrito a entregadores credenciados.' });
  }
  next();
};
