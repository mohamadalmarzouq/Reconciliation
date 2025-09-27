import { Pool } from 'pg'

let pool: Pool | null = null

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

export async function initializeDatabase() {
  const pool = getDatabasePool()
  
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_statements (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'uploaded',
        total_transactions INTEGER DEFAULT 0,
        matched_transactions INTEGER DEFAULT 0,
        unmatched_transactions INTEGER DEFAULT 0,
        confidence_score DECIMAL(3,2) DEFAULT 0.00,
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        account_name VARCHAR(100), -- User-friendly name for the account
        upload_session_id VARCHAR(100) -- Groups multiple statements uploaded together
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        bank_statement_id INTEGER REFERENCES bank_statements(id),
        date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        balance DECIMAL(12,2),
        type VARCHAR(10) NOT NULL,
        is_matched BOOLEAN DEFAULT FALSE,
        confidence DECIMAL(3,2),
        explanation TEXT,
        suggested_action VARCHAR(20),
        accounting_entry_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'flagged', 'under_review')),
        reviewed_by VARCHAR(100),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting_entries (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES transactions(id),
        entry_id VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        date DATE NOT NULL,
        account VARCHAR(100) NOT NULL,
        reference VARCHAR(100),
        entry_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_sessions (
        id SERIAL PRIMARY KEY,
        bank_statement_id INTEGER REFERENCES bank_statements(id),
        status VARCHAR(20) DEFAULT 'pending',
        total_matches INTEGER DEFAULT 0,
        total_unmatched INTEGER DEFAULT 0,
        ai_processing_time DECIMAL(8,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS xero_tokens (
      id SERIAL PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      tenant_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_actions (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
      action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('accept', 'reject', 'flag', 'note', 'undo')),
      previous_status VARCHAR(20),
      new_status VARCHAR(20),
      reviewer_name VARCHAR(100),
      reviewer_email VARCHAR(255),
      notes TEXT,
      confidence_before DECIMAL(3,2),
      confidence_after DECIMAL(3,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ip_address INET,
      user_agent TEXT
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reconciliation_reports (
      id SERIAL PRIMARY KEY,
      report_name VARCHAR(255) NOT NULL,
      report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('ai_sync', 'xero_sync', 'zoho_sync', 'manual')),
      bank_statement_id INTEGER REFERENCES bank_statements(id),
      reconciliation_session_id INTEGER REFERENCES reconciliation_sessions(id),
      status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'failed')),
      
      -- Report data
      summary_data JSONB NOT NULL,
      transaction_data JSONB NOT NULL,
      reconciliation_metadata JSONB,
      
      -- Metadata
      generated_by VARCHAR(100),
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_accessed TIMESTAMP WITH TIME ZONE,
      is_favorite BOOLEAN DEFAULT FALSE,
      tags TEXT[],
      
      -- File info (if applicable)
      original_filename VARCHAR(255),
      file_size INTEGER
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL CHECK (action IN ('accept', 'reject', 'flag')),
      account_code VARCHAR(50),
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sync_attempts (
      id SERIAL PRIMARY KEY,
      sync_queue_id INTEGER REFERENCES sync_queue(id) ON DELETE CASCADE,
      provider VARCHAR(20) NOT NULL CHECK (provider IN ('xero', 'zoho')),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      error_message TEXT,
      external_id VARCHAR(100), -- ID from Xero/Zoho after successful sync
      sync_response JSONB, -- Full response from the accounting software
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE
    )
  `)

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_bank_statement ON reconciliation_reports(bank_statement_id)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_transaction ON sync_queue(transaction_id)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sync_attempts_queue ON sync_attempts(sync_queue_id)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sync_attempts_provider ON sync_attempts(provider)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sync_attempts_status ON sync_attempts(status)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bank_statements_session ON bank_statements(upload_session_id)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reconciliation_reports(generated_at)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_type ON reconciliation_reports(report_type)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reports_favorite ON reconciliation_reports(is_favorite)
  `)

    console.log('Database tables initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
