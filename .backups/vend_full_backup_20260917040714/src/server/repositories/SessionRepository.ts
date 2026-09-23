import crypto from 'crypto';
import { db, persistDatabase } from '../../db/index.ts';
import { sessions, users } from '../../db/schema.ts';
import { eq, and, isNull } from 'drizzle-orm';
import { AuthDatabase } from './AuthDatabase.ts';

const SESSION_EXPIRY_DAYS = 30;

export interface SessionRecord {
  id: number;
  sessionId: string;
  userId: number;
  token: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export class SessionRepository {
  /**
   * Cria uma sessão criptograficamente segura para o usuário.
   * Registra o evento SESSION_CREATED no VEND_AUTH_MEMORY.
   */
  static async createSession(userId: number, ipAddress?: string, userAgent?: string) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const sessionId = 'vend_sess_' + crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
      const now = new Date();

      const [newSession] = await db
        .insert(sessions)
        .values({
          sessionId,
          userId,
          token,
          expiresAt,
          lastUsedAt: now,
          revokedAt: null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          createdAt: now,
        })
        .returning();

      persistDatabase();

      // Log event to persistent memory
      await AuthDatabase.logEvent({
        eventType: 'SESSION_CREATED',
        userId,
        ipAddress,
        userAgent,
        metadata: { sessionId, expiresAt: expiresAt.toISOString() },
      });

      console.log(`[AUTH SESSION CREATED] Sessão criada com sucesso para userId ${userId}`);
      return { token, sessionId, expiresAt };
    } catch (err: any) {
      console.error(`[AUTH SESSION ERROR] Falha ao criar sessão para userId ${userId}:`, err.message);
      throw err;
    }
  }

  /**
   * Valida o token da sessão contra o banco permanente:
   * 1. Verifica se existe
   * 2. Verifica se não foi revogada (revokedAt is null)
   * 3. Verifica expiração temporal
   * 4. Atualiza last_used_at
   * 5. Retorna o registro completo do usuário autenticado
   */
  static async validateSession(token: string) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token.trim()))
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const session = rows[0];

      // Check if session was revoked
      if (session.revokedAt) {
        console.log(`[AUTH SESSION VALIDATION] Sessão revogada em ${session.revokedAt}`);
        return null;
      }

      // Check expiration
      const expiry = new Date(session.expiresAt).getTime();
      const now = Date.now();
      if (expiry < now) {
        console.log(`[AUTH SESSION VALIDATION] Sessão expirada para userId ${session.userId}. Revogando.`);
        await this.revokeSession(token);
        return null;
      }

      // Fetch user
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (userRows.length === 0) {
        console.warn(`[AUTH SESSION VALIDATION] Sessão aponta para usuário inexistente id: ${session.userId}`);
        return null;
      }

      const user = userRows[0];

      // Update last_used_at on session
      await db
        .update(sessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(sessions.id, session.id))
        .catch(() => {});

      return user;
    } catch (err: any) {
      console.error('[AUTH SESSION ERROR] Erro na validação da sessão:', err.message);
      throw err;
    }
  }

  /**
   * Revoga uma sessão ativa (logout ou invalidação)
   */
  static async revokeSession(token: string) {
    if (!token) return;
    try {
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token.trim()))
        .limit(1);

      if (rows.length > 0) {
        const s = rows[0];
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.id, s.id));

        persistDatabase();

        await AuthDatabase.logEvent({
          eventType: 'SESSION_REVOKED',
          userId: s.userId,
          metadata: { sessionId: s.sessionId },
        });

        console.log(`[AUTH SESSION REVOKED] Sessão revogada com sucesso para userId ${s.userId}`);
      }
    } catch (err: any) {
      console.error('[AUTH SESSION ERROR] Erro ao revogar sessão:', err.message);
    }
  }

  /**
   * Revoga todas as sessões de um usuário (útil após alteração de senha)
   */
  static async revokeAllUserSessions(userId: number, exceptToken?: string) {
    try {
      const now = new Date();
      const userSessions = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

      for (const s of userSessions) {
        if (exceptToken && s.token === exceptToken) {
          continue;
        }
        await db
          .update(sessions)
          .set({ revokedAt: now })
          .where(eq(sessions.id, s.id));
      }

      persistDatabase();

      await AuthDatabase.logEvent({
        eventType: 'SESSION_REVOKED',
        userId,
        metadata: { reason: 'ALL_SESSIONS_REVOKED' },
      });

      console.log(`[AUTH SESSION REVOKED] Todas as sessões do usuário ${userId} foram revogadas.`);
    } catch (err: any) {
      console.error(`[AUTH SESSION ERROR] Erro ao revogar sessões do usuário ${userId}:`, err.message);
    }
  }
}

export default SessionRepository;
