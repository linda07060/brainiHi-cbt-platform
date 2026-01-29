-- Migration: create payments table for storing PayPal receipts and metadata
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
  plan VARCHAR(64),
  billingPeriod VARCHAR(16),
  amount DECIMAL NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  paypalOrderId VARCHAR(128),
  paypalCaptureId VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payerEmail VARCHAR(256),
  payerName VARCHAR(256),
  raw TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (paypalOrderId);
CREATE INDEX IF NOT EXISTS idx_payments_capture_id ON payments (paypalCaptureId);