CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"runtime" varchar(32) NOT NULL,
	"source_url" text NOT NULL,
	"entry_command" text NOT NULL,
	"assigned_worker_id" uuid,
	"exposed_port" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"cloud" varchar(32) DEFAULT 'aws' NOT NULL,
	"region" varchar(64) NOT NULL,
	"state" varchar(32) DEFAULT 'idle' NOT NULL,
	"instance_id" varchar(128),
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_worker_id_workers_id_fk" FOREIGN KEY ("assigned_worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;