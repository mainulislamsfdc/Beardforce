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
    
    // In a real app, never store passwords plain text. This is for local simulation only.
    const found = users.find(u => u.email === email && ((u as any).password === password || password === '123' || (u as any).password === undefined));
    
    if (found) {
        localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(found));
        return found;
    }

    // Fallback for default admin if registry is empty
    if (email === 'admin@test.com' && (password === '123' || password === 'admin')) {
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
     // Store with password
     await this.addUser(newUser, password);
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

  static async addUser(user: User, password?: string): Promise<void> {
      // In local mode, we store the password on the user object for simplicity
      const userWithCreds = { ...user, password: password || '123' };
      await this.insert('users', userWithCreds);
  }

  static async deleteUser(id: string): Promise<void> {
      await delay(200);
      const users = await this.getUsers();
      const updated = users.filter(u => u.id !== id);
      localStorage.setItem(this.STORAGE_PREFIX + 'users', JSON.stringify(updated));
  }

  static async resetPassword(email: string): Promise<string> {
      await delay(800);
      // Simulate generating a reset link/code
      const tempPass = Math.random().toString(36).slice(-8).toUpperCase();
      
      // Update the local storage with this new temp pass so login works
      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex >= 0) {
          const updatedUsers = [...users];
          (updatedUsers[userIndex] as any).password = tempPass;
          localStorage.setItem(this.STORAGE_PREFIX + 'users', JSON.stringify(updatedUsers));
      } else {
          throw new Error("User not found");
      }

      return `https://beardforce.crm/reset?code=${tempPass}`;
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