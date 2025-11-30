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
    await delay(600);
    // Check simulated user registry
    const users = await this.getUsers();
    const found = users.find(u => u.email === email);
    
    if (found) {
        localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(found));
        return found;
    }

    // Fallback for default admin if registry is empty
    if (email === 'admin@test.com') {
        const admin: User = { id: 'u_admin', email, name: 'Admin', role: 'admin' };
        localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(admin));
        return admin;
    }

    throw new Error("Invalid credentials");
  }

  static async register(email: string, password: string): Promise<User> {
     await delay(600);
     const newUser: User = {
         id: Date.now().toString(),
         email,
         name: email.split('@')[0],
         role: 'admin'
     };
     await this.addUser(newUser);
     localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(newUser));
     return newUser;
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(this.STORAGE_PREFIX + 'user');
  }

  static getCurrentUser(): User | null {
    const u = localStorage.getItem(this.STORAGE_PREFIX + 'user');
    return u ? JSON.parse(u) : null;
  }

  // --- User Management ---
  static async getUsers(): Promise<User[]> {
      return this.getTable<User>('users');
  }

  static async addUser(user: User): Promise<void> {
      await this.insert('users', user);
  }

  static async deleteUser(id: string): Promise<void> {
      await delay(200);
      const users = await this.getUsers();
      const updated = users.filter(u => u.id !== id);
      localStorage.setItem(this.STORAGE_PREFIX + 'users', JSON.stringify(updated));
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