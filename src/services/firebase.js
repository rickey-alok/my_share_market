// Firebase & Firestore Service for Apna Share Calculator
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEY_FIREBASE_CONFIG = 'apna_share_firebase_config_v1';

// Default / Placeholder config (Replace with your Firebase Console keys)
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

  // Real-time listener for Holdings collection
  listenToHoldings(onUpdate, onError) {
    if (!this.isConfigured || !this.db) return null;
    try {
      const colRef = collection(this.db, 'holdings');
      return onSnapshot(colRef, (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(items);
      }, (err) => {
        console.error('Firestore holdings listener error:', err);
        if (onError) onError(err);
      });
    } catch (e) {
      console.error('listenToHoldings exception:', e);
      return null;
    }
  }

  // Real-time listener for Transactions collection
  listenToTransactions(onUpdate, onError) {
    if (!this.isConfigured || !this.db) return null;
    try {
      const q = query(collection(this.db, 'transactions'), orderBy('timestamp', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const txs = [];
        snapshot.forEach(docSnap => {
          txs.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(txs);
      }, (err) => {
        console.error('Firestore transactions listener error:', err);
        if (onError) onError(err);
      });
    } catch (e) {
      console.error('listenToTransactions exception:', e);
      return null;
    }
  }

  // Save or update a holding in Firestore
  async saveHolding(holding) {
    if (!this.isConfigured || !this.db) return false;
    try {
      const docRef = doc(this.db, 'holdings', holding.id);
      await setDoc(docRef, {
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
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('Error saving holding to Firestore:', e);
      return false;
    }
  }

  // Delete holding from Firestore
  async removeHolding(holdingId) {
    if (!this.isConfigured || !this.db) return false;
    try {
      await deleteDoc(doc(this.db, 'holdings', holdingId));
      return true;
    } catch (e) {
      console.error('Error removing holding from Firestore:', e);
      return false;
    }
  }

  // Add transaction record to Firestore
  async recordTransaction(tx) {
    if (!this.isConfigured || !this.db) return false;
    try {
      const docRef = doc(this.db, 'transactions', tx.id);
      await setDoc(docRef, {
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
      });
      return true;
    } catch (e) {
      console.error('Error recording transaction to Firestore:', e);
      return false;
    }
  }
}

export const firebaseService = new FirebaseService();
