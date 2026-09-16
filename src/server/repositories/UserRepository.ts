import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, persistDatabase } from '../../db/index.ts';
import { users, profiles } from '../../db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { normalizeEmail } from '../../utils/normalizeEmail.ts';
import { AuthDatabase } from './AuthDatabase.ts';
import { SessionRepository } from './SessionRepository.ts';

export interface CreateUserData {
  email: string;
  username?: string;
  password?: string;
  passwordHash?: string;
  name: string;
  phone?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  role?: 'USER' | 'MASTER_OWNER' | 'DELIVERY_DRIVER';
  status?: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  planSlug?: string;
  uid?: string;
  metadata?: string | null;
}

export interface SafeUser {
  id: number;
  uid: string;
  username: string | null;
  email: string;
  normalizedEmail: string;
  name: string;
  role: string;
  status: string;
  planSlug: string;
  phone: string | null;
  avatarUrl: string | null;
  location: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  /**
   * Generates a clean, unique username fallback if none was provided
   */
  private static generateDefaultUsername(name: string, email: string): string {
    const fromEmail = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (fromEmail.length >= 3) {
      return fromEmail;
    }
    const fromName = name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    return (fromName.length >= 3 ? fromName : 'vend_user') + '_' + Math.floor(100 + Math.random() * 900);
  }

  /**
   * Finds a user by normalized email.
   * Performs an exact match first, and falls back to a case-insensitive,
   * whitespace-trimmed SQL lookup to ensure no legacy or untrimmed account is missed.
   */
  static async findByEmail(rawEmail: string) {
    const cleanEmail = normalizeEmail(rawEmail);
    if (!cleanEmail) {
      return null;
    }

    console.log(`[AUTH USER LOOKUP] Buscando conta para: ${cleanEmail}`);

    try {
      // 1. Direct normalizedEmail lookup
      const byNorm = await db
        .select()
        .from(users)
        .where(eq(users.normalizedEmail, cleanEmail))
        .limit(1);

      if (byNorm.length > 0) {
        console.log(`[AUTH USER FOUND] Usuário localizado via normalizedEmail: id ${byNorm[0].id}`);
        return byNorm[0];
      }

      // 2. Direct email lookup
      const direct = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (direct.length > 0) {
        console.log(`[AUTH USER FOUND] Usuário localizado via email direto: id ${direct[0].id}`);
        // Ensure normalizedEmail is filled
        if (!direct[0].normalizedEmail) {
          await db
            .update(users)
            .set({ normalizedEmail: cleanEmail })
            .where(eq(users.id, direct[0].id))
            .catch(() => {});
        }
        return direct[0];
      }

      // 3. Fallback lookup: in-memory scan across users to find any legacy account with case/space variations
      const allUsers = await db.select().from(users);
      const found = allUsers.find((u) => normalizeEmail(u.email) === cleanEmail);

      if (found) {
        console.log(`[AUTH USER FOUND] Usuário localizado via normalização fallback: id ${found.id}`);

        // Automatically fix the stored email and normalizedEmail in the database
        try {
          await db
            .update(users)
            .set({ email: cleanEmail, normalizedEmail: cleanEmail, updatedAt: new Date() })
            .where(eq(users.id, found.id));
          found.email = cleanEmail;
          found.normalizedEmail = cleanEmail;
          persistDatabase();
          console.log(`[AUTH USER LOOKUP] Email da conta id ${found.id} atualizado para formato normalizado: ${cleanEmail}`);
        } catch (updateErr: any) {
          console.warn('[AUTH USER LOOKUP] Aviso ao normalizar email legado:', updateErr.message);
        }
        return found;
      }

      console.log(`[AUTH USER NOT FOUND] Nenhuma conta encontrada para o email: ${cleanEmail}`);
      return null;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usuário por email (${cleanEmail}):`, err.message);
      throw err;
    }
  }

  /**
   * Finds a user by username (case-insensitive)
   */
  static async findByUsername(rawUsername: string) {
    if (!rawUsername || typeof rawUsername !== 'string') {
      return null;
    }
    const cleanUsername = rawUsername.trim().toLowerCase();
    try {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.username, cleanUsername))
        .limit(1);

      if (rows.length > 0) {
        return rows[0];
      }

      // In-memory fallback
      const allUsers = await db.select().from(users);
      return allUsers.find((u) => u.username && u.username.trim().toLowerCase() === cleanUsername) || null;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usuário por username:`, err.message);
      return null;
    }
  }

  /**
   * Finds a user by ID
   */
  static async findById(id: number) {
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usuário por ID (${id}):`, err.message);
      throw err;
    }
  }

  /**
   * Creates a new user in the persistent store.
   * Logs USER_CREATED event to VEND_AUTH_MEMORY.
   */
  static async createUser(data: CreateUserData) {
    const cleanEmail = normalizeEmail(data.email);
    if (!cleanEmail) {
      throw new Error('E-mail inválido ou vazio para criação de conta.');
    }

    // 1. Strict duplicate check before insert
    const existing = await this.findByEmail(cleanEmail);
    if (existing) {
      console.warn(`[AUTH REGISTER] Tentativa de duplicar conta existente para email: ${cleanEmail}`);
      throw new Error(`CONTA_JA_EXISTE: O e-mail "${cleanEmail}" já possui uma conta cadastrada no VEND+.`);
    }

    console.log(`[AUTH REGISTER] Criando nova conta oficial para email: ${cleanEmail}`);

    let passwordHash = data.passwordHash;
    if (!passwordHash && data.password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(data.password, salt);
    }

    const uid = data.uid || ('vend_' + crypto.randomUUID());
    
    // 2. Ensure username uniqueness
    let finalUsername = data.username ? data.username.trim().toLowerCase() : null;
    if (finalUsername) {
      const existingUserByUsername = await this.findByUsername(finalUsername);
      if (existingUserByUsername) {
        throw new Error(`USERNAME_JA_EXISTE: O nome de usuário "${finalUsername}" já está em uso.`);
      }
    } else {
      let candidate = this.generateDefaultUsername(data.name, cleanEmail);
      let count = 1;
      while (await this.findByUsername(candidate)) {
        candidate = `${this.generateDefaultUsername(data.name, cleanEmail)}_${count++}`;
      }
      finalUsername = candidate;
    }

    try {
      const [newUser] = await db
        .insert(users)
        .values({
          uid,
          username: finalUsername,
          email: cleanEmail,
          normalizedEmail: cleanEmail,
          passwordHash: passwordHash || null,
          name: data.name.trim(),
          phone: data.phone ? data.phone.trim() : null,
          location: data.location ? data.location.trim() : 'Brasil',
          avatarUrl: data.avatarUrl || null,
          role: data.role || 'USER',
          status: data.status || 'ACTIVE',
          planSlug: data.planSlug || 'free',
          emailVerified: false,
          metadata: data.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Immediately flush and persist to permanent disk store
      persistDatabase();
      console.log(`[AUTH REGISTER] Conta criada e persistida com sucesso! id: ${newUser.id}`);

      // Log event in VEND_AUTH_MEMORY (never records password or hash)
      await AuthDatabase.logEvent({
        eventType: 'USER_CREATED',
        userId: newUser.id,
        email: cleanEmail,
        metadata: {
          username: newUser.username,
          role: newUser.role,
          name: newUser.name,
        },
      });

      return newUser;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Falha ao persistir novo usuário (${cleanEmail}):`, err.message);
      throw err;
    }
  }

  /**
   * Updates an existing user record
   */
  static async updateUser(id: number, data: Partial<CreateUserData>) {
    try {
      const updates: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (data.email !== undefined) {
        const clean = normalizeEmail(data.email);
        updates.email = clean;
        updates.normalizedEmail = clean;
      }
      if (data.username !== undefined) updates.username = data.username ? data.username.trim().toLowerCase() : null;
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.phone !== undefined) updates.phone = data.phone ? data.phone.trim() : null;
      if (data.location !== undefined) updates.location = data.location ? data.location.trim() : null;
      if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
      if (data.role !== undefined) updates.role = data.role;
      if (data.status !== undefined) updates.status = data.status;
      if (data.planSlug !== undefined) updates.planSlug = data.planSlug;

      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        updates.passwordHash = await bcrypt.hash(data.password, salt);
      } else if (data.passwordHash !== undefined) {
        updates.passwordHash = data.passwordHash;
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      persistDatabase();

      await AuthDatabase.logEvent({
        eventType: 'ACCOUNT_UPDATED',
        userId: id,
        email: updated?.email,
        metadata: { updatedFields: Object.keys(updates) },
      });

      return updated || null;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Falha ao atualizar usuário id ${id}:`, err.message);
      throw err;
    }
  }

  /**
   * Updates password securely and logs PASSWORD_CHANGED
   */
  static async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      persistDatabase();

      const user = await this.findById(userId);

      await AuthDatabase.logEvent({
        eventType: 'PASSWORD_CHANGED',
        userId,
        email: user?.email,
      });

      console.log(`[AUTH] Senha do usuário id ${userId} alterada com sucesso.`);
      return true;
    } catch (err: any) {
      console.error(`[AUTH DATABASE ERROR] Erro ao atualizar senha do usuário id ${userId}:`, err.message);
      throw err;
    }
  }

  /**
   * Records a successful login: updates lastLoginAt and logs LOGIN_SUCCESS
   */
  static async recordLogin(userId: number, ipAddress?: string, userAgent?: string) {
    try {
      const now = new Date();
      await db
        .update(users)
        .set({ lastLoginAt: now })
        .where(eq(users.id, userId))
        .catch(() => {});

      const user = await this.findById(userId);

      await AuthDatabase.logEvent({
        eventType: 'LOGIN_SUCCESS',
        userId,
        email: user?.email,
        ipAddress,
        userAgent,
      });

      persistDatabase();
    } catch (err: any) {
      console.warn('[AUTH] Falha ao registrar lastLoginAt:', err.message);
    }
  }

  /**
   * Records a failed login attempt for security monitoring
   */
  static async recordLoginFailure(email: string, reason: string, ipAddress?: string, userAgent?: string) {
    try {
      await AuthDatabase.logEvent({
        eventType: 'LOGIN_FAILED',
        email: normalizeEmail(email),
        ipAddress,
        userAgent,
        metadata: { reason },
      });
    } catch (err: any) {
      console.warn('[AUTH] Falha ao registrar tentativa falha de login:', err.message);
    }
  }

  /**
   * Verifies password against hash safely without logging secrets
   */
  static async verifyPassword(password: string, passwordHash?: string | null): Promise<boolean> {
    if (!password || !passwordHash) {
      console.log('[AUTH PASSWORD CHECK] Falha: senha ou hash ausente.');
      return false;
    }
    try {
      const isValid = await bcrypt.compare(password, passwordHash);
      console.log(`[AUTH PASSWORD CHECK] Validação concluída: ${isValid ? 'SENHA CORRETA' : 'SENHA INCORRETA'}`);
      return isValid;
    } catch (err: any) {
      console.error('[AUTH DATABASE ERROR] Erro na verificação criptográfica de senha:', err.message);
      return false;
    }
  }

  /**
   * Lists all users
   */
  static async listUsers() {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (err: any) {
      console.error('[AUTH DATABASE ERROR] Falha ao listar usuários:', err.message);
      throw err;
    }
  }

  /**
   * Session delegations for backward compatibility
   */
  static async createSession(userId: number, ipAddress?: string, userAgent?: string) {
    return SessionRepository.createSession(userId, ipAddress, userAgent);
  }

  static async validateSession(token: string) {
    return SessionRepository.validateSession(token);
  }

  static async deleteSession(token: string) {
    return SessionRepository.revokeSession(token);
  }

  /**
   * ensureMasterOwner():
   * 1. verificar se existe o Master Owner;
   * 2. se existir, não duplicar;
   * 3. se não existir, criar através das credenciais configuradas como segredo do servidor;
   * 4. armazenar somente password_hash;
   * 5. registrar created_at;
   * 6. registrar role = MASTER_OWNER;
   * 7. impedir duplicação.
   */
  static async ensureMasterOwner(): Promise<any> {
    const masterEmail = normalizeEmail(process.env.MASTER_OWNER_EMAIL || 'alifergael76@gmail.com');
    const masterPassword = process.env.MASTER_OWNER_PASSWORD || 'VendMais@2026';

    console.log(`[AUTH MASTER OWNER] Verificando integridade da conta Master Owner: ${masterEmail}`);

    try {
      const existing = await this.findByEmail(masterEmail);

      if (existing) {
        console.log(`[AUTH MASTER OWNER] Master Owner existente identificado (id: ${existing.id}). Nenhuma duplicação criada.`);
        if (existing.role !== 'MASTER_OWNER') {
          await db
            .update(users)
            .set({ role: 'MASTER_OWNER', updatedAt: new Date() })
            .where(eq(users.id, existing.id));
          existing.role = 'MASTER_OWNER';
          persistDatabase();
        }
        return existing;
      }

      // If not found, create new master owner
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(masterPassword, salt);
      const now = new Date();

      const [newMaster] = await db
        .insert(users)
        .values({
          uid: 'vend_master_owner_primary',
          username: 'master_owner',
          email: masterEmail,
          normalizedEmail: masterEmail,
          passwordHash,
          name: 'Master Owner VEND+',
          phone: '(11) 99999-0000',
          location: 'São Paulo, SP',
          role: 'MASTER_OWNER',
          status: 'ACTIVE',
          planSlug: 'lendario',
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      persistDatabase();

      await AuthDatabase.logEvent({
        eventType: 'USER_CREATED',
        userId: newMaster.id,
        email: masterEmail,
        metadata: { role: 'MASTER_OWNER', reason: 'PRIMARY_MASTER_INITIALIZATION' },
      });

      console.log(`[AUTH MASTER OWNER] Conta Master Owner criada com sucesso (id: ${newMaster.id})`);
      return newMaster;
    } catch (err: any) {
      console.error('[AUTH MASTER OWNER ERROR] Erro ao assegurar Master Owner:', err.message);
      throw err;
    }
  }

  /**
   * Sanitizes user object to safely send over the network.
   * NEVER returns password or passwordHash.
   */
  static sanitizeUser(user: any): SafeUser {
    return {
      id: user.id,
      uid: user.uid,
      username: user.username || null,
      email: user.email,
      normalizedEmail: user.normalizedEmail || normalizeEmail(user.email),
      name: user.name,
      role: user.role,
      status: user.status,
      planSlug: user.planSlug,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      location: user.location || null,
      emailVerified: Boolean(user.emailVerified),
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
    };
  }
}

export default UserRepository;
