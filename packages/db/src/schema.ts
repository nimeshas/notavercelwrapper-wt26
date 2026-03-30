import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workers = pgTable("workers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  cloud: varchar("cloud", { length: 32 }).notNull().default("aws"),
  region: varchar("region", { length: 64 }).notNull(),
  state: varchar("state", { length: 32 }).notNull().default("idle"),
  instanceId: varchar("instance_id", { length: 128 }),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: varchar("status", { length: 32 }).notNull().default("queued"),
  runtime: varchar("runtime", { length: 32 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  entryCommand: text("entry_command").notNull(),
  assignedWorkerId: uuid("assigned_worker_id").references(() => workers.id),
  exposedPort: integer("exposed_port"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
