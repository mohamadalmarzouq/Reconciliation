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
        account_number VARCHAR(50)
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
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
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
