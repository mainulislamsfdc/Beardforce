import { SupabaseAdapter } from './SupabaseAdapter'
import { DatabaseService } from './DatabaseService'
import { DatabaseConfig } from './DatabaseAdapter'

// ImportMeta types are declared in services/supabase/client.ts to avoid duplication

// Initialize with Supabase by default
const config: DatabaseConfig = {
  type: 'supabase',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
}

const adapter = new SupabaseAdapter(config)
export const databaseService = new DatabaseService(adapter)

// Initialize connection
export async function initializeDatabase(userId: string) {
  databaseService.setUserId(userId)
  const connected = await databaseService.connect()
  
  if (!connected) {
    throw new Error('Failed to connect to database')
  }
  
  return databaseService
}