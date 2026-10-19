// Firebase & Firestore Service for Apna Share Calculator
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEY_FIREBASE_CONFIG = 'apna_share_firebase_config_v1';

// Default / Placeholder config
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBP8CVfnDNR1njk2DtvBveZMRSidwN2tTc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "apna-share-calculator.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "apna-share-calculator",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "apna-share-calculator.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "700356064450",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:700356064450:web:7bd4e21669a7d7dc55375b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BMFYQEPT3E"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isConfigured = false;
    this.config = this.loadConfig();

    if (this.config && this.config.apiKey) {
      this.initFirebase(this.config);
    }
  }

  loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.apiKey) return parsed;
      }
    } catch (e) {
      console.warn('Could not load custom firebase config', e);
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  saveConfig(newConfig) {
    try {
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(newConfig));
      this.config = newConfig;
      return this.initFirebase(newConfig);
    } catch (e) {
      console.error('Failed to save firebase config', e);
      return false;
    }
  }

  initFirebase(config) {
    if (!config || !config.apiKey) {
      this.isConfigured = false;
      return false;
    }

    try {
      this.app = initializeApp(config);
      this.db = getFirestore(this.app);
      this.isConfigured = true;
      console.log('🔥 Firebase & Firestore initialized successfully');
      return true;
    } catch (e) {
      console.error('Firebase initialization error', e);
      this.isConfigured = false;
      return false;
    }
  }

  getDb() {
    return this.db;
  }

  // ==========================================================
  // User Profile Operations (/users/{userId})
  // ==========================================================

  async saveUserProfile(user) {
    if (!this.isConfigured || !this.db || !user || user.isGuest) return false;
    try {
      const userRef = doc(this.db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || 'Investor',
        email: user.email || '',
        photoURL: user.photoURL || null,
        role: user.isAdmin ? 'Admin' : (user.role || 'Investor'),
        isAdmin: !!user.isAdmin,
        accountTier: user.accountTier || 'Member',
        lastSeen: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('Failed to sync user profile to Firestore:', e);
      return false;
    }
  }

  // ==========================================================
  // User Scoped Holdings (/users/{userId}/holdings)
  // ==========================================================

  listenToUserHoldings(userId, onUpdate, onError) {
    if (!this.isConfigured || !this.db || !userId) return null;
    try {
      const colRef = collection(this.db, 'users', userId, 'holdings');
      return onSnapshot(colRef, (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(items);
      }, (err) => {
        console.error(`Firestore user [${userId}] holdings listener error:`, err);
        if (onError) onError(err);
      });
    } catch (e) {
      console.error('listenToUserHoldings exception:', e);
      return null;
    }
  }

  async saveUserHolding(userId, holding, userEmail = '') {
    if (!this.isConfigured || !this.db || !userId) return false;
    try {
      const payload = {
        id: holding.id,
        userId: userId,
        userEmail: userEmail,
        symbol: holding.symbol,
        name: holding.name || holding.symbol,
        exchange: holding.exchange || 'NSE',
        sector: holding.sector || 'Others',
        quantity: Number(holding.quantity),
        avgPrice: Number(holding.avgPrice),
        cmp: Number(holding.cmp || holding.avgPrice),
        prevClose: Number(holding.prevClose || holding.cmp || holding.avgPrice),
        buyDate: holding.buyDate || new Date().toISOString().split('T')[0],
        notes: holding.notes || '',
        updatedAt: serverTimestamp()
      };

      // 1. Strict user-scoped collection
      const userDocRef = doc(this.db, 'users', userId, 'holdings', holding.id);
      await setDoc(userDocRef, payload, { merge: true });

      // 2. Dual-write to top-level collection for admin global listing
      try {
        const topDocRef = doc(this.db, 'holdings', `${userId}_${holding.id}`);
        await setDoc(topDocRef, payload, { merge: true });
      } catch (e) {}

      return true;
    } catch (e) {
      console.error('Error saving user holding to Firestore:', e);
      return false;
    }
  }

  async removeUserHolding(userId, holdingId) {
    if (!this.isConfigured || !this.db || !userId) return false;
    try {
      const userDocRef = doc(this.db, 'users', userId, 'holdings', holdingId);
      await deleteDoc(userDocRef);

      try {
        const topDocRef = doc(this.db, 'holdings', `${userId}_${holdingId}`);
        await deleteDoc(topDocRef);
      } catch (e) {}

      return true;
    } catch (e) {
      console.error('Error removing user holding from Firestore:', e);
      return false;
    }
  }

  // ==========================================================
  // User Scoped Transactions (/users/{userId}/transactions)
  // ==========================================================

  listenToUserTransactions(userId, onUpdate, onError) {
    if (!this.isConfigured || !this.db || !userId) return null;
    try {
      const q = query(
        collection(this.db, 'users', userId, 'transactions'),
        orderBy('timestamp', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const txs = [];
        snapshot.forEach(docSnap => {
          txs.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(txs);
      }, (err) => {
        console.error(`Firestore user [${userId}] transactions listener error:`, err);
        if (onError) onError(err);
      });
    } catch (e) {
      console.error('listenToUserTransactions exception:', e);
      return null;
    }
  }

  async recordUserTransaction(userId, tx, userEmail = '') {
    if (!this.isConfigured || !this.db || !userId) return false;
    try {
      const payload = {
        id: tx.id,
        userId: userId,
        userEmail: userEmail,
        holdingId: tx.holdingId,
        symbol: tx.symbol,
        type: tx.type || 'BUY',
        quantity: Number(tx.quantity),
        price: Number(tx.price),
        date: tx.date,
        totalAmount: Number(tx.totalAmount),
        notes: tx.notes || '',
        timestamp: tx.timestamp || Date.now(),
        createdAt: serverTimestamp()
      };

      const userDocRef = doc(this.db, 'users', userId, 'transactions', tx.id);
      await setDoc(userDocRef, payload);

      try {
        const topDocRef = doc(this.db, 'transactions', `${userId}_${tx.id}`);
        await setDoc(topDocRef, payload);
      } catch (e) {}

      return true;
    } catch (e) {
      console.error('Error recording user transaction to Firestore:', e);
      return false;
    }
  }

  // ==========================================================
  // Administrator Methods (Admin-Only Access)
  // ==========================================================

  // Admin can fetch all registered users in the platform
  async getAllUsers() {
    if (!this.isConfigured || !this.db) return [];
    try {
      const snap = await getDocs(collection(this.db, 'users'));
      const users = [];
      snap.forEach(d => {
        users.push({ id: d.id, ...d.data() });
      });
      return users;
    } catch (e) {
      console.error('Admin getAllUsers error:', e);
      return [];
    }
  }

  // Admin can inspect any user's holdings
  async getUserHoldingsOnce(userId) {
    if (!this.isConfigured || !this.db || !userId) return [];
    try {
      const snap = await getDocs(collection(this.db, 'users', userId, 'holdings'));
      const holdings = [];
      snap.forEach(d => {
        holdings.push({ id: d.id, ...d.data() });
      });
      return holdings;
    } catch (e) {
      console.error(`Admin getUserHoldingsOnce [${userId}] error:`, e);
      return [];
    }
  }

  // Admin can inspect any user's transactions
  async getUserTransactionsOnce(userId) {
    if (!this.isConfigured || !this.db || !userId) return [];
    try {
      const snap = await getDocs(collection(this.db, 'users', userId, 'transactions'));
      const txs = [];
      snap.forEach(d => {
        txs.push({ id: d.id, ...d.data() });
      });
      return txs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.error(`Admin getUserTransactionsOnce [${userId}] error:`, e);
      return [];
    }
  }

  // ==========================================================
  // Fallbacks for Generic Shared Calls
  // ==========================================================

  listenToHoldings(onUpdate, onError) {
    return this.listenToUserHoldings('shared_default', onUpdate, onError);
  }

  listenToTransactions(onUpdate, onError) {
    return this.listenToUserTransactions('shared_default', onUpdate, onError);
  }

  async saveHolding(holding) {
    return this.saveUserHolding('shared_default', holding);
  }

  async removeHolding(holdingId) {
    return this.removeUserHolding('shared_default', holdingId);
  }

  async recordTransaction(tx) {
    return this.recordUserTransaction('shared_default', tx);
  }
}

export const firebaseService = new FirebaseService();
