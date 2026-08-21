import {
  boolean,
  date,
  decimal,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Conta de autenticação técnica da plataforma. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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

/** Sexo informado para a entidade de domínio identificada por CPF. */
export const userSex = mysqlEnum("user_sex", [
  "feminino",
  "masculino",
  "outro",
  "nao_informar",
]);

/** Pessoa física proprietária, separada da conta técnica de autenticação. */
export const usuarios = mysqlTable(
  "usuarios",
  {
    cpf: varchar("cpf", { length: 11 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    sex: userSex.notNull().default("nao_informar"),
    createdById: int("createdById").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("usuarios_creator_idx").on(table.createdById)]
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

/** Relação muitos-para-muitos entre pessoas físicas e propriedades rurais. */
export const usuarioPropriedade = mysqlTable(
  "usuarioPropriedade",
  {
    userCpf: varchar("userCpf", { length: 11 }).notNull(),
    propertyId: int("propertyId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.userCpf, table.propertyId], name: "usuario_propriedade_pk" }),
    index("usuario_propriedade_property_idx").on(table.propertyId),
    foreignKey({
      columns: [table.userCpf],
      foreignColumns: [usuarios.cpf],
      name: "usuario_propriedade_cpf_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [ruralProperties.id],
      name: "usuario_propriedade_property_fk",
    }).onDelete("cascade"),
  ]
);

export const financialEntryType = mysqlEnum("financial_entry_type", [
  "receita",
  "custo_producao",
  "custo_fixo",
  "custo_variavel",
  "despesa_administrativa",
  "imposto",
  "deducao",
]);

export const financialSettlementStatus = mysqlEnum("financial_settlement_status", [
  "liquidado",
  "pendente",
]);

export const financialEntries = mysqlTable(
  "financialEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    propertyId: int("propertyId").notNull(),
    createdById: int("createdById").notNull(),
    entryType: financialEntryType.notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    activity: varchar("activity", { length: 120 }).notNull().default("Não informada"),
    description: text("description").notNull(),
    occurredOn: date("occurredOn").notNull(),
    dueOn: date("dueOn"),
    settlementStatus: financialSettlementStatus.notNull().default("liquidado"),
    settledOn: date("settledOn"),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("financial_entries_property_date_idx").on(table.propertyId, table.occurredOn),
    index("financial_entries_property_activity_date_idx").on(
      table.propertyId,
      table.activity,
      table.occurredOn
    ),
    index("financial_entries_property_status_idx").on(table.propertyId, table.settlementStatus),
    index("financial_entries_creator_idx").on(table.createdById),
  ]
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioPropriedade = typeof usuarioPropriedade.$inferSelect;
export type RuralProperty = typeof ruralProperties.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
