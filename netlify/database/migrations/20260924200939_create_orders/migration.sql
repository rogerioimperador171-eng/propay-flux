CREATE TABLE "orders" (
	"id" text PRIMARY KEY,
	"transaction_id" text,
	"method" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"amount_cents" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"items" jsonb NOT NULL,
	"tracking" jsonb,
	"purchase_tracked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
