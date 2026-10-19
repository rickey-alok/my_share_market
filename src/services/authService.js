// Authentication & User Profile Service for Apna Share Calculator
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { firebaseService } from './firebase.js';

const STORAGE_KEY_AUTH_USER = 'apna_share_auth_user_v1';
const STORAGE_KEY_USER_PREFS = 'apna_share_user_prefs_v1';

const DEFAULT_GUEST_USER = {
  uid: 'usr_guest',
  displayName: 'Guest Trader',
  email: 'Sign in with Google to sync',
  photoURL: null,
  role: 'Guest Investor',
  accountTier: 'Not Signed In',
  joinedDate: 'Active Session',
  isGuest: true,
  provider: 'local'
};

const DEFAULT_PREFERENCES = {
  currencyFormat: 'inr_lakhs', // 'inr_lakhs' (₹ 1.45 L) vs 'inr_full' (₹ 1,45,000)
  defaultExchange: 'NSE',      // 'NSE' vs 'BSE'
  priceUpdateSpeed: '2800',    // '2800' ms (2.8s), '6000' ms, 'manual'
  soundEffects: true,
  hapticFeedback: true,
  riskProfile: 'Balanced Wealth Creation'
};

const ADMIN_EMAILS = ['rickey.alok@gmail.com'];

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = this.loadUser();
    this.preferences = this.loadPreferences();
    this.subscribers = new Set();

    this.initFirebaseAuth();
  }

  isAdmin() {
    const user = this.getUser();
    if (!user || user.isGuest) return false;
    const email = (user.email || '').toLowerCase().trim();
    return ADMIN_EMAILS.includes(email) || user.isAdmin === true || user.role === 'Admin' || user.role === 'Master Administrator';
  }

  initFirebaseAuth() {
    try {
      if (firebaseService.app) {
        this.auth = getAuth(firebaseService.app);
        onAuthStateChanged(this.auth, (firebaseUser) => {
          if (firebaseUser) {
            const email = (firebaseUser.email || '').toLowerCase().trim();
            const isAdminUser = ADMIN_EMAILS.includes(email);
            this.currentUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              role: isAdminUser ? 'Master Administrator' : 'Verified Google Investor',
              accountTier: isAdminUser ? 'Platform Admin' : 'Google Cloud Verified',
              isAdmin: isAdminUser,
              joinedDate: new Date(firebaseUser.metadata?.creationTime || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
              isGuest: false,
              provider: 'google.com'
            };
            this.saveUser(this.currentUser);
            firebaseService.saveUserProfile(this.currentUser);
            this.notify({ type: 'AUTH_STATE_CHANGED', user: this.currentUser });
          } else {
            this.currentUser = { ...DEFAULT_GUEST_USER };
            this.saveUser(this.currentUser);
            this.notify({ type: 'AUTH_STATE_CHANGED', user: this.currentUser });
          }
        });
      }
    } catch (e) {
      console.warn('Firebase Auth initialization skipped or unavailable:', e);
    }
  }

  loadUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && !parsed.isGuest && parsed.provider === 'google.com') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load user from localStorage', e);
    }
    return DEFAULT_GUEST_USER;
  }

  saveUser(user) {
    try {
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user in localStorage', e);
    }
  }

  loadPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_PREFS);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load preferences', e);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  savePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    try {
      localStorage.setItem(STORAGE_KEY_USER_PREFS, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
    this.notify({ type: 'PREFERENCES_CHANGED', preferences: this.preferences });
    return this.preferences;
  }

  getUser() {
    return this.currentUser || DEFAULT_GUEST_USER;
  }

  getPreferences() {
    return this.preferences;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event) {
    this.subscribers.forEach(cb => {
      try {
        cb(event, this);
      } catch (err) {
        console.error('AuthService listener error:', err);
      }
    });
  }

  // Google Sign-In (Sole Authentication Method)
  async loginWithGoogle() {
    if (!this.auth) {
      throw new Error('Firebase Auth is not initialized. Please ensure your internet connection is active.');
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const email = (user.email || '').toLowerCase().trim();
      const isAdminUser = ADMIN_EMAILS.includes(email);
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'Google Investor',
        email: user.email,
        photoURL: user.photoURL || null,
        role: isAdminUser ? 'Master Administrator' : 'Verified Google Investor',
        accountTier: isAdminUser ? 'Platform Admin' : 'Google Cloud Verified',
        isAdmin: isAdminUser,
        joinedDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        isGuest: false,
        provider: 'google.com'
      };
      this.saveUser(this.currentUser);
      firebaseService.saveUserProfile(this.currentUser);
      this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
      return this.currentUser;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      let friendlyMsg = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        friendlyMsg = 'Google sign-in popup was closed before completion. Please try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        friendlyMsg = 'This web domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMsg = 'Network connection error. Please check your internet connection.';
      }
      throw new Error(friendlyMsg);
    }
  }

  // Email / Password Login
  async loginWithEmail(email, password) {
    if (!this.auth) {
      // Local fallback simulation if Firebase credentials are uninitialized
      if (email && password) {
        this.currentUser = {
          uid: 'usr_' + Date.now(),
          displayName: email.split('@')[0],
          email: email,
          photoURL: null,
          role: 'Registered Investor',
          accountTier: 'Verified Member',
          joinedDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          isGuest: false,
          provider: 'password'
        };
        this.saveUser(this.currentUser);
        this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
        return this.currentUser;
      }
      throw new Error('Please enter valid email and password.');
    }

    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      const user = cred.user;
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || null,
        role: 'Registered Investor',
        accountTier: 'Cloud Synced Member',
        joinedDate: new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        isGuest: false,
        provider: 'password'
      };
      this.saveUser(this.currentUser);
      this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
      return this.currentUser;
    } catch (err) {
      console.error('Email Login Error:', err);
      throw err;
    }
  }

  // Email / Password Sign Up
  async signupWithEmail(email, password, displayName) {
    if (!this.auth) {
      this.currentUser = {
        uid: 'usr_' + Date.now(),
        displayName: displayName || email.split('@')[0],
        email: email,
        photoURL: null,
        role: 'Registered Investor',
        accountTier: 'Member Account',
        joinedDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        isGuest: false,
        provider: 'password'
      };
      this.saveUser(this.currentUser);
      this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
      return this.currentUser;
    }

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = cred.user;
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      this.currentUser = {
        uid: user.uid,
        displayName: displayName || email.split('@')[0],
        email: user.email,
        photoURL: null,
        role: 'Registered Investor',
        accountTier: 'Cloud Synced Member',
        joinedDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        isGuest: false,
        provider: 'password'
      };
      this.saveUser(this.currentUser);
      this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
      return this.currentUser;
    } catch (err) {
      console.error('Email Sign-Up Error:', err);
      throw err;
    }
  }

  // Switch to Guest / Demo Profile
  loginAsGuest(customName = 'Alok Ranjan') {
    this.currentUser = {
      ...DEFAULT_GUEST_USER,
      displayName: customName || 'Alok Ranjan'
    };
    this.saveUser(this.currentUser);
    this.notify({ type: 'LOGIN_SUCCESS', user: this.currentUser });
    return this.currentUser;
  }

  // Update Profile Name / Details
  updateProfileDetails({ displayName, role, riskProfile }) {
    if (!this.currentUser) return;
    this.currentUser = {
      ...this.currentUser,
      displayName: displayName || this.currentUser.displayName,
      role: role || this.currentUser.role
    };
    this.saveUser(this.currentUser);

    if (riskProfile) {
      this.savePreferences({ riskProfile });
    }

    this.notify({ type: 'PROFILE_UPDATED', user: this.currentUser });
    return this.currentUser;
  }

  // Logout
  async logout() {
    if (this.auth) {
      try {
        await signOut(this.auth);
      } catch (e) {
        console.warn('SignOut error from Firebase:', e);
      }
    }
    // Revert to default guest state
    this.currentUser = { ...DEFAULT_GUEST_USER };
    this.saveUser(this.currentUser);
    this.notify({ type: 'LOGOUT', user: this.currentUser });
    return this.currentUser;
  }
}

export const authService = new AuthService();
