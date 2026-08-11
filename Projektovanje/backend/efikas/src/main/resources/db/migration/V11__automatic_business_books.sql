CREATE TABLE efikas.income_book_entry (
    "IncomeBookEntryId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "ReceiptNumber" varchar(64) NOT NULL,
    "AccountingDate" date NOT NULL,
    "Description" varchar(160) NOT NULL,
    "ServiceSaleRevenue" numeric(12, 2) NOT NULL,
    "TotalRevenue" numeric(12, 2) NOT NULL,
    "VatAmount" numeric(12, 2) NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_income_book_entry_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT uq_income_book_entry_reservation UNIQUE ("ReservationId"),
    CONSTRAINT uq_income_book_entry_receipt_number UNIQUE ("ReceiptNumber"),
    CONSTRAINT income_book_entry_amounts_non_negative CHECK (
        "ServiceSaleRevenue" >= 0 AND "TotalRevenue" >= 0 AND "VatAmount" >= 0
    )
);

CREATE INDEX idx_income_book_entry_timeline
    ON efikas.income_book_entry ("AccountingDate" DESC, "IncomeBookEntryId" DESC);

CREATE OR REPLACE FUNCTION efikas.reject_income_book_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Income book entries are immutable.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_income_book_entry_immutable
BEFORE UPDATE OR DELETE ON efikas.income_book_entry
FOR EACH ROW
EXECUTE FUNCTION efikas.reject_income_book_entry_mutation();
