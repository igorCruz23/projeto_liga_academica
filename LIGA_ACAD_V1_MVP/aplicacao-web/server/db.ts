import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  financialEntries,
  InsertUser,
  ruralProperties,
  usuarioPropriedade,
  usuarios,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("A ligação ao banco de dados não está disponível.");
  return db;
}

export async function getUserProfile(userId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function saveUserProfile(
  userId: number,
  profileRole: (typeof userProfiles.$inferInsert)["profileRole"]
) {
  const db = await requireDb();
  await db
    .insert(userProfiles)
    .values({ userId, profileRole })
    .onDuplicateKeyUpdate({ set: { profileRole, updatedAt: new Date() } });
  return getUserProfile(userId);
}

export async function listDomainUsersByCreator(createdById: number) {
  const db = await requireDb();
  return db
    .select()
    .from(usuarios)
    .where(eq(usuarios.createdById, createdById))
    .orderBy(desc(usuarios.createdAt));
}

export async function getDomainUserByCpf(cpf: string, createdById: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.cpf, cpf), eq(usuarios.createdById, createdById)))
    .limit(1);
  return result[0] ?? null;
}

export async function createDomainUser(
  values: Omit<typeof usuarios.$inferInsert, "createdAt" | "updatedAt">
) {
  const db = await requireDb();
  await db.insert(usuarios).values(values);
  return getDomainUserByCpf(values.cpf, values.createdById);
}

export async function listPropertyDomainUsers(propertyId: number) {
  const db = await requireDb();
  return db
    .select({ cpf: usuarios.cpf, name: usuarios.name, sex: usuarios.sex })
    .from(usuarioPropriedade)
    .innerJoin(usuarios, eq(usuarioPropriedade.userCpf, usuarios.cpf))
    .where(eq(usuarioPropriedade.propertyId, propertyId))
    .orderBy(usuarios.name);
}

async function assertDomainUsersInTransaction(
  tx: any,
  userCpfs: string[],
  createdById: number
) {
  const selectedUsers = await tx
    .select({ cpf: usuarios.cpf })
    .from(usuarios)
    .where(and(inArray(usuarios.cpf, userCpfs), eq(usuarios.createdById, createdById)));
  if (selectedUsers.length !== userCpfs.length) {
    throw new Error("Um ou mais utilizadores selecionados não estão disponíveis para esta conta.");
  }
}

export async function listPropertiesByOwner(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(ruralProperties)
    .where(and(eq(ruralProperties.ownerId, ownerId), eq(ruralProperties.isActive, true)))
    .orderBy(desc(ruralProperties.createdAt));
}

export async function getOwnedProperty(propertyId: number, ownerId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.id, propertyId),
        eq(ruralProperties.ownerId, ownerId),
        eq(ruralProperties.isActive, true)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function getActivePropertyById(propertyId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(ruralProperties)
    .where(and(eq(ruralProperties.id, propertyId), eq(ruralProperties.isActive, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function createProperty(
  ownerId: number,
  values: Omit<typeof ruralProperties.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">
) {
  const db = await requireDb();
  const result = await db.insert(ruralProperties).values({ ownerId, ...values });
  const createdId = Number(result[0].insertId);
  return getOwnedProperty(createdId, ownerId);
}

export async function createPropertyWithUsers(
  ownerId: number,
  values: Omit<typeof ruralProperties.$inferInsert, "id" | "ownerId" | "createdAt" | "updatedAt">,
  userCpfs: string[]
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await assertDomainUsersInTransaction(tx, userCpfs, ownerId);
    const result = await tx.insert(ruralProperties).values({ ownerId, ...values });
    const propertyId = Number(result[0].insertId);
    await tx.insert(usuarioPropriedade).values(
      userCpfs.map(userCpf => ({ userCpf, propertyId }))
    );
    const property = await tx
      .select()
      .from(ruralProperties)
      .where(eq(ruralProperties.id, propertyId))
      .limit(1);
    return property[0] ?? null;
  });
}

export async function addUsersToProperty(propertyId: number, ownerId: number, userCpfs: string[]) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await assertDomainUsersInTransaction(tx, userCpfs, ownerId);
    for (const userCpf of userCpfs) {
      const existing = await tx
        .select({ userCpf: usuarioPropriedade.userCpf })
        .from(usuarioPropriedade)
        .where(and(eq(usuarioPropriedade.userCpf, userCpf), eq(usuarioPropriedade.propertyId, propertyId)))
        .limit(1);
      if (!existing.length) await tx.insert(usuarioPropriedade).values({ userCpf, propertyId });
    }
  });
  return listPropertyDomainUsers(propertyId);
}

type PropertyDeactivationDatabase = {
  update: (table: typeof ruralProperties) => {
    set: (values: { isActive: false; updatedAt: Date }) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
};

export async function deactivatePropertyWithDb(
  db: PropertyDeactivationDatabase,
  propertyId: number,
  updatedAt = new Date()
) {
  await db
    .update(ruralProperties)
    .set({ isActive: false, updatedAt })
    .where(eq(ruralProperties.id, propertyId));
}

export async function deactivateProperty(propertyId: number) {
  const db = await requireDb();
  await deactivatePropertyWithDb(db as unknown as PropertyDeactivationDatabase, propertyId);
  return getActivePropertyById(propertyId);
}

export async function listPropertyEntries(
  propertyId: number,
  startDate: string,
  endDate: string
) {
  const db = await requireDb();
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  return db
    .select()
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.propertyId, propertyId),
        gte(financialEntries.occurredOn, start),
        lte(financialEntries.occurredOn, end)
      )
    )
    .orderBy(desc(financialEntries.occurredOn), desc(financialEntries.id));
}

export async function createFinancialEntry(
  values: Omit<typeof financialEntries.$inferInsert, "id" | "createdAt" | "updatedAt">
) {
  const db = await requireDb();
  const result = await db.insert(financialEntries).values(values);
  const createdId = Number(result[0].insertId);
  const created = await db
    .select()
    .from(financialEntries)
    .where(eq(financialEntries.id, createdId))
    .limit(1);
  return created[0] ?? null;
}

export async function getPropertyEntry(entryId: number, propertyId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(financialEntries)
    .where(and(eq(financialEntries.id, entryId), eq(financialEntries.propertyId, propertyId)))
    .limit(1);
  return result[0] ?? null;
}

export async function updateFinancialEntry(
  entryId: number,
  values: Partial<Omit<typeof financialEntries.$inferInsert, "id" | "propertyId" | "createdById" | "createdAt" | "updatedAt">>
) {
  const db = await requireDb();
  await db
    .update(financialEntries)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(financialEntries.id, entryId));

  const result = await db.select().from(financialEntries).where(eq(financialEntries.id, entryId)).limit(1);
  return result[0] ?? null;
}

export async function deleteFinancialEntry(entryId: number) {
  const db = await requireDb();
  await db.delete(financialEntries).where(eq(financialEntries.id, entryId));
}
