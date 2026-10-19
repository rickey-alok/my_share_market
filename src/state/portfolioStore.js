import { POPULAR_STOCKS } from '../data/stocksDatabase.js';
import { firebaseService } from '../services/firebase.js';

const STORAGE_KEY_HOLDINGS = 'apex_portfolio_holdings_v1';
const STORAGE_KEY_TRANSACTIONS = 'apex_portfolio_txs_v1';
const STORAGE_KEY_CURRENCY = 'apex_portfolio_currency_v1';
const STORAGE_KEY_LIVE_FEED = 'apex_portfolio_live_feed_v1';

// Initial realistic seed holdings for an Indian Market investor
const DEFAULT_HOLDINGS = [
  {
    id: 'h_1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    quantity: 45,
    avgPrice: 2750.00,
    cmp: 2984.50,
    prevClose: 2955.20,
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
    avgPrice: 1540.00,
    cmp: 1682.30,
    prevClose: 1664.10,
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
    avgPrice: 4250.00,
    cmp: 4120.75,
    prevClose: 4165.00,
    buyDate: '2025-06-20',
    notes: 'Defensive IT cash cow, dividend payer'
  },
  {
    id: 'h_4',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    quantity: 85,
    avgPrice: 780.00,
    cmp: 948.60,
    prevClose: 932.10,
    buyDate: '2025-04-10',
    notes: 'EV market leadership and JLR turnaround'
  },
  {
    id: 'h_5',
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    quantity: 200,
    avgPrice: 460.00,
    cmp: 504.25,
    prevClose: 508.90,
    buyDate: '2025-03-15',
    notes: 'FMCG scale and hotel business demerger'
  }
];

class PortfolioStore {
  constructor() {
    this.subscribers = new Set();
    this.holdings = this.loadHoldings();
    this.transactions = this.loadTransactions();
    this.currency = 'INR';
    this.isLiveFeedActive = localStorage.getItem(STORAGE_KEY_LIVE_FEED) !== 'false';
    this.timer = null;
    this.lastTickSymbol = null;
    this.isCloudSyncing = false;
    this.firestoreUnsubscribeHoldings = null;
    this.firestoreUnsubscribeTransactions = null;

    if (this.isLiveFeedActive) {
      this.startLiveSimulation();
    }

    if (firebaseService.isConfigured) {
      this.initFirestoreSync();
    }
  }

  initFirestoreSync() {
    if (!firebaseService.isConfigured) return;

    // Listen to Holdings collection in real time
    if (this.firestoreUnsubscribeHoldings) this.firestoreUnsubscribeHoldings();
    this.firestoreUnsubscribeHoldings = firebaseService.listenToHoldings((cloudHoldings) => {
      if (cloudHoldings && cloudHoldings.length > 0) {
        this.holdings = cloudHoldings;
        this.saveHoldings(this.holdings);
        this.notify({ type: 'CLOUD_SYNC_UPDATED' });
      } else if (this.holdings.length > 0) {
        // Seed initial holdings to Firestore if cloud collection is currently empty
        for (const h of this.holdings) {
          firebaseService.saveHolding(h);
        }
      }
    });

    // Listen to Transactions collection in real time
    if (this.firestoreUnsubscribeTransactions) this.firestoreUnsubscribeTransactions();
    this.firestoreUnsubscribeTransactions = firebaseService.listenToTransactions((cloudTxs) => {
      if (cloudTxs && cloudTxs.length > 0) {
        this.transactions = cloudTxs;
        this.saveTransactions(this.transactions);
        this.notify({ type: 'CLOUD_TX_UPDATED' });
      }
    });

    this.isCloudSyncing = true;
    this.notify({ type: 'FIREBASE_CONNECTED' });
  }

  async connectFirebase(config) {
    const success = firebaseService.saveConfig(config);
    if (success) {
      this.initFirestoreSync();
    }
    return success;
  }

  loadHoldings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HOLDINGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load holdings from localStorage', e);
    }
    // Return default seed holdings
    this.saveHoldings(DEFAULT_HOLDINGS);
    return DEFAULT_HOLDINGS;
  }

  saveHoldings(holdings) {
    try {
      localStorage.setItem(STORAGE_KEY_HOLDINGS, JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save holdings to localStorage', e);
    }
  }

  loadTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load transactions', e);
    }
    // Seed initial transactions matching defaults
    const initialTxs = DEFAULT_HOLDINGS.map((h, idx) => ({
      id: `tx_${idx + 1}`,
      holdingId: h.id,
      symbol: h.symbol,
      type: 'BUY',
      quantity: h.quantity,
      price: h.avgPrice,
      date: h.buyDate,
      totalAmount: h.quantity * h.avgPrice,
      notes: h.notes || 'Initial holding purchase'
    }));
    this.saveTransactions(initialTxs);
    return initialTxs;
  }

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions', e);
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
      this.holdings[existingIndex] = {
        ...oldHolding,
        quantity: newTotalQty,
        avgPrice: parseFloat(newWeightedAvg.toFixed(2)),
        // Preserve or update CMP if provided
        cmp: item.cmp ? parseFloat(item.cmp) : oldHolding.cmp,
        prevClose: item.prevClose ? parseFloat(item.prevClose) : oldHolding.prevClose,
        notes: item.notes ? `${oldHolding.notes || ''} | ${item.notes}`.trim() : oldHolding.notes
      };
    } else {
      // Brand new holding
      holdingId = 'h_' + Date.now();
      const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);
      const cmp = item.cmp || (refStock ? refStock.cmp : buyPrice);
      const prevClose = item.prevClose || (refStock ? refStock.prevClose : buyPrice);

      const newHolding = {
        id: holdingId,
        symbol: symbol,
        name: item.name || (refStock ? refStock.name : symbol),
        exchange: item.exchange || (refStock ? refStock.exchange : 'NSE'),
        sector: item.sector || (refStock ? refStock.sector : 'General / Equity'),
        quantity: quantity,
        avgPrice: buyPrice,
        cmp: parseFloat(cmp),
        prevClose: parseFloat(prevClose),
        buyDate: item.buyDate || new Date().toISOString().split('T')[0],
        notes: item.notes || ''
      };
      this.holdings.unshift(newHolding);
    }

    // Record Transaction
    const newTx = {
      id: 'tx_' + Date.now(),
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
    if (firebaseService.isConfigured) {
      firebaseService.saveHolding(this.getHoldingById(holdingId));
      firebaseService.recordTransaction(newTx);
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

      if (firebaseService.isConfigured) {
        firebaseService.removeHolding(holding.id);
        firebaseService.recordTransaction(newTx);
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

      if (firebaseService.isConfigured) {
        firebaseService.saveHolding(this.holdings[holdingIndex]);
        firebaseService.recordTransaction(newTx);
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

  deleteHolding(id) {
    const idx = this.holdings.findIndex(h => h.id === id);
    if (idx !== -1) {
      const deleted = this.holdings.splice(idx, 1)[0];
      this.saveHoldings(this.holdings);

      // Sync delete to Firestore
      if (firebaseService.isConfigured) {
        firebaseService.removeHolding(id);
      }

      this.notify({ type: 'HOLDING_DELETED', holding: deleted });
      return true;
    }
    return false;
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

      return {
        ...h,
        invested,
        current,
        pnl,
        pnlPercent,
        dayPnL,
        dayChangePercent,
        dayChangePerShare
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

  // Realistic Market Simulation (price fluctuations)
  startLiveSimulation() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.isLiveFeedActive || this.holdings.length === 0) return;

      // Pick a random holding to fluctuate
      const randomIndex = Math.floor(Math.random() * this.holdings.length);
      const target = this.holdings[randomIndex];

      // Realistic tick between -0.35% and +0.35%
      const deltaPercent = (Math.random() * 0.7 - 0.35) / 100;
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
    }, 2800);
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
    if (this.isLiveFeedActive) {
      this.startLiveSimulation();
    } else {
      this.stopLiveSimulation();
    }
    this.notify({ type: 'LIVE_FEED_TOGGLED', active: this.isLiveFeedActive });
    return this.isLiveFeedActive;
  }

  // Manual refresh with small simulated tick to simulate live server sync
  refreshMarketQuotes() {
    for (const h of this.holdings) {
      const delta = (Math.random() * 0.6 - 0.28) / 100;
      h.cmp = Math.max(1, parseFloat((h.cmp * (1 + delta)).toFixed(2)));
    }
    this.saveHoldings(this.holdings);
    this.notify({ type: 'MANUAL_REFRESH' });
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

  clearAllData() {
    this.holdings = [];
    this.transactions = [];
    this.saveHoldings(this.holdings);
    this.saveTransactions(this.transactions);
    this.notify({ type: 'DATA_CLEARED' });
  }
}

export const portfolioStore = new PortfolioStore();
