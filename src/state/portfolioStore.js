import { POPULAR_STOCKS, NIFTY_50_STOCKS } from '../data/stocksDatabase.js';
import { firebaseService } from '../services/firebase.js';
import { authService } from '../services/authService.js';
import { liveMarketService } from '../services/liveMarketService.js';

const STORAGE_KEY_GUEST_HOLDINGS = 'apna_share_guest_holdings_v1';
const STORAGE_KEY_GUEST_TRANSACTIONS = 'apna_share_guest_txs_v1';
const STORAGE_KEY_GUEST_WATCHLIST = 'apna_share_guest_watchlist_v1';
const STORAGE_KEY_CURRENCY = 'apex_portfolio_currency_v1';
const STORAGE_KEY_LIVE_FEED = 'apex_portfolio_live_feed_v1';
const STORAGE_KEY_WATCHLIST_NAMES = 'apna_share_watchlist_names_v1';
const STORAGE_KEY_ACTIVE_WATCHLIST_ID = 'apna_share_active_watchlist_id_v1';

// Initial realistic seed watchlist for Indian market investor
const DEFAULT_WATCHLIST = [
  {
    id: 'w_1',
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 1153.80,
    prevClose: 1153.35,
    dayLow: 1038.05,
    dayHigh: 1197.80,
    week52Low: 980.40,
    week52High: 1728.00,
    dayChangePercent: 0.04,
    dayVolume: 13030713,
    avgVolume: 16853446,
    targetPrice: 1120.00,
    notes: 'Watch for IT demand recovery and digital revenue growth',
    addedDate: '2025-10-15'
  },
  {
    id: 'w_2',
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 840.50,
    prevClose: 835.20,
    dayLow: 832.00,
    dayHigh: 845.00,
    week52Low: 730.00,
    week52High: 912.00,
    dayChangePercent: 0.63,
    dayVolume: 12500000,
    avgVolume: 14200000,
    targetPrice: 825.00,
    notes: 'PSU banking leader with robust credit growth',
    addedDate: '2025-10-18'
  },
  {
    id: 'w_3',
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    sector: 'Infrastructure & Capital Goods',
    cmp: 3480.00,
    prevClose: 3450.00,
    dayLow: 3440.00,
    dayHigh: 3510.00,
    week52Low: 3100.00,
    week52High: 3950.00,
    dayChangePercent: 0.87,
    dayVolume: 2100000,
    avgVolume: 2400000,
    targetPrice: 3380.00,
    notes: 'Massive infrastructure order book and capex cycle',
    addedDate: '2025-10-20'
  },
  {
    id: 'w_4',
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    sector: 'Telecommunications',
    cmp: 1640.00,
    prevClose: 1655.00,
    dayLow: 1630.00,
    dayHigh: 1665.00,
    week52Low: 1150.00,
    week52High: 1780.00,
    dayChangePercent: -0.91,
    dayVolume: 4800000,
    avgVolume: 5100000,
    targetPrice: 1600.00,
    notes: 'ARPU growth trajectory and 5G market share gains',
    addedDate: '2025-10-22'
  }
];

// Initial realistic seed holdings for an Indian Market investor (Current Market Prices)
const DEFAULT_HOLDINGS = [
  {
    id: 'h_1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    quantity: 45,
    avgPrice: 1140.00,
    cmp: 1190.00,
    prevClose: 1184.50,
    dayLow: 1163.10,
    dayHigh: 1201.90,
    week52Low: 1152.20,
    week52High: 1611.80,
    dayVolume: 14753650,
    avgVolume: 15184654,
    buyDate: '2025-08-14',
    notes: 'Core conglomerate holding for energy transition'
  },
  {
    id: 'h_2',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    quantity: 120,
    avgPrice: 680.00,
    cmp: 692.80,
    prevClose: 694.05,
    dayLow: 686.85,
    dayHigh: 696.80,
    week52Low: 681.90,
    week52High: 1017.50,
    dayVolume: 21296902,
    avgVolume: 31762207,
    buyDate: '2025-09-02',
    notes: 'Private banking titan with merger synergies'
  },
  {
    id: 'h_3',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'Information Technology',
    quantity: 25,
    avgPrice: 2380.00,
    cmp: 2530.00,
    prevClose: 2506.90,
    dayLow: 2517.20,
    dayHigh: 2625.00,
    week52Low: 1976.80,
    week52High: 3350.00,
    dayVolume: 3016983,
    avgVolume: 6008350,
    buyDate: '2025-06-20',
    notes: 'Defensive IT cash cow, dividend payer'
  },
  {
    id: 'h_4',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Commercial Vehicles Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    quantity: 85,
    avgPrice: 385.00,
    cmp: 396.00,
    prevClose: 414.25,
    dayLow: 391.10,
    dayHigh: 412.70,
    week52Low: 306.30,
    week52High: 509.00,
    dayVolume: 8545866,
    avgVolume: 6019803,
    buyDate: '2025-04-10',
    notes: 'EV market leadership and commercial vehicle turnaround'
  },
  {
    id: 'h_5',
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    quantity: 200,
    avgPrice: 245.00,
    cmp: 257.90,
    prevClose: 258.90,
    dayLow: 254.80,
    dayHigh: 260.30,
    week52Low: 253.15,
    week52High: 426.40,
    dayVolume: 16297263,
    avgVolume: 23319612,
    buyDate: '2025-03-15',
    notes: 'FMCG scale and hotel business demerger'
  }
];

class PortfolioStore {
  constructor() {
    this.subscribers = new Set();
    this.currency = 'INR';
    this.isLiveFeedActive = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LIVE_FEED) !== 'false' : false;
    this.timer = null;
    this.lastTickSymbol = null;
    this.isCloudSyncing = false;
    this.isInspectingOtherUser = false;
    this.inspectedUser = null;
    this.activeSyncedUserId = null;
    this.firestoreUnsubscribeHoldings = null;
    this.firestoreUnsubscribeTransactions = null;
    this.firestoreUnsubscribeWatchlist = null;
    this.activeWatchlistId = this.loadActiveWatchlistId();
    this.watchlistNames = this.loadWatchlistNames();

    const initialUser = this.getActiveUser();
    if (initialUser && !initialUser.isGuest && initialUser.uid) {
      this.activeSyncedUserId = initialUser.uid;
      let userHoldings = this.loadUserHoldings(initialUser.uid);
      if (userHoldings.length === 0) {
        try {
          const legacy = localStorage.getItem('apex_portfolio_holdings_v1');
          if (legacy) {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.saveUserHoldings(initialUser.uid, parsed);
              userHoldings = parsed;
            }
          }
        } catch (e) {}
      }
      this.holdings = userHoldings;
      const rawUserTxs = this.loadUserTransactions(initialUser.uid);
      const { normalized: normUserTxs, updated: userTxsUpdated } = this.normalizeTransactions(rawUserTxs);
      this.transactions = normUserTxs;
      if (userTxsUpdated) this.saveTransactions(this.transactions);
      this.watchlist = this.loadUserWatchlist(initialUser.uid);
    } else {
      this.holdings = this.loadGuestHoldings();
      const rawGuestTxs = this.loadGuestTransactions();
      const { normalized: normGuestTxs, updated: guestTxsUpdated } = this.normalizeTransactions(rawGuestTxs);
      this.transactions = normGuestTxs;
      if (guestTxsUpdated) this.saveTransactions(this.transactions);
      this.watchlist = this.loadGuestWatchlist();
    }

    if (this.isLiveFeedActive && liveMarketService.isMarketOpen() && this.holdings.length > 0) {
      this.startLiveSimulation();
    }

    if (firebaseService.isConfigured && this.activeSyncedUserId) {
      this.initFirestoreSync(this.activeSyncedUserId);
    }

    // Sync holding prices with latest market database
    this.syncWithMarketDatabase();

    // Automatically fetch real-time quotes on startup/refresh (non-blocking)
    if (this.holdings.length > 0) {
      setTimeout(() => {
        this.refreshMarketQuotes(true);
      }, 150);
    }

    // Subscribe to live market auto-refresh interval ticks
    liveMarketService.subscribe((event) => {
      const hasStocks = (this.holdings && this.holdings.length > 0) || (this.watchlist && this.watchlist.length > 0);
      if (event.type === 'AUTO_REFRESH_TICK' && hasStocks) {
        this.refreshMarketQuotes(true);
      }
    });

    // React automatically to login/logout events to switch user-scoped data
    authService.subscribe((event) => {
      const user = event.user || authService.getUser();
      const isRegistered = user && !user.isGuest && Boolean(user.uid);

      if (event.type === 'LOGIN_SUCCESS' || (event.type === 'AUTH_STATE_CHANGED' && isRegistered)) {
        if (user && user.uid) {
          this.handleUserLogin(user.uid);
        }
      } else if (event.type === 'LOGOUT' || (event.type === 'AUTH_STATE_CHANGED' && !isRegistered && this.activeSyncedUserId)) {
        this.handleUserLogout();
      }
    });
  }

  cleanLegacyStorage() {
    try {
      localStorage.removeItem('apex_portfolio_holdings_v1');
      localStorage.removeItem('apex_portfolio_txs_v1');
    } catch (e) {}
  }

  handleUserLogin(userId) {
    if (!userId || userId === 'usr_local_guest') return;
    if (this.activeSyncedUserId === userId && this.isCloudSyncing) return;

    this.cleanupFirestoreSync();
    this.activeSyncedUserId = userId;
    this.isInspectingOtherUser = false;
    this.inspectedUser = null;

    // Migrate any legacy holdings into this user's private storage if needed
    try {
      const userKey = this.getUserHoldingsKey(userId);
      const existing = localStorage.getItem(userKey);
      if (!existing) {
        const legacy = localStorage.getItem('apex_portfolio_holdings_v1');
        if (legacy) {
          localStorage.setItem(userKey, legacy);
        }
      }
      const legacyTxs = localStorage.getItem('apex_portfolio_txs_v1');
      if (legacyTxs && !localStorage.getItem(this.getUserTransactionsKey(userId))) {
        localStorage.setItem(this.getUserTransactionsKey(userId), legacyTxs);
      }
      this.cleanLegacyStorage();
    } catch (e) {}

    // Load locally cached data for this specific user
    this.holdings = this.loadUserHoldings(userId);
    const cachedTxs = this.loadUserTransactions(userId);
    const { normalized, updated } = this.normalizeTransactions(cachedTxs);
    this.transactions = normalized;
    if (updated) this.saveTransactions(this.transactions);
    this.watchlist = this.loadUserWatchlist(userId);
    this.notify({ type: 'PORTFOLIO_RESET' });

    // Connect to Firestore sync for this user
    this.initFirestoreSync(userId);
  }

  handleUserLogout() {
    this.activeSyncedUserId = null;
    this.isInspectingOtherUser = false;
    this.inspectedUser = null;
    this.cleanupFirestoreSync();

    // Clean legacy storage and guest storage on logout so NO prior user data can linger
    this.cleanLegacyStorage();
    try {
      localStorage.removeItem(STORAGE_KEY_GUEST_HOLDINGS);
      localStorage.removeItem(STORAGE_KEY_GUEST_TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEY_GUEST_WATCHLIST);
    } catch (e) {}

    // Reset in-memory state to clean empty portfolio
    this.holdings = [];
    this.transactions = [];
    this.watchlist = [];
    this.stopLiveSimulation();

    this.notify({ type: 'PORTFOLIO_RESET' });
  }

  getActiveUser() {
    try {
      return authService.getUser();
    } catch (e) {
      return null;
    }
  }

  getActiveUserId() {
    if (this.activeSyncedUserId && this.activeSyncedUserId !== 'usr_local_guest') {
      return this.activeSyncedUserId;
    }
    const user = this.getActiveUser();
    if (user && !user.isGuest && user.uid) {
      return user.uid;
    }
    if (authService.auth && authService.auth.currentUser && authService.auth.currentUser.uid) {
      return authService.auth.currentUser.uid;
    }
    return null;
  }

  cleanupFirestoreSync() {
    if (this.firestoreUnsubscribeHoldings) {
      this.firestoreUnsubscribeHoldings();
      this.firestoreUnsubscribeHoldings = null;
    }
    if (this.firestoreUnsubscribeTransactions) {
      this.firestoreUnsubscribeTransactions();
      this.firestoreUnsubscribeTransactions = null;
    }
    if (this.firestoreUnsubscribeWatchlist) {
      this.firestoreUnsubscribeWatchlist();
      this.firestoreUnsubscribeWatchlist = null;
    }
    this.isCloudSyncing = false;
  }

  initFirestoreSync(targetUserId = null) {
    if (!firebaseService.isConfigured) return;

    const activeUser = this.getActiveUser();
    const isRegistered = activeUser && !activeUser.isGuest;
    const effectiveUid = targetUserId || (isRegistered ? activeUser.uid : null) || (authService.auth?.currentUser?.uid);

    this.cleanupFirestoreSync();

    if (!effectiveUid || effectiveUid === 'usr_local_guest') {
      this.activeSyncedUserId = null;
      return;
    }

    this.activeSyncedUserId = effectiveUid;

    // Listen to user-specific private holdings (/users/{userId}/holdings)
    this.firestoreUnsubscribeHoldings = firebaseService.listenToUserHoldings(effectiveUid, (cloudHoldings) => {
      if (this.activeSyncedUserId !== effectiveUid) return;

      if (Array.isArray(cloudHoldings)) {
        const { uniqueHoldings, duplicatesToRemove } = this.reconcileAndDeduplicateHoldings(cloudHoldings);

        // Asynchronously purge duplicate documents from Firestore so they never re-appear
        if (duplicatesToRemove.length > 0 && !this.isInspectingOtherUser) {
          duplicatesToRemove.forEach(dup => {
            if (dup.id) {
              firebaseService.removeUserHolding(effectiveUid, dup.id, dup.symbol).catch(() => {});
            }
          });
        }

        if (uniqueHoldings.length > 0) {
          let priceUpdated = false;
          const calibrated = uniqueHoldings.map(h => {
            const sym = this.canonicalizeSymbol(h.symbol);
            const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
            if (ref && ref.cmp) {
              // Only calibrate wildly obsolete prices
              if (Math.abs(h.cmp - ref.cmp) / ref.cmp > 0.35) {
                priceUpdated = true;
                return { ...h, symbol: sym, cmp: ref.cmp, prevClose: ref.prevClose || h.prevClose };
              }
            }
            return { ...h, symbol: sym };
          });

          this.holdings = calibrated;
          this.saveHoldings(this.holdings);
          this.notify({ type: 'CLOUD_SYNC_UPDATED' });

          if (priceUpdated && !this.isInspectingOtherUser) {
            const u = this.getActiveUser();
            for (const h of this.holdings) {
              firebaseService.saveUserHolding(effectiveUid, h, u?.email);
            }
          }
        } else {
          // Cloud has 0 holdings for this user
          this.holdings = [];
          this.saveHoldings(this.holdings);
          this.notify({ type: 'CLOUD_SYNC_UPDATED' });
        }
      }
    });

    // Listen to user-specific private transactions (/users/{userId}/transactions)
    this.firestoreUnsubscribeTransactions = firebaseService.listenToUserTransactions(effectiveUid, (cloudTxs) => {
      if (this.activeSyncedUserId !== effectiveUid) return;

      if (Array.isArray(cloudTxs)) {
        const { normalized, updated } = this.normalizeTransactions(cloudTxs);
        this.transactions = normalized;
        this.saveTransactions(this.transactions);
        if (updated && !this.isInspectingOtherUser) {
          const u = this.getActiveUser();
          normalized.forEach(tx => {
            if ((tx.type || '').toUpperCase() === 'SELL') {
              firebaseService.recordUserTransaction(effectiveUid, tx, u?.email).catch(() => {});
            }
          });
        }
        this.notify({ type: 'CLOUD_TX_UPDATED' });
      }
    });

    // Listen to user-specific private watchlist (/users/{userId}/watchlist)
    this.firestoreUnsubscribeWatchlist = firebaseService.listenToUserWatchlist(effectiveUid, (cloudWatchlist) => {
      if (this.activeSyncedUserId !== effectiveUid) return;

      if (Array.isArray(cloudWatchlist)) {
        this.watchlist = cloudWatchlist;
        this.saveWatchlist(this.watchlist);
        this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist });
      }
    });

    this.isCloudSyncing = true;
    this.notify({ type: 'FIREBASE_CONNECTED' });
  }

  // Admin Feature: Inspect any user's portfolio data
  async inspectUserPortfolio(targetUserId, targetUserName, targetUserEmail) {
    if (!authService.isAdmin()) {
      throw new Error('Unauthorized: Only administrators can inspect other user data.');
    }

    this.isInspectingOtherUser = true;
    this.inspectedUser = {
      id: targetUserId,
      name: targetUserName,
      email: targetUserEmail
    };

    this.cleanupFirestoreSync();

    const [userHoldings, userTxs] = await Promise.all([
      firebaseService.getUserHoldingsOnce(targetUserId),
      firebaseService.getUserTransactionsOnce(targetUserId)
    ]);

    this.holdings = userHoldings || [];
    this.transactions = userTxs || [];

    this.notify({ type: 'ADMIN_INSPECT_USER', user: this.inspectedUser });
    return { holdings: this.holdings, transactions: this.transactions };
  }

  // Admin Feature: Return to admin's own portfolio
  exitInspectionMode() {
    this.isInspectingOtherUser = false;
    this.inspectedUser = null;
    const activeUser = this.getActiveUser();
    if (activeUser && !activeUser.isGuest && activeUser.uid) {
      this.initFirestoreSync(activeUser.uid);
    } else {
      this.handleUserLogout();
    }
    this.notify({ type: 'ADMIN_EXIT_INSPECT' });
  }

  async connectFirebase(config) {
    const success = firebaseService.saveConfig(config);
    if (success) {
      this.initFirestoreSync();
    }
    return success;
  }

  getUserHoldingsKey(uid) {
    return `apna_share_user_holdings_${uid}`;
  }

  getUserTransactionsKey(uid) {
    return `apna_share_user_txs_${uid}`;
  }

  loadUserHoldings(uid) {
    if (!uid || uid === 'usr_local_guest') return [];
    try {
      const data = localStorage.getItem(this.getUserHoldingsKey(uid));
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const { uniqueHoldings, duplicatesToRemove } = this.reconcileAndDeduplicateHoldings(parsed);
          if (duplicatesToRemove.length > 0) {
            this.saveUserHoldings(uid, uniqueHoldings);
          }
          return uniqueHoldings;
        }
      }
    } catch (e) {
      console.error('Failed to load user holdings from localStorage', e);
    }
    return [];
  }

  saveUserHoldings(uid, holdings) {
    if (!uid || uid === 'usr_local_guest') return;
    try {
      localStorage.setItem(this.getUserHoldingsKey(uid), JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save user holdings to localStorage', e);
    }
  }

  loadUserTransactions(uid) {
    if (!uid || uid === 'usr_local_guest') return [];
    try {
      const data = localStorage.getItem(this.getUserTransactionsKey(uid));
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load user transactions from localStorage', e);
    }
    return [];
  }

  saveUserTransactions(uid, transactions) {
    if (!uid || uid === 'usr_local_guest') return;
    try {
      localStorage.setItem(this.getUserTransactionsKey(uid), JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save user transactions to localStorage', e);
    }
  }

  loadGuestHoldings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GUEST_HOLDINGS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const { uniqueHoldings, duplicatesToRemove } = this.reconcileAndDeduplicateHoldings(parsed);
          if (duplicatesToRemove.length > 0) {
            this.saveGuestHoldings(uniqueHoldings);
          }
          return uniqueHoldings;
        }
      }
    } catch (e) {
      console.error('Failed to load guest holdings from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_HOLDINGS));
  }

  saveGuestHoldings(holdings) {
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_HOLDINGS, JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save guest holdings to localStorage', e);
    }
  }

  loadGuestTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GUEST_TRANSACTIONS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load guest transactions from localStorage', e);
    }
    return [];
  }

  saveGuestTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save guest transactions to localStorage', e);
    }
  }

  loadHoldings() {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest') {
      return this.loadUserHoldings(uid);
    }
    return this.loadGuestHoldings();
  }

  loadTransactions() {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest') {
      return this.loadUserTransactions(uid);
    }
    return this.loadGuestTransactions();
  }

  // ==========================================
  // Watchlist Persistence & User Scoping
  // ==========================================

  getUserWatchlistKey(uid) {
    return `apna_share_user_watchlist_${uid}`;
  }

  loadUserWatchlist(uid) {
    if (!uid || uid === 'usr_local_guest') return [];
    try {
      const data = localStorage.getItem(this.getUserWatchlistKey(uid));
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load user watchlist from localStorage', e);
    }
    return [];
  }

  saveUserWatchlist(uid, watchlist) {
    if (!uid || uid === 'usr_local_guest') return;
    try {
      localStorage.setItem(this.getUserWatchlistKey(uid), JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save user watchlist to localStorage', e);
    }
  }

  loadGuestWatchlist() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GUEST_WATCHLIST);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load guest watchlist from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_WATCHLIST));
  }

  saveGuestWatchlist(watchlist) {
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_WATCHLIST, JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save guest watchlist to localStorage', e);
    }
  }

  loadWatchlist() {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest') {
      return this.loadUserWatchlist(uid);
    }
    return this.loadGuestWatchlist();
  }

  saveWatchlist(watchlist) {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest' && !this.isInspectingOtherUser) {
      this.saveUserWatchlist(uid, watchlist);
    } else if (!this.isInspectingOtherUser) {
      this.saveGuestWatchlist(watchlist);
    }
  }

  // ==========================================
  // Watchlist Business Logic & Operations (Multi-Watchlist: 3 Lists, 50 Stocks Each)
  // ==========================================

  loadActiveWatchlistId() {
    try {
      const id = parseInt(localStorage.getItem(STORAGE_KEY_ACTIVE_WATCHLIST_ID), 10);
      if ([1, 2, 3].includes(id)) return id;
    } catch (e) {}
    return 1;
  }

  loadWatchlistNames() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WATCHLIST_NAMES);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return {
            1: parsed[1] || 'Watchlist 1',
            2: parsed[2] || 'Watchlist 2',
            3: parsed[3] || 'Watchlist 3'
          };
        }
      }
    } catch (e) {}
    return { 1: 'Watchlist 1', 2: 'Watchlist 2', 3: 'Watchlist 3' };
  }

  getActiveWatchlistId() {
    return this.activeWatchlistId || 1;
  }

  setActiveWatchlist(id) {
    const parsed = Number(id);
    if ([1, 2, 3].includes(parsed)) {
      this.activeWatchlistId = parsed;
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_WATCHLIST_ID, String(parsed));
      } catch (e) {}
      this.notify({ type: 'WATCHLIST_TAB_CHANGED', activeWatchlistId: parsed });
    }
  }

  getWatchlistNames() {
    return {
      1: (this.watchlistNames && this.watchlistNames[1]) || 'Watchlist 1',
      2: (this.watchlistNames && this.watchlistNames[2]) || 'Watchlist 2',
      3: (this.watchlistNames && this.watchlistNames[3]) || 'Watchlist 3'
    };
  }

  getWatchlistName(id) {
    const names = this.getWatchlistNames();
    return names[Number(id) || 1] || `Watchlist ${id}`;
  }

  setWatchlistName(id, name) {
    const parsed = Number(id);
    if ([1, 2, 3].includes(parsed) && name && typeof name === 'string') {
      const clean = name.trim().substring(0, 24);
      if (!this.watchlistNames) this.watchlistNames = { 1: 'Watchlist 1', 2: 'Watchlist 2', 3: 'Watchlist 3' };
      this.watchlistNames[parsed] = clean;
      try {
        localStorage.setItem(STORAGE_KEY_WATCHLIST_NAMES, JSON.stringify(this.watchlistNames));
      } catch (e) {}
      this.notify({ type: 'WATCHLIST_NAMES_UPDATED', watchlistNames: this.watchlistNames });
    }
  }

  getWatchlist(watchlistId = null) {
    const targetId = watchlistId !== null && watchlistId !== undefined ? Number(watchlistId) : this.activeWatchlistId;
    if (!Array.isArray(this.watchlist)) return [];
    return this.watchlist.filter(w => (Number(w.watchlistId) || 1) === targetId);
  }

  getAllWatchlistItems() {
    return Array.isArray(this.watchlist) ? this.watchlist : [];
  }

  getWatchlistCounts() {
    const list = Array.isArray(this.watchlist) ? this.watchlist : [];
    return {
      1: list.filter(w => (Number(w.watchlistId) || 1) === 1).length,
      2: list.filter(w => (Number(w.watchlistId) || 1) === 2).length,
      3: list.filter(w => (Number(w.watchlistId) || 1) === 3).length,
      total: list.length
    };
  }

  getWatchlistStockBySymbol(symbol, watchlistId = null) {
    if (!symbol) return null;
    const sym = symbol.toUpperCase().trim();
    return this.getWatchlist(watchlistId).find(w => (w.symbol || '').toUpperCase().trim() === sym) || null;
  }

  isInWatchlist(symbol, watchlistId = null) {
    return Boolean(this.getWatchlistStockBySymbol(symbol, watchlistId));
  }

  async addToWatchlist({ symbol, name, exchange, sector, targetPrice, notes, watchlistId }) {
    if (!symbol) throw new Error('Stock symbol is required');
    const sym = symbol.toUpperCase().trim();
    if (!Array.isArray(this.watchlist)) this.watchlist = [];

    const targetWlId = Number(watchlistId) || this.activeWatchlistId || 1;
    const currentList = this.getWatchlist(targetWlId);
    const existingIndex = this.watchlist.findIndex(w => (w.symbol || '').toUpperCase().trim() === sym && (Number(w.watchlistId) || 1) === targetWlId);

    // Limit check: Up to 50 shares per watchlist
    if (existingIndex === -1 && currentList.length >= 50) {
      const wlName = this.getWatchlistName(targetWlId);
      throw new Error(`Watchlist "${wlName}" has reached the maximum capacity of 50 stocks. Please remove a stock or switch to another watchlist.`);
    }

    const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);

    const cmp = refStock ? refStock.cmp : 100;
    const prevClose = refStock ? refStock.prevClose : cmp;
    const dayHigh = refStock ? refStock.dayHigh : cmp;
    const dayLow = refStock ? refStock.dayLow : cmp;
    const week52High = refStock ? refStock.week52High : parseFloat((cmp * 1.25).toFixed(2));
    const week52Low = refStock ? refStock.week52Low : parseFloat((cmp * 0.75).toFixed(2));
    const dayChangePercent = refStock ? refStock.dayChangePercent : 0;

    let target = targetPrice !== undefined && targetPrice !== null && !isNaN(parseFloat(targetPrice)) ? parseFloat(targetPrice) : null;
    if (target === null && cmp) {
      target = parseFloat((cmp * 0.97).toFixed(2));
    }

    let item;
    if (existingIndex !== -1) {
      item = {
        ...this.watchlist[existingIndex],
        watchlistId: targetWlId,
        name: name || this.watchlist[existingIndex].name || (refStock ? refStock.name : sym),
        exchange: exchange || this.watchlist[existingIndex].exchange || (refStock ? refStock.exchange : 'NSE'),
        sector: sector || this.watchlist[existingIndex].sector || (refStock ? refStock.sector : 'General / Equity'),
        targetPrice: target,
        notes: notes !== undefined ? notes : this.watchlist[existingIndex].notes,
        cmp: refStock ? refStock.cmp : this.watchlist[existingIndex].cmp,
        prevClose: refStock ? refStock.prevClose : this.watchlist[existingIndex].prevClose
      };
      this.watchlist[existingIndex] = item;
    } else {
      const id = 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      item = {
        id,
        watchlistId: targetWlId,
        symbol: sym,
        name: name || (refStock ? refStock.name : sym),
        exchange: exchange || (refStock ? refStock.exchange : 'NSE'),
        sector: sector || (refStock ? refStock.sector : 'General / Equity'),
        cmp: parseFloat(cmp),
        prevClose: parseFloat(prevClose),
        dayHigh: parseFloat(dayHigh),
        dayLow: parseFloat(dayLow),
        week52High: parseFloat(week52High),
        week52Low: parseFloat(week52Low),
        dayChangePercent: parseFloat(dayChangePercent),
        targetPrice: target,
        notes: notes || '',
        addedDate: new Date().toISOString().split('T')[0]
      };
      this.watchlist.unshift(item);
    }

    this.saveWatchlist(this.watchlist);

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const u = this.getActiveUser();
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        firebaseService.saveUserWatchlistStock(uid, item, u?.email).catch(() => {});
      }
    }

    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist, item });
    return item;
  }

  async addNifty50ToWatchlist(watchlistId = null) {
    const targetWlId = Number(watchlistId) || this.activeWatchlistId || 1;
    if (!Array.isArray(this.watchlist)) this.watchlist = [];

    const currentList = this.watchlist.filter(w => (Number(w.watchlistId) || 1) === targetWlId);
    const existingSymbols = new Set(currentList.map(w => (w.symbol || '').toUpperCase().trim()));

    const remainingSlots = 50 - currentList.length;
    if (remainingSlots <= 0) {
      throw new Error(`Watchlist "${this.getWatchlistName(targetWlId)}" has reached its maximum capacity of 50 stocks.`);
    }

    const toAdd = (NIFTY_50_STOCKS || []).filter(s => !existingSymbols.has(s.symbol.toUpperCase())).slice(0, remainingSlots);
    if (toAdd.length === 0) {
      throw new Error(`All NIFTY 50 stocks are already in this watchlist.`);
    }

    const newItems = [];
    for (const stock of toAdd) {
      const sym = stock.symbol.toUpperCase();
      const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym) || stock;
      const cmp = parseFloat(refStock.cmp || 100);
      const target = parseFloat((cmp * 0.97).toFixed(2));
      const id = 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      const item = {
        id,
        watchlistId: targetWlId,
        symbol: sym,
        name: refStock.name || stock.name || sym,
        exchange: refStock.exchange || stock.exchange || 'NSE',
        sector: refStock.sector || stock.sector || 'General / Equity',
        cmp,
        prevClose: parseFloat(refStock.prevClose || cmp),
        dayHigh: parseFloat(refStock.dayHigh || cmp),
        dayLow: parseFloat(refStock.dayLow || cmp),
        week52High: parseFloat(refStock.week52High || (cmp * 1.25)),
        week52Low: parseFloat(refStock.week52Low || (cmp * 0.75)),
        dayChangePercent: parseFloat(refStock.dayChangePercent || 0),
        targetPrice: target,
        notes: 'NIFTY 50 Constituent',
        addedDate: new Date().toISOString().split('T')[0]
      };
      this.watchlist.push(item);
      newItems.push(item);
    }

    this.saveWatchlist(this.watchlist);

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const u = this.getActiveUser();
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        for (const item of newItems) {
          firebaseService.saveUserWatchlistStock(uid, item, u?.email).catch(() => {});
        }
      }
    }

    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist });
    return newItems.length;
  }

  async updateWatchlistItem(id, updates = {}) {
    if (!Array.isArray(this.watchlist)) this.watchlist = [];
    const idx = this.watchlist.findIndex(w => String(w.id) === String(id));
    if (idx === -1) return null;

    this.watchlist[idx] = {
      ...this.watchlist[idx],
      ...updates,
      id: this.watchlist[idx].id
    };

    this.saveWatchlist(this.watchlist);

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const u = this.getActiveUser();
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        firebaseService.saveUserWatchlistStock(uid, this.watchlist[idx], u?.email).catch(() => {});
      }
    }

    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist, item: this.watchlist[idx] });
    return this.watchlist[idx];
  }

  async removeFromWatchlist(idOrSymbol, watchlistId = null) {
    if (!idOrSymbol || !Array.isArray(this.watchlist)) return null;
    const str = String(idOrSymbol).toUpperCase().trim();
    const targetWlId = watchlistId !== null && watchlistId !== undefined ? Number(watchlistId) : null;

    const idx = this.watchlist.findIndex(w => {
      const matchesId = String(w.id) === String(idOrSymbol);
      const matchesSym = w.symbol && w.symbol.toUpperCase().trim() === str;
      const matchesWl = targetWlId === null || (Number(w.watchlistId) || 1) === targetWlId;
      return (matchesId || matchesSym) && matchesWl;
    });

    if (idx === -1) return null;

    const removed = this.watchlist.splice(idx, 1)[0];
    this.saveWatchlist(this.watchlist);

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        firebaseService.removeUserWatchlistStock(uid, removed.id, removed.symbol).catch(() => {});
      }
    }

    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist, removed });
    return removed;
  }

  async clearWatchlist(watchlistId = null) {
    const targetWlId = watchlistId !== null && watchlistId !== undefined ? Number(watchlistId) : this.activeWatchlistId;
    if (!Array.isArray(this.watchlist)) return;

    this.watchlist = this.watchlist.filter(w => (Number(w.watchlistId) || 1) !== targetWlId);
    this.saveWatchlist(this.watchlist);

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        firebaseService.clearAllUserWatchlist(uid, targetWlId).catch(() => {});
      }
    }

    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: this.watchlist, clearedWatchlistId: targetWlId });
  }

    // Synchronize active holdings with the latest real market prices
  syncWithMarketDatabase() {
    const { uniqueHoldings, duplicatesToRemove } = this.reconcileAndDeduplicateHoldings(this.holdings);
    this.holdings = uniqueHoldings;

    if (duplicatesToRemove.length > 0) {
      this.saveHoldings(this.holdings);
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest' && !this.isInspectingOtherUser && firebaseService.isConfigured) {
        duplicatesToRemove.forEach(dup => {
          if (dup.id) firebaseService.removeUserHolding(uid, dup.id, dup.symbol).catch(() => {});
        });
      }
    }

    let changed = false;
    this.holdings = this.holdings.map(h => {
      const sym = this.canonicalizeSymbol(h.symbol);
      const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
      if (ref && ref.cmp) {
        const isRangeInvalid = !h.dayHigh || !h.dayLow || !h.week52High || !h.week52Low ||
                               h.dayHigh < h.cmp || h.dayLow > h.cmp ||
                               h.week52High < h.cmp || h.week52Low > h.cmp;
        const isVolumeMissing = (!h.dayVolume || h.dayVolume <= 0) && ref.dayVolume > 0;
        if (Math.abs(h.cmp - ref.cmp) > 2 || isRangeInvalid || isVolumeMissing) {
          changed = true;
          const targetCmp = (Math.abs(h.cmp - ref.cmp) > 2) ? ref.cmp : h.cmp;
          let dHigh = ref.dayHigh || h.dayHigh || targetCmp;
          let dLow = ref.dayLow || h.dayLow || targetCmp;
          let wHigh = ref.week52High || h.week52High || (targetCmp * 1.25);
          let wLow = ref.week52Low || h.week52Low || (targetCmp * 0.75);

          dHigh = Math.max(dHigh, targetCmp);
          dLow = Math.min(dLow, targetCmp);
          wHigh = Math.max(wHigh, dHigh, targetCmp);
          wLow = Math.min(wLow, dLow, targetCmp);

          return {
            ...h,
            cmp: targetCmp,
            prevClose: ref.prevClose || h.prevClose || targetCmp,
            dayHigh: parseFloat(dHigh.toFixed(2)),
            dayLow: parseFloat(dLow.toFixed(2)),
            week52High: parseFloat(wHigh.toFixed(2)),
            week52Low: parseFloat(wLow.toFixed(2)),
            dayVolume: ref.dayVolume || h.dayVolume,
            avgVolume: ref.avgVolume || h.avgVolume
          };
        }
      } else if (h.cmp > 0) {
        let dHigh = Number(h.dayHigh) || (h.cmp * 1.015);
        let dLow = Number(h.dayLow) || (h.cmp * 0.985);
        let wHigh = Number(h.week52High) || (h.cmp * 1.25);
        let wLow = Number(h.week52Low) || (h.cmp * 0.75);

        if (dHigh < h.cmp || dLow > h.cmp || wHigh < h.cmp || wLow > h.cmp) {
          changed = true;
          dHigh = Math.max(dHigh, h.cmp);
          dLow = Math.min(dLow, h.cmp);
          wHigh = Math.max(wHigh, dHigh, h.cmp);
          wLow = Math.min(wLow, dLow, h.cmp);
          return {
            ...h,
            dayHigh: parseFloat(dHigh.toFixed(2)),
            dayLow: parseFloat(dLow.toFixed(2)),
            week52High: parseFloat(wHigh.toFixed(2)),
            week52Low: parseFloat(wLow.toFixed(2))
          };
        }
      }
      return h;
    });

    if (Array.isArray(this.watchlist) && this.watchlist.length > 0) {
      this.watchlist = this.watchlist.map(w => {
        const sym = (w.symbol || '').toUpperCase().trim();
        const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
        if (ref && ref.cmp) {
          return {
            ...w,
            cmp: ref.cmp,
            prevClose: ref.prevClose || w.prevClose || ref.cmp,
            dayHigh: ref.dayHigh || w.dayHigh || ref.cmp,
            dayLow: ref.dayLow || w.dayLow || ref.cmp,
            week52High: ref.week52High || w.week52High || (ref.cmp * 1.25),
            week52Low: ref.week52Low || w.week52Low || (ref.cmp * 0.75),
            dayChangePercent: ref.dayChangePercent !== undefined ? ref.dayChangePercent : w.dayChangePercent
          };
        }
        return w;
      });
      this.saveWatchlist(this.watchlist);
    }

    if (changed) {
      this.saveHoldings(this.holdings);
      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        if (uid && uid !== 'usr_local_guest') {
          for (const h of this.holdings) {
            firebaseService.saveUserHolding(uid, h, u?.email);
          }
        }
      }
      this.notify({ type: 'MARKET_PRICES_SYNCED' });
    }
  }

  // Update current market price of any stock
  updateStockCMP(symbol, newCmp, newPrevClose = null) {
    const sym = symbol.toUpperCase().trim();
    const parsedCmp = parseFloat(newCmp);
    if (isNaN(parsedCmp) || parsedCmp <= 0) {
      throw new Error('Please enter a valid price greater than 0');
    }

    // 1. Update in active portfolio holding if present
    const holding = this.getHoldingBySymbol(sym);
    if (holding) {
      holding.cmp = parsedCmp;
      if (newPrevClose) holding.prevClose = parseFloat(newPrevClose);
      if (holding.dayHigh !== undefined) holding.dayHigh = Math.max(Number(holding.dayHigh) || parsedCmp, parsedCmp);
      if (holding.dayLow !== undefined) holding.dayLow = Math.min(Number(holding.dayLow) || parsedCmp, parsedCmp);
      if (holding.week52High !== undefined) holding.week52High = Math.max(Number(holding.week52High) || parsedCmp, parsedCmp);
      if (holding.week52Low !== undefined) holding.week52Low = Math.min(Number(holding.week52Low) || parsedCmp, parsedCmp);
      this.saveHoldings(this.holdings);

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        firebaseService.saveUserHolding(uid, holding, u?.email);
      }
    }

    // 2. Also update in POPULAR_STOCKS master database
    const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
    if (ref) {
      ref.cmp = parsedCmp;
      if (newPrevClose) ref.prevClose = parseFloat(newPrevClose);
      if (ref.dayHigh !== undefined) ref.dayHigh = Math.max(Number(ref.dayHigh) || parsedCmp, parsedCmp);
      if (ref.dayLow !== undefined) ref.dayLow = Math.min(Number(ref.dayLow) || parsedCmp, parsedCmp);
      if (ref.week52High !== undefined) ref.week52High = Math.max(Number(ref.week52High) || parsedCmp, parsedCmp);
      if (ref.week52Low !== undefined) ref.week52Low = Math.min(Number(ref.week52Low) || parsedCmp, parsedCmp);
    }

    this.notify({ type: 'CMP_UPDATED', symbol: sym, cmp: parsedCmp });
    return true;
  }

  saveHoldings(holdings) {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest' && !this.isInspectingOtherUser) {
      this.saveUserHoldings(uid, holdings);
    } else if (!this.isInspectingOtherUser) {
      this.saveGuestHoldings(holdings);
    }
  }

  saveTransactions(transactions) {
    const uid = this.getActiveUserId();
    if (uid && uid !== 'usr_local_guest' && !this.isInspectingOtherUser) {
      this.saveUserTransactions(uid, transactions);
    } else if (!this.isInspectingOtherUser) {
      this.saveGuestTransactions(transactions);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event = { type: 'STATE_CHANGED' }) {
    for (const callback of this.subscribers) {
      try {
        callback(event, this);
      } catch (e) {
        console.error('Subscriber notification error', e);
      }
    }
  }

  getCurrencySymbol() {
    return '₹';
  }

  formatMoney(amount, decimals = 2) {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return decimals > 0 ? '₹ 0.00' : '₹ 0';
    }
    // Indian numbering format (e.g. ₹ 1,00,000.00)
    return '₹ ' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  canonicalizeSymbol(raw) {
    if (!raw) return '';
    let sym = String(raw).toUpperCase().trim();
    if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
      sym = sym.slice(0, -3).trim();
    } else if (sym.endsWith('-EQ') || sym.endsWith('-BE') || sym.endsWith('-BL') || sym.endsWith('-BZ')) {
      sym = sym.slice(0, -3).trim();
    }
    if (sym === 'ZOMATO') return 'ETERNAL';
    if (sym === 'TMCV' || sym === 'TMPV') return 'TATAMOTORS';
    if (sym === 'MM') return 'M&M';
    return sym;
  }

  /**
   * Checks whether a stock position has been fully sold/exited by the user
   * @param {string} symbol
   * @returns {boolean}
   */
  isPositionExited(symbol) {
    if (!symbol) return false;
    const cleanSym = this.canonicalizeSymbol(symbol);
    if (!Array.isArray(this.transactions) || this.transactions.length === 0) return false;

    // Filter transactions for this stock, sorted newest first
    const txs = this.transactions
      .filter(t => t.symbol && this.canonicalizeSymbol(t.symbol) === cleanSym)
      .sort((a, b) => {
        const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
        return timeB - timeA;
      });

    if (txs.length === 0) return false;
    const latestTx = txs[0];
    const latestType = (latestTx.type || '').toUpperCase();

    if (latestType === 'SELL') {
      const isFull = Boolean(latestTx.isFullExit) || (latestTx.notes && latestTx.notes.toLowerCase().includes('full position exit'));
      const notInHoldings = !this.holdings.some(h => this.canonicalizeSymbol(h.symbol) === cleanSym && (parseFloat(h.quantity) || 0) > 0);
      if (isFull || notInHoldings) {
        return true;
      }
      const totalBought = txs.filter(t => (t.type || '').toUpperCase() === 'BUY').reduce((s, t) => s + (Number(t.quantity) || 0), 0);
      const totalSold = txs.filter(t => (t.type || '').toUpperCase() === 'SELL').reduce((s, t) => s + (Number(t.quantity) || 0), 0);
      if (totalSold > 0 && totalBought > 0 && totalSold >= totalBought) {
        return true;
      }
    }
    return false;
  }

  reconcileAndDeduplicateHoldings(rawHoldings = []) {
    if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) {
      return { uniqueHoldings: [], duplicatesToRemove: [] };
    }

    const map = new Map();
    const duplicatesToRemove = [];

    for (const raw of rawHoldings) {
      if (!raw || !raw.symbol) continue;
      const cleanSym = this.canonicalizeSymbol(raw.symbol);
      const isin = (raw.isin || '').toUpperCase().trim();
      const lookupKey = cleanSym || isin;
      if (!lookupKey) continue;

      const rawQty = parseFloat(raw.quantity) || 0;
      // 1. Any holding with 0 shares, negative shares, or whose position was fully exited must be purged
      if (rawQty <= 0 || this.isPositionExited(cleanSym)) {
        duplicatesToRemove.push(raw);
        continue;
      }

      if (!map.has(lookupKey)) {
        map.set(lookupKey, {
          ...raw,
          symbol: cleanSym,
          isin: isin || raw.isin || ''
        });
      } else {
        const existing = map.get(lookupKey);
        duplicatesToRemove.push(raw);

        const qty1 = parseFloat(existing.quantity) || 0;
        const qty2 = parseFloat(raw.quantity) || 0;
        const price1 = parseFloat(existing.avgPrice) || 0;
        const price2 = parseFloat(raw.avgPrice) || 0;

        // Check if this is an identical duplicate (same quantity and very close price within 8%)
        const sameQty = Math.abs(qty1 - qty2) < 0.001;
        const maxPrice = Math.max(price1, price2, 1);
        const priceDiffPct = Math.abs(price1 - price2) / maxPrice;

        if (sameQty && priceDiffPct < 0.08) {
          // Identical duplicate import: keep single position with all-in buy price
          existing.avgPrice = Math.max(price1, price2);
          existing.cmp = existing.cmp || raw.cmp;
          existing.prevClose = existing.prevClose || raw.prevClose;
          existing.dayHigh = Math.max(existing.dayHigh || 0, raw.dayHigh || 0);
          existing.dayLow = Math.min(existing.dayLow || Infinity, raw.dayLow || Infinity);
          existing.week52High = Math.max(existing.week52High || 0, raw.week52High || 0);
          existing.week52Low = Math.min(existing.week52Low || Infinity, raw.week52Low || Infinity);
        } else {
          // Separate purchases of same stock: compute weighted average
          const totalQty = qty1 + qty2;
          const weightedAvg = totalQty > 0 ? ((qty1 * price1) + (qty2 * price2)) / totalQty : price1;
          existing.quantity = totalQty;
          existing.avgPrice = parseFloat(weightedAvg.toFixed(2));
          existing.cmp = existing.cmp || raw.cmp;
          existing.dayHigh = Math.max(existing.dayHigh || 0, raw.dayHigh || 0);
          existing.dayLow = Math.min(existing.dayLow || Infinity, raw.dayLow || Infinity);
          existing.week52High = Math.max(existing.week52High || 0, raw.week52High || 0);
          existing.week52Low = Math.min(existing.week52Low || Infinity, raw.week52Low || Infinity);
        }
      }
    }

    return {
      uniqueHoldings: Array.from(map.values()),
      duplicatesToRemove
    };
  }

  /**
   * Normalizes transaction records, recalculating costBasis, realizedPnL and realizedPnLPercent for SELL transactions if missing
   * @param {Array} transactions
   * @returns {{ normalized: Array, updated: boolean }}
   */
  normalizeTransactions(transactions = []) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { normalized: [], updated: false };
    }

    let hasUpdates = false;
    const normalized = transactions.map(t => {
      if (!t) return t;
      const type = (t.type || '').toUpperCase();
      if (type === 'SELL') {
        const qty = Number(t.quantity) || 0;
        const sellPrice = Number(t.price) || 0;
        let costBasis = t.costBasis !== undefined && t.costBasis !== null && !isNaN(Number(t.costBasis)) ? Number(t.costBasis) : null;
        let realizedPnL = t.realizedPnL !== undefined && t.realizedPnL !== null && !isNaN(Number(t.realizedPnL)) ? Number(t.realizedPnL) : null;
        let realizedPnLPercent = t.realizedPnLPercent !== undefined && t.realizedPnLPercent !== null && !isNaN(Number(t.realizedPnLPercent)) ? Number(t.realizedPnLPercent) : null;

        if (realizedPnL === null || isNaN(realizedPnL)) {
          const cleanSym = this.canonicalizeSymbol(t.symbol);
          if (costBasis === null || isNaN(costBasis)) {
            // 1. Try matching active holding
            const holding = this.holdings.find(h => this.canonicalizeSymbol(h.symbol) === cleanSym || (t.holdingId && String(h.id) === String(t.holdingId)));
            if (holding && holding.avgPrice) {
              costBasis = Number(holding.avgPrice);
            } else {
              // 2. Try BUY transactions for this stock
              const buyTxs = transactions.filter(x => (x.type || '').toUpperCase() === 'BUY' && this.canonicalizeSymbol(x.symbol) === cleanSym);
              if (buyTxs.length > 0) {
                const totalBuyAmount = buyTxs.reduce((sum, b) => sum + (Number(b.totalAmount) || ((Number(b.quantity) || 1) * (Number(b.price) || 0))), 0);
                const totalBuyQty = buyTxs.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
                costBasis = totalBuyQty > 0 ? (totalBuyAmount / totalBuyQty) : Number(buyTxs[0].price);
              } else {
                // 3. Catalog fallback
                const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
                costBasis = ref ? (Number(ref.prevClose) || Number(ref.cmp) || sellPrice) : sellPrice;
              }
            }
          }

          realizedPnL = parseFloat(((sellPrice - costBasis) * qty).toFixed(2));
          realizedPnLPercent = costBasis > 0 ? parseFloat((((sellPrice - costBasis) / costBasis) * 100).toFixed(2)) : 0;
          hasUpdates = true;

          return {
            ...t,
            costBasis: parseFloat(costBasis.toFixed(2)),
            realizedPnL,
            realizedPnLPercent
          };
        }
      }
      return t;
    });

    return { normalized, updated: hasUpdates };
  }

  /**
   * Adds or averages a holding
   * @param {Object} item - { symbol, name, exchange, sector, quantity, buyPrice, buyDate, notes, cmp }
   */
  addOrUpdateHolding(item) {
    const symbol = this.canonicalizeSymbol(item.symbol);
    const itemIsin = (item.isin || '').toUpperCase().trim();
    const quantity = parseFloat(item.quantity);
    const buyPrice = parseFloat(item.buyPrice);
    const existingIndex = this.holdings.findIndex(h => 
      this.canonicalizeSymbol(h.symbol) === symbol ||
      (itemIsin && h.isin && h.isin.toUpperCase().trim() === itemIsin)
    );

    let holdingId;
    let isAveraged = false;
    let oldHolding = null;

    if (existingIndex >= 0) {
      // Existing stock in portfolio -> apply Weighted Average Acquisition Cost
      isAveraged = true;
      oldHolding = { ...this.holdings[existingIndex] };
      const currentQty = oldHolding.quantity;
      const currentAvgPrice = oldHolding.avgPrice;

      const newTotalQty = currentQty + quantity;
      // Formula: ((Qty1 * Avg1) + (Qty2 * Price2)) / (Qty1 + Qty2)
      const newWeightedAvg = ((currentQty * currentAvgPrice) + (quantity * buyPrice)) / newTotalQty;

      holdingId = oldHolding.id;
      const fileCmp = item.cmp !== undefined && !isNaN(parseFloat(item.cmp)) && parseFloat(item.cmp) > 0 ? parseFloat(item.cmp) : null;
      const filePrevClose = item.prevClose !== undefined && !isNaN(parseFloat(item.prevClose)) && parseFloat(item.prevClose) > 0 ? parseFloat(item.prevClose) : null;

      const finalCmp = fileCmp !== null ? fileCmp : oldHolding.cmp;
      let dHigh = Number(oldHolding.dayHigh) || finalCmp;
      let dLow = Number(oldHolding.dayLow) || finalCmp;
      let wHigh = Number(oldHolding.week52High) || (finalCmp * 1.25);
      let wLow = Number(oldHolding.week52Low) || (finalCmp * 0.75);
      dHigh = Math.max(dHigh, finalCmp);
      dLow = Math.min(dLow, finalCmp);
      wHigh = Math.max(wHigh, dHigh, finalCmp);
      wLow = Math.min(wLow, dLow, finalCmp);

      this.holdings[existingIndex] = {
        ...oldHolding,
        quantity: newTotalQty,
        avgPrice: parseFloat(newWeightedAvg.toFixed(2)),
        isin: item.isin || oldHolding.isin || '',
        // Preserve or update CMP if provided
        cmp: finalCmp,
        prevClose: filePrevClose !== null ? filePrevClose : oldHolding.prevClose,
        dayHigh: parseFloat(dHigh.toFixed(2)),
        dayLow: parseFloat(dLow.toFixed(2)),
        week52High: parseFloat(wHigh.toFixed(2)),
        week52Low: parseFloat(wLow.toFixed(2)),
        notes: item.notes ? `${oldHolding.notes || ''} | ${item.notes}`.trim() : oldHolding.notes
      };
    } else {
      // Brand new holding
      holdingId = 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);
      const fileCmp = item.cmp !== undefined && !isNaN(parseFloat(item.cmp)) && parseFloat(item.cmp) > 0 ? parseFloat(item.cmp) : null;
      const filePrevClose = item.prevClose !== undefined && !isNaN(parseFloat(item.prevClose)) && parseFloat(item.prevClose) > 0 ? parseFloat(item.prevClose) : null;
      const cmp = fileCmp !== null ? fileCmp : (refStock ? refStock.cmp : buyPrice);
      const prevClose = filePrevClose !== null ? filePrevClose : (refStock ? refStock.prevClose : cmp);
      const fCmp = parseFloat(cmp);

      let dHigh = refStock ? refStock.dayHigh : fCmp;
      let dLow = refStock ? refStock.dayLow : fCmp;
      let wHigh = refStock ? refStock.week52High : parseFloat((fCmp * 1.25).toFixed(2));
      let wLow = refStock ? refStock.week52Low : parseFloat((fCmp * 0.75).toFixed(2));
      dHigh = Math.max(dHigh, fCmp);
      dLow = Math.min(dLow, fCmp);
      wHigh = Math.max(wHigh, dHigh, fCmp);
      wLow = Math.min(wLow, dLow, fCmp);

      const newHolding = {
        id: holdingId,
        symbol: symbol,
        isin: item.isin || (refStock ? refStock.isin : '') || '',
        name: item.name || (refStock ? refStock.name : symbol),
        exchange: item.exchange || (refStock ? refStock.exchange : 'NSE'),
        sector: item.sector || (refStock ? refStock.sector : 'General / Equity'),
        quantity: quantity,
        avgPrice: buyPrice,
        cmp: fCmp,
        prevClose: parseFloat(prevClose),
        dayHigh: parseFloat(dHigh.toFixed(2)),
        dayLow: parseFloat(dLow.toFixed(2)),
        week52High: parseFloat(wHigh.toFixed(2)),
        week52Low: parseFloat(wLow.toFixed(2)),
        buyDate: item.buyDate || new Date().toISOString().split('T')[0],
        notes: item.notes || ''
      };
      this.holdings.unshift(newHolding);
    }

    // Record Transaction
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      holdingId: holdingId,
      symbol: symbol,
      type: 'BUY',
      quantity: quantity,
      price: buyPrice,
      date: item.buyDate || new Date().toISOString().split('T')[0],
      totalAmount: quantity * buyPrice,
      notes: item.notes || (isAveraged ? 'Averaged holding' : 'Initial purchase'),
      timestamp: Date.now()
    };
    this.transactions.unshift(newTx);

    this.saveHoldings(this.holdings);
    this.saveTransactions(this.transactions);

    // Sync to Firestore if configured
    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const u = this.getActiveUser();
      const uid = this.getActiveUserId();
      firebaseService.saveUserHolding(uid, this.getHoldingById(holdingId), u?.email);
      firebaseService.recordUserTransaction(uid, newTx, u?.email);
    }

    this.notify({
      type: 'HOLDING_ADDED',
      symbol: symbol,
      isAveraged,
      holding: this.getHoldingById(holdingId)
    });

    return {
      holdingId,
      isAveraged,
      newAvgPrice: this.getHoldingById(holdingId).avgPrice,
      totalQuantity: this.getHoldingById(holdingId).quantity
    };
  }

  /**
   * Records a sell order for an existing holding, updates quantity or removes on full exit, and tracks realized P&L
   * Supports both object ({ symbol, id, quantity, sellPrice, sellDate, notes }) and positional (idOrSymbol, quantity, sellPrice, notes, sellDate)
   */
  async sellHolding(firstArg, qtyArg, priceArg, notesArg, dateArg) {
    let symbol, quantity, sellPrice, sellDate, notes, holdingId;

    if (typeof firstArg === 'object' && firstArg !== null) {
      symbol = firstArg.symbol;
      holdingId = firstArg.id || firstArg.holdingId;
      quantity = firstArg.quantity;
      sellPrice = firstArg.sellPrice !== undefined ? firstArg.sellPrice : firstArg.price;
      sellDate = firstArg.sellDate || firstArg.date;
      notes = firstArg.notes;
    } else {
      holdingId = firstArg;
      symbol = firstArg;
      quantity = qtyArg;
      sellPrice = priceArg;
      notes = notesArg;
      sellDate = dateArg;
    }

    const qtyToSell = parseFloat(quantity);
    const price = parseFloat(sellPrice);

    const holdingIndex = this.holdings.findIndex(h => {
      if (holdingId && String(h.id) === String(holdingId)) return true;
      if (symbol) {
        const strSym = String(symbol).toUpperCase().trim();
        if (h.symbol && h.symbol.toUpperCase().trim() === strSym) return true;
        if (this.canonicalizeSymbol(h.symbol) === this.canonicalizeSymbol(strSym)) return true;
      }
      return false;
    });

    if (holdingIndex === -1) {
      throw new Error(`Stock ${symbol || holdingId} not found in active portfolio`);
    }

    const holding = this.holdings[holdingIndex];
    const sym = holding.symbol.toUpperCase().trim();
    if (isNaN(qtyToSell) || qtyToSell <= 0) {
      throw new Error('Sell quantity must be greater than 0');
    }

    if (qtyToSell > holding.quantity) {
      throw new Error(`Cannot sell ${qtyToSell} shares. You currently own ${holding.quantity} shares.`);
    }

    if (isNaN(price) || price <= 0) {
      throw new Error('Sell price must be greater than 0');
    }

    const costBasisPerShare = holding.avgPrice;
    const realizedPnL = (price - costBasisPerShare) * qtyToSell;
    const realizedPnLPercent = costBasisPerShare > 0 ? ((price - costBasisPerShare) / costBasisPerShare) * 100 : 0;
    const totalAmount = qtyToSell * price;
    const isFullExit = qtyToSell >= holding.quantity || Math.abs(qtyToSell - holding.quantity) < 0.001;

    // Record Transaction
    const newTx = {
      id: 'tx_' + Date.now(),
      holdingId: holding.id,
      symbol: sym,
      type: 'SELL',
      quantity: qtyToSell,
      price: price,
      costBasis: costBasisPerShare,
      realizedPnL: parseFloat(realizedPnL.toFixed(2)),
      realizedPnLPercent: parseFloat(realizedPnLPercent.toFixed(2)),
      date: sellDate || new Date().toISOString().split('T')[0],
      totalAmount: totalAmount,
      isFullExit: isFullExit,
      notes: notes || (isFullExit ? 'Full position exit' : `Sold ${qtyToSell} shares @ ₹${price}`),
      timestamp: Date.now()
    };

    this.transactions.unshift(newTx);
    this.saveTransactions(this.transactions);

    if (isFullExit) {
      // Remove ALL matching entries for this stock from in-memory holdings
      const cleanSym = this.canonicalizeSymbol(sym);
      const removedHoldings = this.holdings.filter(h => 
        String(h.id) === String(holding.id) || 
        this.canonicalizeSymbol(h.symbol) === cleanSym
      );
      this.holdings = this.holdings.filter(h => 
        String(h.id) !== String(holding.id) && 
        this.canonicalizeSymbol(h.symbol) !== cleanSym
      );
      this.saveHoldings(this.holdings);

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        try {
          await firebaseService.removeUserHolding(uid, holding.id, holding.symbol || sym);
        } catch (delErr) {
          console.error('Failed to remove user holding from Firestore:', delErr);
        }
        try {
          await firebaseService.recordUserTransaction(uid, newTx, u?.email);
        } catch (txErr) {
          console.error('Failed to record user transaction to Firestore:', txErr);
        }
      }

      this.notify({
        type: 'HOLDING_SOLD',
        symbol: sym,
        isFullExit: true,
        soldHolding: removedHoldings[0] || holding,
        realizedPnL,
        realizedPnLPercent,
        transaction: newTx
      });

      return {
        isFullExit: true,
        remainingQty: 0,
        realizedPnL,
        realizedPnLPercent,
        totalAmount,
        transaction: newTx
      };
    } else {
      // Partial sell: Average buy price of remaining shares remains unchanged in weighted average accounting
      const remainingQty = holding.quantity - qtyToSell;
      this.holdings[holdingIndex] = {
        ...holding,
        quantity: remainingQty
      };
      this.saveHoldings(this.holdings);

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        try {
          await firebaseService.saveUserHolding(uid, this.holdings[holdingIndex], u?.email);
        } catch (saveErr) {}
        try {
          await firebaseService.recordUserTransaction(uid, newTx, u?.email);
        } catch (txErr) {}
      }

      this.notify({
        type: 'HOLDING_SOLD',
        symbol: sym,
        isFullExit: false,
        holding: this.holdings[holdingIndex],
        remainingQty,
        realizedPnL,
        realizedPnLPercent,
        totalAmount,
        transaction: newTx
      });

      return {
        isFullExit: false,
        remainingQty,
        avgPrice: holding.avgPrice,
        realizedPnL,
        realizedPnLPercent,
        totalAmount,
        transaction: newTx
      };
    }
  }

  async deleteHolding(id, symbol = null) {
    const symMatch = symbol ? this.canonicalizeSymbol(symbol) : null;
    const cleanSym = symMatch || (id ? this.canonicalizeSymbol(this.getHoldingById(id)?.symbol) : null);

    let deleted = null;
    const removed = this.holdings.filter(h => 
      String(h.id) === String(id) || 
      (cleanSym && this.canonicalizeSymbol(h.symbol) === cleanSym)
    );
    if (removed.length > 0) {
      deleted = removed[0];
      this.holdings = this.holdings.filter(h => 
        String(h.id) !== String(id) && 
        (!cleanSym || this.canonicalizeSymbol(h.symbol) !== cleanSym)
      );
    } else {
      deleted = { id, symbol: symMatch };
    }

    this.saveHoldings(this.holdings);

    // Immediately sync delete to user's private Firestore collection
    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        try {
          await firebaseService.removeUserHolding(uid, deleted.id || id, deleted.symbol || symMatch || cleanSym);
        } catch (err) {
          console.error('Failed to delete holding from Firestore:', err);
        }
      }
    }

    this.notify({ type: 'HOLDING_DELETED', holding: deleted });
    return true;
  }

  updateHolding(id, updates) {
    const idx = this.holdings.findIndex(h => h.id === id);
    if (idx !== -1) {
      this.holdings[idx] = { ...this.holdings[idx], ...updates };
      this.saveHoldings(this.holdings);
      this.notify({ type: 'HOLDING_UPDATED', holding: this.holdings[idx] });
      return true;
    }
    return false;
  }

  getHoldingById(id) {
    return this.holdings.find(h => h.id === id);
  }

  getHoldingBySymbol(symbol) {
    if (!symbol) return null;
    const clean = this.canonicalizeSymbol(symbol);
    return this.holdings.find(h => this.canonicalizeSymbol(h.symbol) === clean);
  }

  getTransactionsForStock(symbol) {
    if (!symbol) return [];
    const sym = this.canonicalizeSymbol(symbol);
    let txs = this.transactions.filter(t => t.symbol && this.canonicalizeSymbol(t.symbol) === sym);

    // If holding exists but no transactions found (e.g. legacy storage), synthesize initial record
    const holding = this.getHoldingBySymbol(sym);
    if (txs.length === 0 && holding) {
      const syntheticTx = {
        id: `tx_init_${holding.id}`,
        holdingId: holding.id,
        symbol: holding.symbol,
        type: 'BUY',
        quantity: holding.quantity,
        price: holding.avgPrice,
        date: holding.buyDate || new Date().toISOString().split('T')[0],
        totalAmount: holding.quantity * holding.avgPrice,
        notes: holding.notes || 'Initial Position Purchase',
        timestamp: holding.buyDate ? new Date(holding.buyDate).getTime() : Date.now()
      };
      this.transactions.push(syntheticTx);
      this.saveTransactions(this.transactions);
      txs = [syntheticTx];
    }

    // Sort by timestamp/date descending (most recent first)
    return txs.sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });
  }

  // Calculate detailed financial metrics across the entire portfolio
  getPortfolioMetrics() {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDayPnL = 0;
    let totalPrevDayValue = 0;

    const { uniqueHoldings } = this.reconcileAndDeduplicateHoldings(this.holdings);

    const enrichedHoldings = uniqueHoldings.map(h => {
      const invested = h.quantity * h.avgPrice;
      const current = h.quantity * h.cmp;
      const pnl = current - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      // Day P&L
      const prevClose = h.prevClose || h.cmp;
      const dayChangePerShare = h.cmp - prevClose;
      const dayPnL = dayChangePerShare * h.quantity;
      const dayChangePercent = prevClose > 0 ? (dayChangePerShare / prevClose) * 100 : 0;
      const prevDayValue = prevClose * h.quantity;

      totalInvested += invested;
      totalCurrentValue += current;
      totalDayPnL += dayPnL;
      totalPrevDayValue += prevDayValue;

      // Day & 52-Week Range indicators
      const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === (h.symbol || '').toUpperCase().trim());
      let dayHigh = Number(h.dayHigh) || Number(h.high) || Number(refStock?.dayHigh) || (Math.max(h.cmp, prevClose) * 1.015);
      let dayLow = Number(h.dayLow) || Number(h.low) || Number(refStock?.dayLow) || (Math.min(h.cmp, prevClose) * 0.985);
      let week52High = Number(h.week52High) || Number(refStock?.week52High) || (h.cmp * 1.25);
      let week52Low = Number(h.week52Low) || Number(refStock?.week52Low) || (h.cmp * 0.75);

      // Financial market invariants: Day High >= CMP, Day Low <= CMP, 52W High bounds Day High & CMP
      if (h.cmp > 0) {
        dayHigh = Math.max(dayHigh, h.cmp);
        dayLow = Math.min(dayLow, h.cmp);
        week52High = Math.max(week52High, dayHigh, h.cmp);
        week52Low = Math.min(week52Low, dayLow, h.cmp);
      }
      if (dayHigh <= dayLow) dayHigh = dayLow + (dayLow * 0.02 || 1);
      if (week52High <= week52Low) week52High = week52Low + (week52Low * 0.05 || 1);

      // Volume resolution: holding -> cached live quote -> popular stocks catalog
      const cachedQuote = liveMarketService.cache?.get((h.symbol || '').toUpperCase().trim());
      const dayVolume = Number(h.dayVolume || cachedQuote?.dayVolume || refStock?.dayVolume || 0);
      const avgVolume = Number(h.avgVolume || cachedQuote?.avgVolume || refStock?.avgVolume || 0);

      return {
        ...h,
        invested,
        current,
        pnl,
        pnlPercent,
        dayPnL,
        dayChangePercent,
        dayChangePerShare,
        dayHigh: parseFloat(dayHigh.toFixed(2)),
        dayLow: parseFloat(dayLow.toFixed(2)),
        week52High: parseFloat(week52High.toFixed(2)),
        week52Low: parseFloat(week52Low.toFixed(2)),
        dayVolume,
        avgVolume
      };
    });

    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalDayPnLPercent = totalPrevDayValue > 0 ? (totalDayPnL / totalPrevDayValue) * 100 : 0;

    // Calculate portfolio weight % for each stock
    const finalHoldings = enrichedHoldings.map(h => ({
      ...h,
      weight: totalCurrentValue > 0 ? (h.current / totalCurrentValue) * 100 : 0
    }));

    // Sector breakdown
    const sectorMap = {};
    for (const h of finalHoldings) {
      const sec = h.sector || 'Others';
      sectorMap[sec] = (sectorMap[sec] || 0) + h.current;
    }

    const sectorBreakdown = Object.entries(sectorMap)
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    // Top Gainers & Losers
    const sortedByPnL = [...finalHoldings].sort((a, b) => b.pnlPercent - a.pnlPercent);
    const topGainer = sortedByPnL.length > 0 && sortedByPnL[0].pnlPercent > 0 ? sortedByPnL[0] : null;
    const topLoser = sortedByPnL.length > 0 && sortedByPnL[sortedByPnL.length - 1].pnlPercent < 0 
      ? sortedByPnL[sortedByPnL.length - 1] 
      : null;

    let totalRealizedPnL = 0;
    let closedTradesCount = 0;
    this.transactions.forEach(t => {
      if ((t.type || '').toUpperCase() === 'SELL') {
        closedTradesCount++;
        const qty = Number(t.quantity) || 0;
        const sellPrice = Number(t.price) || 0;
        let pnl = 0;

        if (t.realizedPnL !== undefined && t.realizedPnL !== null && !isNaN(Number(t.realizedPnL))) {
          pnl = Number(t.realizedPnL);
        } else if (t.costBasis !== undefined && t.costBasis !== null && !isNaN(Number(t.costBasis))) {
          pnl = (sellPrice - Number(t.costBasis)) * qty;
        } else {
          const cleanSym = this.canonicalizeSymbol(t.symbol);
          const holding = this.holdings.find(h => this.canonicalizeSymbol(h.symbol) === cleanSym || (t.holdingId && String(h.id) === String(t.holdingId)));
          const costBasis = holding && holding.avgPrice ? Number(holding.avgPrice) : sellPrice;
          pnl = (sellPrice - costBasis) * qty;
        }
        totalRealizedPnL += pnl;
      }
    });

    return {
      totalHoldingsCount: finalHoldings.length,
      totalSharesCount: finalHoldings.reduce((sum, h) => sum + h.quantity, 0),
      totalInvested,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      totalRealizedPnL: parseFloat(totalRealizedPnL.toFixed(2)),
      closedTradesCount,
      totalDayPnL,
      totalDayPnLPercent,
      holdings: finalHoldings,
      sectorBreakdown,
      topGainer,
      topLoser
    };
  }

  // Realistic Market Simulation (price fluctuations - active market hours only)
  startLiveSimulation() {
    this.stopLiveSimulation();

    // STRICT RULE: Prices MUST NEVER fluctuate outside market hours (nights, weekends, or closed sessions)
    if (!liveMarketService.isMarketOpen()) {
      return;
    }

    this.timer = setInterval(() => {
      // If market session closes while tab is open, stop fluctuations immediately
      if (!liveMarketService.isMarketOpen()) {
        this.stopLiveSimulation();
        return;
      }

      const pool = [...this.holdings, ...this.watchlist];
      if (!this.isLiveFeedActive || pool.length === 0) return;

      // Pick a random holding or watchlist item to fluctuate
      const randomIndex = Math.floor(Math.random() * pool.length);
      const target = pool[randomIndex];
      const isWatchlist = Array.isArray(this.watchlist) && this.watchlist.some(w => w.id === target.id);

      // Realistic tick between -0.20% and +0.20%
      const deltaPercent = (Math.random() * 0.40 - 0.20) / 100;
      const oldPrice = target.cmp;
      const newPrice = Math.max(1, parseFloat((oldPrice * (1 + deltaPercent)).toFixed(2)));

      if (oldPrice !== newPrice) {
        target.cmp = newPrice;
        if (target.dayHigh !== undefined) target.dayHigh = Math.max(Number(target.dayHigh) || newPrice, newPrice);
        if (target.dayLow !== undefined) target.dayLow = Math.min(Number(target.dayLow) || newPrice, newPrice);
        if (target.week52High !== undefined) target.week52High = Math.max(Number(target.week52High) || newPrice, newPrice);
        if (target.week52Low !== undefined) target.week52Low = Math.min(Number(target.week52Low) || newPrice, newPrice);
        this.lastTickSymbol = {
          symbol: target.symbol,
          direction: newPrice > oldPrice ? 'up' : 'down',
          oldPrice,
          newPrice,
          isWatchlist
        };
        if (isWatchlist) {
          this.saveWatchlist(this.watchlist);
        } else {
          this.saveHoldings(this.holdings);
        }
        this.notify({ type: 'PRICE_TICK', tick: this.lastTickSymbol });
      }
    }, 3200);
  }

  stopLiveSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggleLiveFeed() {
    this.isLiveFeedActive = !this.isLiveFeedActive;
    localStorage.setItem(STORAGE_KEY_LIVE_FEED, this.isLiveFeedActive);
    if (this.isLiveFeedActive && liveMarketService.isMarketOpen()) {
      this.startLiveSimulation();
    } else {
      this.stopLiveSimulation();
    }
    this.notify({ type: 'LIVE_FEED_TOGGLED', active: this.isLiveFeedActive });
    return this.isLiveFeedActive;
  }

  // Refresh market quotes: Fetches real-time NSE/BSE prices from liveMarketService
  async refreshMarketQuotes(isSilent = false) {
    const allQuotesItems = [...(this.holdings || []), ...(this.watchlist || [])];
    if (allQuotesItems.length === 0) {
      this.notify({ type: 'MANUAL_REFRESH', isSilent, timestamp: Date.now() });
      return { totalCount: 0, updatedCount: 0, meta: null };
    }

    try {
      const quotes = await liveMarketService.fetchQuotesForHoldings(allQuotesItems);
      let updatedCount = 0;

      if (Array.isArray(this.holdings)) {
        this.holdings = this.holdings.map(h => {
          const sym = (h.symbol || '').toUpperCase().trim();
          const quote = quotes[sym];
          if (quote && quote.cmp && quote.cmp > 0) {
            if (Math.abs(h.cmp - quote.cmp) > 0.01) {
              updatedCount++;
            }
            const cmp = quote.cmp;
            let dHigh = Number(quote.dayHigh || quote.high || h.dayHigh || cmp);
            let dLow = Number(quote.dayLow || quote.low || h.dayLow || cmp);
            let wHigh = Number(quote.week52High || h.week52High || (cmp * 1.25));
            let wLow = Number(quote.week52Low || h.week52Low || (cmp * 0.75));

            dHigh = Math.max(dHigh, cmp);
            dLow = Math.min(dLow, cmp);
            wHigh = Math.max(wHigh, dHigh, cmp);
            wLow = Math.min(wLow, dLow, cmp);

            return {
              ...h,
              cmp: cmp,
              prevClose: quote.prevClose || h.prevClose || cmp,
              dayHigh: parseFloat(dHigh.toFixed(2)),
              dayLow: parseFloat(dLow.toFixed(2)),
              week52High: parseFloat(wHigh.toFixed(2)),
              week52Low: parseFloat(wLow.toFixed(2)),
              dayVolume: quote.dayVolume || h.dayVolume,
              avgVolume: quote.avgVolume || h.avgVolume
            };
          }
          return h;
        });
        this.saveHoldings(this.holdings);
      }

      if (Array.isArray(this.watchlist) && this.watchlist.length > 0) {
        this.watchlist = this.watchlist.map(w => {
          const sym = (w.symbol || '').toUpperCase().trim();
          const quote = quotes[sym];
          if (quote && quote.cmp && quote.cmp > 0) {
            const cmp = quote.cmp;
            let dHigh = Number(quote.dayHigh || quote.high || w.dayHigh || cmp);
            let dLow = Number(quote.dayLow || quote.low || w.dayLow || cmp);
            let wHigh = Number(quote.week52High || w.week52High || (cmp * 1.25));
            let wLow = Number(quote.week52Low || w.week52Low || (cmp * 0.75));

            return {
              ...w,
              cmp: cmp,
              prevClose: quote.prevClose || w.prevClose || cmp,
              dayHigh: parseFloat(dHigh.toFixed(2)),
              dayLow: parseFloat(dLow.toFixed(2)),
              week52High: parseFloat(wHigh.toFixed(2)),
              week52Low: parseFloat(wLow.toFixed(2)),
              dayChangePercent: quote.dayChangePercent !== undefined ? quote.dayChangePercent : w.dayChangePercent
            };
          }
          return w;
        });
        this.saveWatchlist(this.watchlist);
      }

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        if (uid && uid !== 'usr_local_guest') {
          for (const h of this.holdings) {
            firebaseService.saveUserHolding(uid, h, u?.email).catch(() => {});
          }
          for (const w of this.watchlist) {
            firebaseService.saveUserWatchlistStock(uid, w, u?.email).catch(() => {});
          }
        }
      }

      const meta = liveMarketService.getLastSyncMeta();

      this.notify({
        type: 'MARKET_QUOTES_UPDATED',
        isSilent,
        timestamp: Date.now(),
        quotes,
        meta,
        updatedCount
      });

      return { totalCount: allQuotesItems.length, updatedCount, quotes, meta };
    } catch (err) {
      console.warn('refreshMarketQuotes error:', err);
      this.syncWithMarketDatabase();
      this.notify({ type: 'MANUAL_REFRESH', isSilent, timestamp: Date.now() });
      return { totalCount: allQuotesItems.length, updatedCount: 0, meta: null, error: err.message };
    }
  }

  resetToDemo() {
    this.holdings = JSON.parse(JSON.stringify(DEFAULT_HOLDINGS));
    this.saveHoldings(this.holdings);
    this.notify({ type: 'RESET_DEMO' });
  }

  exportData() {
    return {
      version: '1.0',
      app: 'Apna Share Calculator',
      exportedAt: new Date().toISOString(),
      holdings: this.holdings,
      transactions: this.transactions,
      watchlist: this.watchlist
    };
  }

  importData(data) {
    if (!data || !Array.isArray(data.holdings)) {
      throw new Error('Invalid portfolio file. Missing holdings array.');
    }
    this.holdings = data.holdings;
    this.saveHoldings(this.holdings);

    if (Array.isArray(data.transactions)) {
      this.transactions = data.transactions;
      this.saveTransactions(this.transactions);
    }

    if (Array.isArray(data.watchlist)) {
      this.watchlist = data.watchlist;
      this.saveWatchlist(this.watchlist);
    }

    if (firebaseService.isConfigured) {
      this.holdings.forEach(h => firebaseService.saveHolding(h));
      this.transactions.forEach(t => firebaseService.recordTransaction(t));
      if (Array.isArray(this.watchlist)) {
        const uid = this.getActiveUserId();
        const u = this.getActiveUser();
        if (uid && uid !== 'usr_local_guest') {
          this.watchlist.forEach(w => firebaseService.saveUserWatchlistStock(uid, w, u?.email));
        }
      }
    }

    this.notify({ type: 'DATA_IMPORTED' });
    return true;
  }

  /**
   * Bulk import multiple stocks into portfolio
   * @param {Array<Object>} items - Array of stock items [{ symbol, quantity, buyPrice, name, exchange, sector, notes, buyDate }]
   * @param {string} mode - 'merge' (default: add/average with existing holdings) | 'replace' (clear existing portfolio first)
   */
  async bulkImportHoldings(items, mode = 'merge') {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No valid stock items provided for bulk import.');
    }

    if (mode === 'replace') {
      await this.clearAllData();
    }

    const results = {
      added: 0,
      averaged: 0,
      totalImported: 0,
      holdings: []
    };

    for (const item of items) {
      const sym = (item.symbol || '').toUpperCase().trim();
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.buyPrice);

      if (!sym || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        continue;
      }

      const res = this.addOrUpdateHolding({
        symbol: sym,
        name: item.name,
        isin: item.isin || '',
        exchange: item.exchange || 'NSE',
        sector: item.sector,
        quantity: qty,
        buyPrice: price,
        cmp: item.cmp,
        prevClose: item.prevClose,
        buyDate: item.buyDate || new Date().toISOString().split('T')[0],
        notes: item.notes || 'Bulk imported'
      });

      if (res && res.isAveraged) {
        results.averaged++;
      } else {
        results.added++;
      }
      results.totalImported++;
    }

    // Refresh live quotes in background for newly imported stocks
    this.refreshMarketQuotes(true).catch(() => {});

    this.notify({
      type: 'BULK_IMPORT_COMPLETED',
      results,
      count: results.totalImported
    });

    return results;
  }

  async clearAllData() {
    this.holdings = [];
    this.transactions = [];
    this.watchlist = [];
    this.saveHoldings(this.holdings);
    this.saveTransactions(this.transactions);
    this.saveWatchlist(this.watchlist);

    // Explicitly wipe storage keys to remove any cached holdings, watchlist, and transaction history
    try {
      localStorage.removeItem(STORAGE_KEY_GUEST_HOLDINGS);
      localStorage.removeItem(STORAGE_KEY_GUEST_TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEY_GUEST_WATCHLIST);
      localStorage.removeItem('apex_portfolio_holdings_v1');
      localStorage.removeItem('apex_portfolio_txs_v1');
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        localStorage.removeItem(this.getUserHoldingsKey(uid));
        localStorage.removeItem(this.getUserTransactionsKey(uid));
        localStorage.removeItem(this.getUserWatchlistKey(uid));
      }
    } catch (e) {}

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        try {
          await Promise.all([
            firebaseService.clearAllUserHoldings(uid),
            firebaseService.clearAllUserTransactions(uid),
            firebaseService.clearAllUserWatchlist(uid)
          ]);
        } catch (err) {
          console.error('Failed to clear user data from Firestore:', err);
        }
      }
    }

    this.notify({ type: 'DATA_CLEARED' });
    this.notify({ type: 'HOLDINGS_CLEARED' });
    this.notify({ type: 'TRANSACTIONS_UPDATED' });
    this.notify({ type: 'WATCHLIST_UPDATED', watchlist: [] });
    this.notify({ type: 'PORTFOLIO_RESET' });
  }

  async clearAllHoldings() {
    return this.clearAllData();
  }

  // Manually push all active holdings to Firestore cloud
  async syncHoldingsToCloud() {
    if (!firebaseService.isConfigured || this.isInspectingOtherUser) return false;
    const uid = this.getActiveUserId();
    const u = this.getActiveUser();
    if (!uid || uid === 'usr_local_guest') return false;

    for (const h of this.holdings) {
      await firebaseService.saveUserHolding(uid, h, u?.email);
    }
    this.notify({ type: 'CLOUD_SYNC_UPDATED' });
    return true;
  }
}

export const portfolioStore = new PortfolioStore();
