import { db, persistDatabase } from '../../db/index.ts';
import { authEvents, users } from '../../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

export type AuthEventType =
  | 'USER_CREATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'ACCOUNT_UPDATED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED';

export interface LogAuthEventParams {
  eventType: AuthEventType;
  userId?: number | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | string | null;
}

/**
 * VEND_AUTH_MEMORY - Camada Central de Memória Permanente de Identidade do VEND+
 * 
 * Esta camada representa a base autoritativa e durável de contas e eventos de autenticação.
 * Garante que cada conta criada e evento de ciclo de vida permaneça registrado permanentemente.
 * NUNCA armazena senhas em texto puro ou hashes em logs de eventos.
 */
export class AuthDatabase {
  /**
   * Registra um evento de autenticação na base persistente VEND_AUTH_MEMORY.
   * Remove quaisquer campos sensíveis de segurança antes da gravação.
   */
  static async logEvent(params: LogAuthEventParams): Promise<void> {
    try {
      let sanitizedMeta: string | null = null;
      if (params.metadata) {
        if (typeof params.metadata === 'string') {
          sanitizedMeta = params.metadata;
        } else {
          // Clone and remove any sensitive field if present
          const copy = { ...params.metadata };
          delete copy.password;
          delete copy.passwordHash;
          delete copy.token;
          delete copy.tokenHash;
          sanitizedMeta = JSON.stringify(copy);
        }
      }

      await db.insert(authEvents).values({
        userId: params.userId || null,
        eventType: params.eventType,
        email: params.email ? params.email.trim().toLowerCase() : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: sanitizedMeta,
      });

      // Flushes to disk
      persistDatabase();
      console.log(`[VEND_AUTH_MEMORY] Evento registrado: ${params.eventType} (email: ${params.email || 'n/a'})`);
    } catch (err: any) {
      console.error('[VEND_AUTH_MEMORY] Erro ao gravar evento na memória persistente:', err.message);
    }
  }

  /**
   * Obtém histórico recente de eventos para auditoria ou diagnósticos
   */
  static async getRecentEvents(limit = 50) {
    try {
      return await db.select().from(authEvents).orderBy(desc(authEvents.createdAt)).limit(limit);
    } catch (err: any) {
      console.error('[VEND_AUTH_MEMORY] Erro ao buscar eventos recentes:', err.message);
      return [];
    }
  }

  /**
   * Obtém eventos de um usuário específico
   */
  static async getEventsForUser(userId: number, limit = 50) {
    try {
      return await db
        .select()
        .from(authEvents)
        .where(eq(authEvents.userId, userId))
        .orderBy(desc(authEvents.createdAt))
        .limit(limit);
    } catch (err: any) {
      console.error(`[VEND_AUTH_MEMORY] Erro ao buscar eventos do usuário ${userId}:`, err.message);
      return [];
    }
  }
}

export const VendAuthMemory = AuthDatabase;
export default AuthDatabase;
