import { AppConfig, Campaign, Expense, Lead, SystemLog, Ticket, User, TicketStatus, AgentRole } from "../types";

// Simulating a DB response delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_CONFIG: AppConfig = {
  businessName: "BeardForce CRM",
  industry: "Men's Grooming",
  agentNames: {
    [AgentRole.CEO]: "The Chief",
    [AgentRole.SALES]: "Sales Lead",
    [AgentRole.MARKETING]: "Growth Lead",
    [AgentRole.IT]: "Tech Lead",
    [AgentRole.USER]: "You"
  },
  themeColor: "amber"
};

// --- DB Service Implementation ---

export class DatabaseService {
  private static STORAGE_PREFIX = 'bf_crm_db_';

  // --- Auth ---

  static async login(email: string, password: string): Promise<User> {
    await delay(600); // Simulate network
    // Mock Auth
    if (email && password) {
      const user: User = {
        id: 'u_1',
        email,
        name: email.split('@')[0],
        role: 'admin'
      };
      localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(user));
      return user;
    }
    throw new Error("Invalid credentials");
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
    const c = localStorage.getItem(this.STORAGE_PREFIX + 'config');
    return c ? JSON.parse(c) : null;
  }

  static async saveConfig(config: AppConfig): Promise<void> {
    await delay(300);
    localStorage.setItem(this.STORAGE_PREFIX + 'config', JSON.stringify(config));
  }

  static async resetAll(): Promise<void> {
    await delay(500);
    // Clear everything except maybe specific system flags if needed
    localStorage.clear();
  }

  // --- Generic Data Operations (Simulating SQL/NoSQL) ---

  private static getData<T>(table: string): T[] {
    const d = localStorage.getItem(this.STORAGE_PREFIX + table);
    return d ? JSON.parse(d) : [];
  }

  private static saveData<T>(table: string, data: T[]) {
    localStorage.setItem(this.STORAGE_PREFIX + table, JSON.stringify(data));
  }

  static async getTable<T>(table: string): Promise<T[]> {
    await delay(100); // Fast read
    return this.getData<T>(table);
  }

  static async insert<T>(table: string, item: T): Promise<T> {
    await delay(200); // Simulate write latency
    const current = this.getData<T>(table);
    const updated = [...current, item];
    this.saveData(table, updated);
    return item;
  }

  static async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<void> {
    await delay(200);
    const current = this.getData<T>(table);
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    this.saveData(table, updated);
  }
}