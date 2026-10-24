import { POPULAR_STOCKS } from '../data/stocksDatabase.js';
import { firebaseService } from '../services/firebase.js';
import { authService } from '../services/authService.js';
import { liveMarketService } from '../services/liveMarketService.js';

const STORAGE_KEY_GUEST_HOLDINGS = 'apna_share_guest_holdings_v1';
const STORAGE_KEY_GUEST_TRANSACTIONS = 'apna_share_guest_txs_v1';
const STORAGE_KEY_CURRENCY = 'apex_portfolio_currency_v1';
const STORAGE_KEY_LIVE_FEED = 'apex_portfolio_live_feed_v1';

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
      this.transactions = this.loadUserTransactions(initialUser.uid);
    } else {
      this.holdings = this.loadGuestHoldings();
      this.transactions = this.loadGuestTransactions();
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
      if (event.type === 'AUTO_REFRESH_TICK' && this.holdings.length > 0) {
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
    this.transactions = this.loadUserTransactions(userId);
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
    } catch (e) {}

    // Reset in-memory state to clean empty portfolio
    this.holdings = [];
    this.transactions = [];
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
        if (cloudHoldings.length > 0) {
          let priceUpdated = false;
          const calibrated = cloudHoldings.map(h => {
            const sym = (h.symbol || '').toUpperCase().trim();
            const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
            if (ref && ref.cmp) {
              // Only calibrate wildly obsolete prices
              if (Math.abs(h.cmp - ref.cmp) / ref.cmp > 0.35) {
                priceUpdated = true;
                return { ...h, cmp: ref.cmp, prevClose: ref.prevClose || h.prevClose };
              }
            }
            return h;
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
        this.transactions = cloudTxs;
        this.saveTransactions(this.transactions);
        this.notify({ type: 'CLOUD_TX_UPDATED' });
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
        if (Array.isArray(parsed)) return parsed;
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load guest holdings from localStorage', e);
    }
    return [];
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

  // Synchronize active holdings with the latest real market prices
  syncWithMarketDatabase() {
    let changed = false;
    this.holdings = this.holdings.map(h => {
      const sym = (h.symbol || '').toUpperCase().trim();
      const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
      if (ref && ref.cmp) {
        const needsRange = !h.dayHigh || !h.dayLow || !h.week52High || !h.week52Low;
        if (Math.abs(h.cmp - ref.cmp) > 2 || needsRange) {
          changed = true;
          return {
            ...h,
            cmp: ref.cmp,
            prevClose: ref.prevClose || h.prevClose,
            dayHigh: ref.dayHigh || h.dayHigh || ref.cmp,
            dayLow: ref.dayLow || h.dayLow || ref.cmp,
            week52High: ref.week52High || h.week52High,
            week52Low: ref.week52Low || h.week52Low
          };
        }
      }
      return h;
    });

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
    if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0.00';
    // Indian numbering format (e.g. ₹ 1,00,000.00)
    return '₹ ' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Adds or averages a holding
   * @param {Object} item - { symbol, name, exchange, sector, quantity, buyPrice, buyDate, notes, cmp }
   */
  addOrUpdateHolding(item) {
    const symbol = item.symbol.toUpperCase().trim();
    const quantity = parseFloat(item.quantity);
    const buyPrice = parseFloat(item.buyPrice);
    const existingIndex = this.holdings.findIndex(h => h.symbol.toUpperCase() === symbol);

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

      this.holdings[existingIndex] = {
        ...oldHolding,
        quantity: newTotalQty,
        avgPrice: parseFloat(newWeightedAvg.toFixed(2)),
        isin: item.isin || oldHolding.isin || '',
        // Preserve or update CMP if provided
        cmp: fileCmp !== null ? fileCmp : oldHolding.cmp,
        prevClose: filePrevClose !== null ? filePrevClose : oldHolding.prevClose,
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

      const newHolding = {
        id: holdingId,
        symbol: symbol,
        isin: item.isin || (refStock ? refStock.isin : '') || '',
        name: item.name || (refStock ? refStock.name : symbol),
        exchange: item.exchange || (refStock ? refStock.exchange : 'NSE'),
        sector: item.sector || (refStock ? refStock.sector : 'General / Equity'),
        quantity: quantity,
        avgPrice: buyPrice,
        cmp: parseFloat(cmp),
        prevClose: parseFloat(prevClose),
        dayHigh: refStock ? refStock.dayHigh : parseFloat(cmp),
        dayLow: refStock ? refStock.dayLow : parseFloat(cmp),
        week52High: refStock ? refStock.week52High : parseFloat((cmp * 1.25).toFixed(2)),
        week52Low: refStock ? refStock.week52Low : parseFloat((cmp * 0.75).toFixed(2)),
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
   * @param {Object} param - { symbol, quantity, sellPrice, sellDate, notes }
   */
  sellHolding({ symbol, quantity, sellPrice, sellDate, notes }) {
    const sym = symbol.toUpperCase().trim();
    const qtyToSell = parseFloat(quantity);
    const price = parseFloat(sellPrice);
    const holdingIndex = this.holdings.findIndex(h => h.symbol.toUpperCase() === sym);

    if (holdingIndex === -1) {
      throw new Error(`Stock ${sym} not found in active portfolio`);
    }

    const holding = this.holdings[holdingIndex];
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
    const isFullExit = qtyToSell === holding.quantity;

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
      notes: notes || (isFullExit ? 'Full position exit' : `Sold ${qtyToSell} shares @ ₹${price}`),
      timestamp: Date.now()
    };

    this.transactions.unshift(newTx);
    this.saveTransactions(this.transactions);

    if (isFullExit) {
      // Remove holding from portfolio
      const removedHolding = this.holdings.splice(holdingIndex, 1)[0];
      this.saveHoldings(this.holdings);

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        firebaseService.removeUserHolding(uid, holding.id);
        firebaseService.recordUserTransaction(uid, newTx, u?.email);
      }

      this.notify({
        type: 'HOLDING_SOLD',
        symbol: sym,
        isFullExit: true,
        soldHolding: removedHolding,
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
        firebaseService.saveUserHolding(uid, this.holdings[holdingIndex], u?.email);
        firebaseService.recordUserTransaction(uid, newTx, u?.email);
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
    const symMatch = symbol ? symbol.toUpperCase().trim() : null;
    const idx = this.holdings.findIndex(h => 
      String(h.id) === String(id) || 
      (symMatch && h.symbol && h.symbol.toUpperCase().trim() === symMatch)
    );

    let deleted = null;
    if (idx !== -1) {
      deleted = this.holdings.splice(idx, 1)[0];
    } else {
      deleted = { id, symbol: symMatch };
    }

    this.saveHoldings(this.holdings);

    // Immediately sync delete to user's private Firestore collection
    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        try {
          await firebaseService.removeUserHolding(uid, deleted.id || id, deleted.symbol || symMatch);
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
    return this.holdings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase().trim());
  }

  getTransactionsForStock(symbol) {
    if (!symbol) return [];
    const sym = symbol.toUpperCase().trim();
    let txs = this.transactions.filter(t => t.symbol && t.symbol.toUpperCase().trim() === sym);

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

    const enrichedHoldings = this.holdings.map(h => {
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
      const dayHigh = Number(h.dayHigh) || Number(h.high) || Number(refStock?.dayHigh) || (Math.max(h.cmp, prevClose) * 1.015);
      const dayLow = Number(h.dayLow) || Number(h.low) || Number(refStock?.dayLow) || (Math.min(h.cmp, prevClose) * 0.985);
      const week52High = Number(h.week52High) || Number(refStock?.week52High) || (h.cmp * 1.25);
      const week52Low = Number(h.week52Low) || Number(refStock?.week52Low) || (h.cmp * 0.75);

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
        week52Low: parseFloat(week52Low.toFixed(2))
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
    this.transactions.forEach(t => {
      if ((t.type || '').toUpperCase() === 'SELL' && t.realizedPnL !== undefined) {
        totalRealizedPnL += Number(t.realizedPnL) || 0;
      }
    });

    return {
      totalHoldingsCount: finalHoldings.length,
      totalSharesCount: finalHoldings.reduce((sum, h) => sum + h.quantity, 0),
      totalInvested,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      totalRealizedPnL,
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

      if (!this.isLiveFeedActive || this.holdings.length === 0) return;

      // Pick a random holding to fluctuate
      const randomIndex = Math.floor(Math.random() * this.holdings.length);
      const target = this.holdings[randomIndex];

      // Realistic tick between -0.20% and +0.20%
      const deltaPercent = (Math.random() * 0.40 - 0.20) / 100;
      const oldPrice = target.cmp;
      const newPrice = Math.max(1, parseFloat((oldPrice * (1 + deltaPercent)).toFixed(2)));

      if (oldPrice !== newPrice) {
        target.cmp = newPrice;
        this.lastTickSymbol = {
          symbol: target.symbol,
          direction: newPrice > oldPrice ? 'up' : 'down',
          oldPrice,
          newPrice
        };
        this.saveHoldings(this.holdings);
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
    if (!Array.isArray(this.holdings) || this.holdings.length === 0) {
      this.notify({ type: 'MANUAL_REFRESH', isSilent, timestamp: Date.now() });
      return { totalCount: 0, updatedCount: 0, meta: null };
    }

    try {
      const quotes = await liveMarketService.fetchQuotesForHoldings(this.holdings);
      let updatedCount = 0;

      this.holdings = this.holdings.map(h => {
        const sym = (h.symbol || '').toUpperCase().trim();
        const quote = quotes[sym];
        if (quote && quote.cmp && quote.cmp > 0) {
          if (Math.abs(h.cmp - quote.cmp) > 0.01) {
            updatedCount++;
          }
          return {
            ...h,
            cmp: quote.cmp,
            prevClose: quote.prevClose || h.prevClose || quote.cmp,
            dayHigh: quote.dayHigh || quote.high || h.dayHigh,
            dayLow: quote.dayLow || quote.low || h.dayLow,
            week52High: quote.week52High || h.week52High,
            week52Low: quote.week52Low || h.week52Low
          };
        }
        return h;
      });

      this.saveHoldings(this.holdings);

      if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
        const u = this.getActiveUser();
        const uid = this.getActiveUserId();
        if (uid && uid !== 'usr_local_guest') {
          for (const h of this.holdings) {
            firebaseService.saveUserHolding(uid, h, u?.email).catch(() => {});
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

      return { totalCount: this.holdings.length, updatedCount, quotes, meta };
    } catch (err) {
      console.warn('refreshMarketQuotes error:', err);
      this.syncWithMarketDatabase();
      this.notify({ type: 'MANUAL_REFRESH', isSilent, timestamp: Date.now() });
      return { totalCount: this.holdings.length, updatedCount: 0, meta: null, error: err.message };
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
      transactions: this.transactions
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

    if (firebaseService.isConfigured) {
      this.holdings.forEach(h => firebaseService.saveHolding(h));
      this.transactions.forEach(t => firebaseService.recordTransaction(t));
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
    this.saveHoldings(this.holdings);
    this.saveTransactions(this.transactions);

    // Explicitly wipe storage keys to remove any cached holdings and transaction history
    try {
      localStorage.removeItem(STORAGE_KEY_GUEST_HOLDINGS);
      localStorage.removeItem(STORAGE_KEY_GUEST_TRANSACTIONS);
      localStorage.removeItem('apex_portfolio_holdings_v1');
      localStorage.removeItem('apex_portfolio_txs_v1');
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        localStorage.removeItem(this.getUserHoldingsKey(uid));
        localStorage.removeItem(this.getUserTransactionsKey(uid));
      }
    } catch (e) {}

    if (firebaseService.isConfigured && !this.isInspectingOtherUser) {
      const uid = this.getActiveUserId();
      if (uid && uid !== 'usr_local_guest') {
        try {
          await Promise.all([
            firebaseService.clearAllUserHoldings(uid),
            firebaseService.clearAllUserTransactions(uid)
          ]);
        } catch (err) {
          console.error('Failed to clear user data from Firestore:', err);
        }
      }
    }

    this.notify({ type: 'DATA_CLEARED' });
    this.notify({ type: 'HOLDINGS_CLEARED' });
    this.notify({ type: 'TRANSACTIONS_UPDATED' });
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
