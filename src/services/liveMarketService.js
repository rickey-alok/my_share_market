// Live Market Price Service (NSE & BSE Real-time Quotes)
import { POPULAR_STOCKS } from '../data/stocksDatabase.js';

const STORAGE_KEY_CUSTOM_PROXY = 'apna_share_market_proxy_url_v1';
const STORAGE_KEY_AUTO_REFRESH = 'apna_share_auto_refresh_enabled_v1';

// Specific ticker aliases for Yahoo Finance
const TICKER_ALIASES = {
  'ZOMATO': 'ETERNAL.NS', // Zomato renamed/ticker on NSE is ETERNAL.NS
  'ETERNAL': 'ETERNAL.NS',
  'M&M': 'M&M.NS',
  'MM': 'M&M.NS',
  'L&T': 'LT.NS',
  'LT': 'LT.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'MCDOWELL-N': 'MCDOWELL-N.NS'
};

function getStoredItem(key, fallback = '') {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(key);
      return v !== null ? v : fallback;
    }
  } catch (e) {}
  return fallback;
}

function setStoredItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (val === null || val === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(val));
      }
    }
  } catch (e) {}
}

class LiveMarketService {
  constructor() {
    this.customProxyUrl = getStoredItem(STORAGE_KEY_CUSTOM_PROXY, '') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKET_PROXY_URL) || '';
    this.isAutoRefreshActive = getStoredItem(STORAGE_KEY_AUTO_REFRESH, 'false') === 'true';
    this.cache = new Map();
    this.lastSyncTimestamp = null;
    this.subscribers = new Set();
    this.autoRefreshTimer = null;

    if (this.isAutoRefreshActive) {
      this.startAutoRefresh();
    }
  }

  // Subscribe to live price update events
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event) {
    this.subscribers.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('LiveMarketService subscriber error:', e);
      }
    });
  }

  setCustomProxy(url) {
    this.customProxyUrl = (url || '').trim();
    if (this.customProxyUrl) {
      setStoredItem(STORAGE_KEY_CUSTOM_PROXY, this.customProxyUrl);
    } else {
      setStoredItem(STORAGE_KEY_CUSTOM_PROXY, null);
    }
    this.notify({ type: 'PROXY_URL_CHANGED', url: this.customProxyUrl });
  }

  getCustomProxy() {
    return this.customProxyUrl;
  }

  getLastSyncFormatted() {
    if (!this.lastSyncTimestamp) return null;
    const d = new Date(this.lastSyncTimestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Check if Indian Stock Market (NSE/BSE) is currently in active trading session
  // Monday to Friday, 9:15 AM to 3:30 PM IST (UTC+5:30)
  isMarketOpen() {
    const now = new Date();
    // Convert to IST
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (330 * 60000));
    const day = istTime.getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0 || day === 6) return false;

    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // 9:15 AM is 555 minutes, 3:30 PM is 930 minutes
    return timeInMinutes >= 555 && timeInMinutes <= 930;
  }

  /**
   * Format ticker symbol for Yahoo Finance
   * NSE uses .NS (e.g. RELIANCE -> RELIANCE.NS)
   * BSE uses .BO (e.g. RELIANCE -> RELIANCE.BO)
   */
  formatTicker(symbol, exchange = 'NSE') {
    const clean = (symbol || '').toUpperCase().trim();
    if (TICKER_ALIASES[clean]) {
      return TICKER_ALIASES[clean];
    }
    if (clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;
    if (exchange.toUpperCase() === 'BSE') return `${clean}.BO`;
    return `${clean}.NS`;
  }

  /**
   * Fetch live quote for a single symbol
   * Attempts:
   * 1. Custom proxy URL if configured (Cloudflare Worker)
   * 2. Local Vite dev server proxy (/api/market/...)
   * 3. Fallback to latest catalog in stocksDatabase.js
   */
  async fetchQuote(symbol, exchange = 'NSE') {
    const cleanSym = (symbol || '').toUpperCase().trim();
    const ticker = this.formatTicker(cleanSym, exchange);

    // List of candidate endpoints
    const endpoints = [];

    // 1. User or environment configured proxy/worker
    if (this.customProxyUrl) {
      const base = this.customProxyUrl.replace(/\/+$/, '');
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      endpoints.push(`${base}?url=${encodeURIComponent(yahooUrl)}`);
      endpoints.push(`${base}?symbol=${encodeURIComponent(ticker)}`);
      endpoints.push(`${base}/${encodeURIComponent(ticker)}`);
    }

    // 2. Vite local development proxy
    endpoints.push(`/api/market/${ticker}?interval=1d&range=1d`);

    let quote = null;

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
            // Likely HTML from an SPA catch-all rewrite, skip
            continue;
          }

          const data = await res.json();
          // Support both Yahoo standard structure and simplified proxy formats
          if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const meta = data.chart.result[0].meta;
            const price = meta.regularMarketPrice || meta.chartPreviousClose;
            const prevClose = meta.chartPreviousClose || price;
            const dayChange = price - prevClose;
            const dayChangePercent = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;

            quote = {
              symbol: cleanSym,
              cmp: parseFloat(price.toFixed(2)),
              prevClose: parseFloat(prevClose.toFixed(2)),
              dayChange: parseFloat(dayChange.toFixed(2)),
              dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
              currency: meta.currency || 'INR',
              exchange: meta.exchangeName || exchange,
              high: meta.regularMarketDayHigh || price,
              low: meta.regularMarketDayLow || price,
              source: 'LIVE_EXCHANGE',
              timestamp: Date.now()
            };
            break;
          } else if (data && (data.price !== undefined || data.cmp !== undefined)) {
            const price = parseFloat(data.price || data.cmp);
            const prevClose = parseFloat(data.prevClose || price);
            quote = {
              symbol: cleanSym,
              cmp: price,
              prevClose: prevClose,
              dayChange: parseFloat((price - prevClose).toFixed(2)),
              dayChangePercent: prevClose > 0 ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0,
              source: 'LIVE_EXCHANGE',
              timestamp: Date.now()
            };
            break;
          }
        }
      } catch (err) {
        // Continue to next endpoint on failure
      }
    }

    // 3. Fallback: Use verified stocksDatabase catalog
    if (!quote) {
      const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
      if (ref) {
        quote = {
          symbol: cleanSym,
          cmp: ref.cmp,
          prevClose: ref.prevClose || ref.cmp,
          dayChange: parseFloat((ref.cmp - (ref.prevClose || ref.cmp)).toFixed(2)),
          dayChangePercent: ref.dayChangePercent || 0,
          source: 'DATABASE_REFERENCE',
          timestamp: Date.now()
        };
      } else {
        // Return cached quote if available
        quote = this.cache.get(cleanSym) || null;
      }
    }

    if (quote) {
      this.cache.set(cleanSym, quote);
    }

    return quote;
  }

  /**
   * Fetch live prices for an array of holdings
   * Returns: { [symbol]: quote }
   */
  async fetchQuotesForHoldings(holdings) {
    if (!Array.isArray(holdings) || holdings.length === 0) return {};

    const uniqueSymbols = [...new Set(holdings.map(h => (h.symbol || '').toUpperCase().trim()).filter(Boolean))];
    const results = {};

    await Promise.allSettled(
      uniqueSymbols.map(async (sym) => {
        const holding = holdings.find(h => (h.symbol || '').toUpperCase().trim() === sym);
        const quote = await this.fetchQuote(sym, holding?.exchange || 'NSE');
        if (quote) {
          results[sym] = quote;
        }
      })
    );

    this.lastSyncTimestamp = Date.now();
    this.notify({ type: 'QUOTES_SYNCED', quotes: results, timestamp: this.lastSyncTimestamp });
    return results;
  }

  /**
   * Test a custom proxy connection URL
   */
  async testConnection(testUrl) {
    const rawUrl = (testUrl || this.customProxyUrl || '').trim();
    if (!rawUrl) throw new Error('Please enter a proxy URL to test.');

    const base = rawUrl.replace(/\/+$/, '');
    const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?interval=1d&range=1d';
    const candidateEndpoints = [
      `${base}?url=${encodeURIComponent(yahooUrl)}`,
      `${base}?symbol=RELIANCE.NS`,
      `${base}/RELIANCE.NS`,
      base
    ];

    let lastError = null;

    for (const ep of candidateEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data && (data.chart || data.price || data.cmp || data.status === 'online')) {
              return {
                ok: true,
                message: 'Connection successful! Live market feed is reachable.',
                data
              };
            }
          }
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw new Error(lastError ? `Connection failed: ${lastError.message}` : 'Proxy did not return valid JSON. Check URL and CORS headers.');
  }

  startAutoRefresh(intervalMs = 30000) {
    this.stopAutoRefresh();
    this.isAutoRefreshActive = true;
    setStoredItem(STORAGE_KEY_AUTO_REFRESH, 'true');

    this.autoRefreshTimer = setInterval(() => {
      // Only poll automatically if the document is active and visible
      if (typeof document !== 'undefined' && document.hidden) return;
      this.notify({ type: 'AUTO_REFRESH_TICK' });
    }, intervalMs);

    this.notify({ type: 'AUTO_REFRESH_TOGGLED', active: true });
  }

  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    this.isAutoRefreshActive = false;
    setStoredItem(STORAGE_KEY_AUTO_REFRESH, 'false');
    this.notify({ type: 'AUTO_REFRESH_TOGGLED', active: false });
  }

  toggleAutoRefresh() {
    if (this.isAutoRefreshActive) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
    return this.isAutoRefreshActive;
  }
}

export const liveMarketService = new LiveMarketService();
