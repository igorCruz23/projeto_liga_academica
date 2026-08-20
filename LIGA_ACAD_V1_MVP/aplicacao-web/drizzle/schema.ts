import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfileRole = mysqlEnum("user_profile_role", [
  "produtor",
  "gestor",
  "estudante",
  "consultor",
  "administrador",
]);

export const userProfiles = mysqlTable(
  "userProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    profileRole: userProfileRole.notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("user_profiles_role_idx").on(table.profileRole)]
);

export const ruralProperties = mysqlTable(
  "ruralProperties",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    municipality: varchar("municipality", { length: 100 }),
    state: varchar("state", { length: 2 }),
    totalArea: decimal("totalArea", { precision: 12, scale: 2 }),
    mainActivity: varchar("mainActivity", { length: 120 }),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("rural_properties_owner_idx").on(table.ownerId)]
);

export const financialEntryType = mysqlEnum("financial_entry_type", [
  "receita",
  "custo_producao",
  "despesa_administrativa",
  "imposto",
  "deducao",
]);

export const financialEntries = mysqlTable(
  "financialEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    propertyId: int("propertyId").notNull(),
    createdById: int("createdById").notNull(),
    entryType: financialEntryType.notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description").notNull(),
    occurredOn: date("occurredOn").notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("financial_entries_property_date_idx").on(table.propertyId, table.occurredOn),
    index("financial_entries_creator_idx").on(table.createdById),
  ]
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type RuralProperty = typeof ruralProperties.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
