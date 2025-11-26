CREATE TABLE "tasks"."task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"uploaded_by" integer,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false,
	"assigned_to" integer,
	"order_idx" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"user_id" integer,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_dependencies" (
	"task_id" integer,
	"depends_on" integer,
	CONSTRAINT "task_dependencies_task_id_depends_on_pk" PRIMARY KEY("task_id","depends_on")
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"name" text NOT NULL,
	"description" text,
	"data" jsonb NOT NULL,
	"created_by" integer,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"template_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[],
	"assigned_to" integer,
	"estimated_minutes" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"due_at" timestamp,
	"reminder_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tasks"."task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_checklists" ADD CONSTRAINT "task_checklists_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_checklists" ADD CONSTRAINT "task_checklists_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_tasks_id_fk" FOREIGN KEY ("depends_on") REFERENCES "tasks"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_templates" ADD CONSTRAINT "task_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "tasks"."task_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- DOWN
DROP TABLE "tasks"."task_dependencies";
--> statement-breakpoint
DROP TABLE "tasks"."task_checklists";
--> statement-breakpoint
DROP TABLE "tasks"."task_comments";
--> statement-breakpoint
DROP TABLE "tasks"."task_attachments";
--> statement-breakpoint
DROP TABLE "tasks"."tasks";
--> statement-breakpoint
DROP TABLE "tasks"."task_templates";