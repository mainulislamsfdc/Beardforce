import { AppConfig, User } from "../types";

// Helper for local mode delay simulation
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DatabaseService {
  private static STORAGE_PREFIX = 'bf_crm_db_';

  static async initialize() {
    console.log(`DatabaseService: Initialized. Mode: LOCAL`);
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
     // Local mode register = login
     return this.login(email, password);
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(this.STORAGE_PREFIX + 'user');
  }

  static getCurrentUser(): User | null {
    // For local persistence of session
    const u = localStorage.getItem(this.STORAGE_PREFIX + 'user');
    return u ? JSON.parse(u) : null;
  }

  // --- Configuration ---

  static async getConfig(): Promise<AppConfig | null> {
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

  static async getTable<T>(tableName: string): Promise<T[]> {
    await delay(100);
    const d = localStorage.getItem(this.STORAGE_PREFIX + tableName);
    return d ? JSON.parse(d) : [];
  }

  static async insert<T>(tableName: string, item: any): Promise<T> {
    await delay(200);
    const current = await this.getTable<T>(tableName);
    const updated = [...current, item];
    localStorage.setItem(this.STORAGE_PREFIX + tableName, JSON.stringify(updated));
    return item;
  }

  static async update<T extends { id: string }>(tableName: string, id: string, updates: Partial<T>): Promise<void> {
    await delay(200);
    const current = await this.getTable<T>(tableName);
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    localStorage.setItem(this.STORAGE_PREFIX + tableName, JSON.stringify(updated));
  }
}