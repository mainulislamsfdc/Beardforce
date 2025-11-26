import { AppConfig, User } from "../types";

// Simulating a DB response delay for local mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DatabaseService {
  private static STORAGE_PREFIX = 'bf_crm_db_';
  
  static async initialize() {
    console.log("DatabaseService: Initialized in Local Mode");
  }

  // --- Auth ---

  static async login(email: string, password: string): Promise<User> {
    // Local Mode
    await delay(600);
    if (email && password) {
      const user: User = {
        id: 'u_local',
        email,
        name: email.split('@')[0],
        role: 'admin'
      };
      localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(user));
      return user;
    }
    throw new Error("Invalid credentials");
  }

  static async register(email: string, password: string): Promise<User> {
     // For local mode, register is same as login (auto-create)
     return this.login(email, password);
  }

  static async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(this.STORAGE_PREFIX + 'user');
  }

  static getCurrentUser(): User | null {
    const u = localStorage.getItem(this.STORAGE_PREFIX + 'user');
    return u ? JSON.parse(u) : null;
  }

  // --- Configuration ---

  static async getConfig(): Promise<AppConfig | null> {
    // Config is stored locally
    const c = localStorage.getItem(this.STORAGE_PREFIX + 'config');
    return c ? JSON.parse(c) : null;
  }

  static async saveConfig(config: AppConfig): Promise<void> {
    localStorage.setItem(this.STORAGE_PREFIX + 'config', JSON.stringify(config));
  }

  static async resetAll(): Promise<void> {
    localStorage.clear();
    window.location.reload(); 
  }

  // --- Data Operations ---

  static async getTable<T>(table: string): Promise<T[]> {
    await delay(100);
    const d = localStorage.getItem(this.STORAGE_PREFIX + table);
    return d ? JSON.parse(d) : [];
  }

  static async insert<T>(table: string, item: T): Promise<T> {
    await delay(200);
    const current = await this.getTable<T>(table);
    const updated = [...current, item];
    localStorage.setItem(this.STORAGE_PREFIX + table, JSON.stringify(updated));
    return item;
  }

  static async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<void> {
    await delay(200);
    const current = await this.getTable<T>(table);
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    localStorage.setItem(this.STORAGE_PREFIX + table, JSON.stringify(updated));
  }
}