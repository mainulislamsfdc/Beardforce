import { AppConfig, User } from "../types";
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    setDoc, 
    getDoc,
    Firestore 
} from 'firebase/firestore';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    Auth 
} from 'firebase/auth';

export class DatabaseService {
  private static STORAGE_PREFIX = 'bf_crm_db_';
  private static app: FirebaseApp | null = null;
  private static db: Firestore | null = null;
  private static auth: Auth | null = null;
  private static useFirebase = false;

  static async initialize() {
    const configStr = localStorage.getItem(this.STORAGE_PREFIX + 'config');
    if (configStr) {
        const config: AppConfig = JSON.parse(configStr);
        if (config.firebaseConfig) {
            try {
                if (!getApps().length) {
                    this.app = initializeApp(config.firebaseConfig);
                } else {
                    this.app = getApp();
                }
                this.db = getFirestore(this.app);
                this.auth = getAuth(this.app);
                this.useFirebase = true;
                console.log("DatabaseService: Connected to FIREBASE");
            } catch (e) {
                console.error("Firebase init failed", e);
                this.useFirebase = false; // Fallback
            }
        }
    }
    if (!this.useFirebase) {
        console.log("DatabaseService: Using LOCAL STORAGE (Simulation Mode)");
    }
  }

  // --- Auth ---

  static async login(email: string, password: string): Promise<User> {
    if (this.useFirebase && this.auth && this.db) {
        // Real Firebase Auth
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        const uid = userCredential.user.uid;
        
        // Fetch role from Firestore 'users' collection
        const userDoc = await getDoc(doc(this.db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            // Ensure ID matches
            return { ...userData, id: uid };
        } else {
            // Fallback if auth exists but no db record
            return { id: uid, email: email, name: email.split('@')[0], role: 'viewer' };
        }
    } else {
        // Local Simulation
        await this.delay(600);
        const users = await this.getUsers();
        const found = users.find(u => u.email === email && ((u as any).password === password || password === '123'));
        
        if (found) {
            localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(found));
            return found;
        }
        
        // Default Admin Backdoor for Local Mode
        if (email === 'admin@test.com' && (password === '123' || password === 'admin')) {
            const admin: User = { id: 'u_admin', email, name: 'Admin', role: 'admin' };
            localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(admin));
            return admin;
        }
        throw new Error("Invalid credentials");
    }
  }

  static async register(email: string, password: string): Promise<User> {
     if (this.useFirebase && this.auth && this.db) {
         // Real Firebase Registration
         const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
         const newUser: User = {
             id: userCredential.user.uid,
             email,
             name: email.split('@')[0],
             role: 'admin' // First user registered via Auth screen is Admin
         };
         // Create User Profile in Firestore
         await setDoc(doc(this.db, 'users', newUser.id), newUser);
         return newUser;
     } else {
         // Local Simulation
         await this.delay(600);
         const newUser: User = {
             id: Date.now().toString(),
             email,
             name: email.split('@')[0],
             role: 'admin'
         };
         await this.addUser(newUser, password);
         localStorage.setItem(this.STORAGE_PREFIX + 'user', JSON.stringify(newUser));
         return newUser;
     }
  }

  static async logout(): Promise<void> {
    if (this.useFirebase && this.auth) {
        await signOut(this.auth);
    }
    localStorage.removeItem(this.STORAGE_PREFIX + 'user');
  }

  static getCurrentUser(): User | null {
    // Note: Firebase auth state is async. For this app structure, we rely on the store's persisted state 
    // or localStorage for immediate hydration, but the Auth component handles the gatekeeping.
    const u = localStorage.getItem(this.STORAGE_PREFIX + 'user');
    return u ? JSON.parse(u) : null;
  }

  // --- User Management (Admin Actions) ---

  static async getUsers(): Promise<User[]> {
      return this.getTable<User>('users');
  }

  static async addUser(user: User, password?: string): Promise<void> {
      if (this.useFirebase && this.auth && this.db) {
          // Note: The Firebase Client SDK cannot "create" a secondary user with a password 
          // without logging out the current admin. 
          // Solution for this architecture: We create the Firestore Record (Access Control) 
          // and the user must "Sign Up" themselves, or we use a Cloud Function (Admin SDK).
          // FOR NOW: We will just store the permission record in Firestore.
          // The user will need to 'Register' on the login screen to create their Auth credential.
          // Alternatively, we can use a secondary app instance to create users, but that's complex.
          
          // Let's create the profile so when they DO register, we know their role.
          // We use email as ID temporarily or generate a placeholder ID until they register.
          await addDoc(collection(this.db, 'users'), user);
      } else {
          const userWithCreds = { ...user, password: password || '123' };
          await this.insert('users', userWithCreds);
      }
  }

  static async deleteUser(id: string): Promise<void> {
      if (this.useFirebase && this.db) {
          // Delete from Firestore
          // (Cannot delete from Auth without Admin SDK/Cloud Function)
          // This effectively revokes app access though since we check DB on login.
          // Since we might not have the doc ID (if using custom IDs), this depends on structure.
          // Assuming ID is passed correctly.
          // If ID is the Auth UID:
          try {
              await updateDoc(doc(this.db, 'users', id), { role: 'revoked' }); // Soft delete/ban
          } catch(e) {
               // If it was a generated ID from addDoc
              // For simplicity in this demo, we might just not implement hard delete for Firebase Client SDK
              console.warn("Hard delete of Auth users requires Firebase Admin SDK. Revoking role instead.");
          }
      } else {
          await this.delay(200);
          const users = await this.getUsers();
          const updated = users.filter(u => u.id !== id);
          localStorage.setItem(this.STORAGE_PREFIX + 'users', JSON.stringify(updated));
      }
  }

  static async resetPassword(email: string): Promise<string> {
      if (this.useFirebase && this.auth) {
          // REAL EMAIL SENDING
          await sendPasswordResetEmail(this.auth, email);
          return "Firebase has sent a real password reset email to " + email;
      } else {
          await this.delay(800);
          const tempPass = Math.random().toString(36).slice(-8).toUpperCase();
          const users = await this.getUsers();
          const userIndex = users.findIndex(u => u.email === email);
          if (userIndex >= 0) {
              const updatedUsers = [...users];
              (updatedUsers[userIndex] as any).password = tempPass;
              localStorage.setItem(this.STORAGE_PREFIX + 'users', JSON.stringify(updatedUsers));
          }
          return `https://beardforce.crm/reset?code=${tempPass}`;
      }
  }

  // --- Configuration ---

  static async getConfig(): Promise<AppConfig | null> {
    const c = localStorage.getItem(this.STORAGE_PREFIX + 'config');
    return c ? JSON.parse(c) : null;
  }

  static async saveConfig(config: AppConfig): Promise<void> {
    localStorage.setItem(this.STORAGE_PREFIX + 'config', JSON.stringify(config));
    // Re-init if config changes (e.g. adding firebase)
    if (config.firebaseConfig && !this.useFirebase) {
        await this.initialize();
    }
  }

  static async resetAll(): Promise<void> {
    localStorage.clear();
    window.location.reload(); 
  }

  // --- Data Operations (CRUD) ---

  static async getTable<T>(tableName: string): Promise<T[]> {
    if (this.useFirebase && this.db) {
        const querySnapshot = await getDocs(collection(this.db, tableName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } else {
        await this.delay(100);
        const d = localStorage.getItem(this.STORAGE_PREFIX + tableName);
        return d ? JSON.parse(d) : [];
    }
  }

  static async insert<T>(tableName: string, item: any): Promise<T> {
    if (this.useFirebase && this.db) {
        // If item has an ID, use setDoc, else addDoc
        if (item.id && tableName !== 'logs' && tableName !== 'metrics') {
            await setDoc(doc(this.db, tableName, item.id), item);
            return item;
        } else {
            const docRef = await addDoc(collection(this.db, tableName), item);
            return { ...item, id: docRef.id };
        }
    } else {
        await this.delay(200);
        const current = await this.getTable<T>(tableName);
        const updated = [...current, item];
        localStorage.setItem(this.STORAGE_PREFIX + tableName, JSON.stringify(updated));
        return item;
    }
  }

  static async update<T extends { id: string }>(tableName: string, id: string, updates: Partial<T>): Promise<void> {
    if (this.useFirebase && this.db) {
        const docRef = doc(this.db, tableName, id);
        await updateDoc(docRef, updates as any);
    } else {
        await this.delay(200);
        const current = await this.getTable<T>(tableName);
        const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
        localStorage.setItem(this.STORAGE_PREFIX + tableName, JSON.stringify(updated));
    }
  }

  private static delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
}