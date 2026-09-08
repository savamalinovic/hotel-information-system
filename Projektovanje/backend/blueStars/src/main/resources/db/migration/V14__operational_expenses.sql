CREATE TABLE efikas.expense_category (
    "ExpenseCategoryId" serial PRIMARY KEY,
    "Name" varchar(80) NOT NULL,
    "Description" varchar(300),
    "Active" boolean NOT NULL DEFAULT true,
    "CreatedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" integer NOT NULL,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_category_created_by FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_expense_category_updated_by FOREIGN KEY ("UpdatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT expense_category_name_check CHECK (length(btrim("Name")) > 0),
    CONSTRAINT expense_category_update_time_check CHECK ("UpdatedAt" >= "CreatedAt")
);

CREATE UNIQUE INDEX uq_expense_category_name_ci ON efikas.expense_category (lower("Name"));
CREATE INDEX idx_expense_category_active_name ON efikas.expense_category ("Active", "Name");

CREATE TABLE efikas.operational_expense (
    "OperationalExpenseId" bigserial PRIMARY KEY,
    "ExpenseCategoryId" integer NOT NULL,
    "Name" varchar(120) NOT NULL,
    "Description" varchar(1000),
    "Amount" numeric(14, 2) NOT NULL,
    "ExpenseDate" date NOT NULL,
    "CreatedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "VoidedBy" integer,
    "VoidedAt" timestamptz,
    "VoidReason" varchar(300),
    CONSTRAINT fk_operational_expense_category FOREIGN KEY ("ExpenseCategoryId")
        REFERENCES efikas.expense_category ("ExpenseCategoryId") ON DELETE RESTRICT,
    CONSTRAINT fk_operational_expense_created_by FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_operational_expense_voided_by FOREIGN KEY ("VoidedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT operational_expense_name_check CHECK (length(btrim("Name")) > 0),
    CONSTRAINT operational_expense_amount_check CHECK ("Amount" > 0),
    CONSTRAINT operational_expense_void_pair_check CHECK (
        ("VoidedAt" IS NULL AND "VoidedBy" IS NULL AND "VoidReason" IS NULL)
        OR ("VoidedAt" IS NOT NULL AND "VoidedBy" IS NOT NULL AND "VoidReason" IS NOT NULL
            AND length(btrim("VoidReason")) > 0)
    )
);

CREATE INDEX idx_operational_expense_date
    ON efikas.operational_expense ("ExpenseDate" DESC, "OperationalExpenseId" DESC);
CREATE INDEX idx_operational_expense_category_date
    ON efikas.operational_expense ("ExpenseCategoryId", "ExpenseDate" DESC);
CREATE INDEX idx_operational_expense_author_date
    ON efikas.operational_expense ("CreatedBy", "ExpenseDate" DESC);

CREATE OR REPLACE FUNCTION efikas.require_active_expense_manager(actor_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
BEGIN
    SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
    FROM efikas.app_user app_user WHERE app_user."UserId" = actor_id;
    IF actor_role IS DISTINCT FROM 'MANAGER' OR actor_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Expense management requires an active manager.' USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION efikas.guard_expense_category_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM efikas.require_active_expense_manager(NEW."CreatedBy");
    IF NEW."UpdatedBy" <> NEW."CreatedBy" OR NEW."UpdatedAt" <> NEW."CreatedAt" OR NOT NEW."Active" THEN
        RAISE EXCEPTION 'A new expense category must be active and attributed to one manager.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_expense_category_insert
BEFORE INSERT ON efikas.expense_category
FOR EACH ROW EXECUTE FUNCTION efikas.guard_expense_category_insert();

CREATE OR REPLACE FUNCTION efikas.guard_expense_category_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."CreatedBy" <> OLD."CreatedBy" OR NEW."CreatedAt" <> OLD."CreatedAt"
            OR NEW."UpdatedAt" <= OLD."UpdatedAt" THEN
        RAISE EXCEPTION 'Expense category creation facts are immutable and updates require a new timestamp.'
            USING ERRCODE = '23514';
    END IF;
    PERFORM efikas.require_active_expense_manager(NEW."UpdatedBy");
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_expense_category_update
BEFORE UPDATE ON efikas.expense_category
FOR EACH ROW EXECUTE FUNCTION efikas.guard_expense_category_update();

CREATE OR REPLACE FUNCTION efikas.guard_operational_expense_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
    category_active boolean;
BEGIN
    SELECT category."Active" INTO category_active
    FROM efikas.expense_category category
    WHERE category."ExpenseCategoryId" = NEW."ExpenseCategoryId"
    FOR UPDATE;
    IF category_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Operational expense requires an active category.' USING ERRCODE = '23514';
    END IF;

    SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
    FROM efikas.app_user app_user WHERE app_user."UserId" = NEW."CreatedBy";
    IF actor_role NOT IN ('MANAGER', 'AGENT') OR actor_active IS DISTINCT FROM true
            OR NEW."ExpenseDate" > CURRENT_DATE OR NEW."VoidedBy" IS NOT NULL
            OR NEW."VoidedAt" IS NOT NULL OR NEW."VoidReason" IS NOT NULL THEN
        RAISE EXCEPTION 'Only an active manager or agent can record a current or past expense.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_operational_expense_insert
BEFORE INSERT ON efikas.operational_expense
FOR EACH ROW EXECUTE FUNCTION efikas.guard_operational_expense_insert();

CREATE OR REPLACE FUNCTION efikas.guard_operational_expense_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."ExpenseCategoryId" <> OLD."ExpenseCategoryId" OR NEW."Name" <> OLD."Name"
            OR NEW."Description" IS DISTINCT FROM OLD."Description" OR NEW."Amount" <> OLD."Amount"
            OR NEW."ExpenseDate" <> OLD."ExpenseDate" OR NEW."CreatedBy" <> OLD."CreatedBy"
            OR NEW."CreatedAt" <> OLD."CreatedAt" OR OLD."VoidedAt" IS NOT NULL
            OR NEW."VoidedAt" IS NULL OR NEW."VoidedBy" IS NULL OR NEW."VoidReason" IS NULL
            OR length(btrim(NEW."VoidReason")) = 0 THEN
        RAISE EXCEPTION 'Operational expenses are immutable and can only be voided once.'
            USING ERRCODE = '23514';
    END IF;
    PERFORM efikas.require_active_expense_manager(NEW."VoidedBy");
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_operational_expense_update
BEFORE UPDATE ON efikas.operational_expense
FOR EACH ROW EXECUTE FUNCTION efikas.guard_operational_expense_update();

CREATE OR REPLACE FUNCTION efikas.reject_operational_expense_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operational expense history cannot be deleted.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_reject_expense_category_delete
BEFORE DELETE ON efikas.expense_category
FOR EACH ROW EXECUTE FUNCTION efikas.reject_operational_expense_delete();

CREATE TRIGGER trg_reject_operational_expense_delete
BEFORE DELETE ON efikas.operational_expense
FOR EACH ROW EXECUTE FUNCTION efikas.reject_operational_expense_delete();
