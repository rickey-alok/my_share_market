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

// Fast dictionary of common Indian NSE/BSE symbols to their Moneycontrol scrip identifiers
const SCRIP_MAP = {
  'RELIANCE': 'RI',
  'TCS': 'TCS',
  'HDFCBANK': 'HDF01',
  'INFY': 'IT',
  'TATAMOTORS': 'TML02',
  'TMCV': 'TML02',
  'TMPV': 'TMPV',
  'ICICIBANK': 'ICI02',
  'ITC': 'ITC',
  'BHARTIARTL': 'BTV',
  'LT': 'LT',
  'SUNPHARMA': 'SPI',
  'BAJFINANCE': 'BAF',
  'ZOMATO': 'Z01',
  'ETERNAL': 'Z01',
  'SBIN': 'SBI',
  'KOTAKBANK': 'KMF',
  'MARUTI': 'MU01',
  'WIPRO': 'W',
  'HCLTECH': 'HCL02',
  'AXISBANK': 'UTI10',
  'TITAN': 'TI01',
  'ASIANPAINT': 'API',
  'TATASTEEL': 'TIS',
  'NTPC': 'NTP',
  'ONGC': 'ONG',
  'COALINDIA': 'CI29',
  'PTC': 'PTC01', // PTC India Ltd. (Power Trading)
  'PTCIL': 'PTC02', // PTC Industries Ltd. (Heavy Engineering / Aerospace)
  'BEL': 'BE03',
  'IRFC': 'IRF',
  'RVNL': 'RVN',
  'SWIGGY': 'SL23',
  'TATATECH': 'TTL01',
  'TEJASNET': 'TN',
  'TTML': 'HTC02',
  'ADANIENT': 'AE01',
  'ADANIGREEN': 'ADANI54145',
  'ATGL': 'ADG01',
  'RAILTEL': 'RCO01'
};

class LiveMarketService {
  constructor() {
    this.customProxyUrl = getStoredItem(STORAGE_KEY_CUSTOM_PROXY, '') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKET_PROXY_URL) || '';
    this.isAutoRefreshActive = getStoredItem(STORAGE_KEY_AUTO_REFRESH, 'false') === 'true';
    this.cache = new Map();
    this.scripCache = new Map(Object.entries(SCRIP_MAP));
    this.lastSyncTimestamp = null;
    this.lastSyncMeta = null;
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

  getLastSyncMeta() {
    return this.lastSyncMeta || {
      marketState: this.isMarketOpen() ? 'OPEN' : 'CLOSED',
      timestamp: this.lastSyncTimestamp
    };
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
   * Resolve Moneycontrol scrip identifier for any symbol
   */
  async resolveScripId(cleanSym) {
    if (this.scripCache.has(cleanSym)) {
      return this.scripCache.get(cleanSym);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const sUrl = `https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?query=${encodeURIComponent(cleanSym)}&type=1&format=json`;
      const sRes = await fetch(sUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (sRes.ok) {
        const items = await sRes.json();
        if (Array.isArray(items) && items.length > 0) {
          // Tier 1: Exact match on ticker symbol, ISIN, or security code in span tokens
          // Example: "PTC India&nbsp;<span>INE877F01012, PTC, 532524</span>"
          let match = items.find(i => {
            if (!i.pdt_dis_nm) return false;
            const spanMatch = i.pdt_dis_nm.match(/<span>(.*?)<\/span>/i);
            if (spanMatch && spanMatch[1]) {
              const tokens = spanMatch[1].split(',').map(s => s.trim().toUpperCase());
              return tokens.includes(cleanSym);
            }
            return false;
          });

          // Tier 2: Exact match on sc_id or stock_name or name
          if (!match) {
            match = items.find(i => 
              (i.sc_id && i.sc_id.toUpperCase() === cleanSym) ||
              (i.stock_name && i.stock_name.trim().toUpperCase() === cleanSym) ||
              (i.name && i.name.trim().toUpperCase() === cleanSym)
            );
          }

          // Tier 3: Word boundary prefix match on stock_name or name
          // E.g., "PTC India" vs "PTC Industries"
          if (!match) {
            const boundaryRegex = new RegExp(`^${cleanSym}(?:\\s|&|\\b)`, 'i');
            match = items.find(i => 
              (i.stock_name && boundaryRegex.test(i.stock_name.trim())) ||
              (i.name && boundaryRegex.test(i.name.trim()))
            );
          }

          // Tier 4: Substring match if no exact match was found
          if (!match) {
            match = items.find(i => 
              (i.pdt_dis_nm && i.pdt_dis_nm.toUpperCase().includes(cleanSym)) || 
              (i.stock_name && i.stock_name.toUpperCase().includes(cleanSym))
            );
          }

          // Tier 5: Fallback to first item if present
          if (!match && items.length > 0) {
            match = items[0];
          }

          if (match && match.sc_id) {
            this.scripCache.set(cleanSym, match.sc_id);
            return match.sc_id;
          }
        }
      }
    } catch (e) {
      // Ignore lookup failure
    }

    return null;
  }

  /**
   * Primary live quote fetcher via direct CORS-enabled real-time endpoint
   */
  async fetchDirectLiveQuote(cleanSym, exchange = 'NSE') {
    const scId = await this.resolveScripId(cleanSym);
    if (!scId) return null;

    try {
      const ex = exchange.toUpperCase() === 'BSE' ? 'bse' : 'nse';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://priceapi.moneycontrol.com/pricefeed/${ex}/equitycash/${encodeURIComponent(scId)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.data && json.data.pricecurrent) {
          const d = json.data;
          const cmp = parseFloat(d.pricecurrent);
          if (!isNaN(cmp) && cmp > 0) {
            const prevClose = parseFloat(d.priceprevclose || d.referencePrice || cmp);
            const dayChange = parseFloat(d.pricechange || (cmp - prevClose).toFixed(2));
            const dayChangePercent = parseFloat(d.pricepercentchange || (prevClose > 0 ? (((cmp - prevClose) / prevClose) * 100).toFixed(2) : '0'));

            const dayHigh = parseFloat(d.HP || cmp);
            const dayLow = parseFloat(d.LP || cmp);
            const week52High = parseFloat(d['52H'] || d.fiftyTwoHigh || 0);
            const week52Low = parseFloat(d['52L'] || d.fiftyTwoLow || 0);

            return {
              symbol: cleanSym,
              name: d.company || d.SC_FULLNM || cleanSym,
              cmp,
              prevClose,
              dayChange,
              dayChangePercent,
              high: dayHigh,
              low: dayLow,
              dayHigh,
              dayLow,
              week52High,
              week52Low,
              open: parseFloat(d.OPN || prevClose),
              marketState: d.market_state || (this.isMarketOpen() ? 'OPEN' : 'CLOSED'),
              lastUpdated: d.lastupd || '',
              source: 'LIVE_EXCHANGE',
              timestamp: Date.now()
            };
          }
        }
      }
    } catch (e) {
      // Primary direct fetch failed
    }

    return null;
  }

  /**
   * Fetch live quote for a single symbol
   * Pipeline:
   * 1. Direct CORS-enabled real-time market API (Moneycontrol CDN)
   * 2. Custom proxy or local Vite proxy (Yahoo Finance)
   * 3. Fallback to calibrated catalog in stocksDatabase.js
   */
  async fetchQuote(symbol, exchange = 'NSE') {
    const cleanSym = (symbol || '').toUpperCase().trim();
    if (!cleanSym) return null;

    // 1. Direct real-time exchange quote
    let quote = await this.fetchDirectLiveQuote(cleanSym, exchange);

    // 2. Secondary fallback: Proxy endpoints if direct didn't return
    if (!quote) {
      const ticker = this.formatTicker(cleanSym, exchange);
      const endpoints = [];

      if (this.customProxyUrl) {
        const base = this.customProxyUrl.replace(/\/+$/, '');
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        endpoints.push(`${base}?url=${encodeURIComponent(yahooUrl)}`);
        endpoints.push(`${base}?symbol=${encodeURIComponent(ticker)}`);
        endpoints.push(`${base}/${encodeURIComponent(ticker)}`);
      }

      endpoints.push(`/api/market/${ticker}?interval=1d&range=1d`);

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
              continue;
            }

            const data = await res.json();
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
              const meta = data.chart.result[0].meta;
              const price = meta.regularMarketPrice || meta.chartPreviousClose;
              const prevClose = meta.chartPreviousClose || price;
              const dayChange = price - prevClose;
              const dayChangePercent = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;

              const dayHigh = parseFloat(meta.regularMarketDayHigh || price);
              const dayLow = parseFloat(meta.regularMarketDayLow || price);
              const week52High = parseFloat(meta.fiftyTwoWeekHigh || 0);
              const week52Low = parseFloat(meta.fiftyTwoWeekLow || 0);

              quote = {
                symbol: cleanSym,
                cmp: parseFloat(price.toFixed(2)),
                prevClose: parseFloat(prevClose.toFixed(2)),
                dayChange: parseFloat(dayChange.toFixed(2)),
                dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
                currency: meta.currency || 'INR',
                exchange: meta.exchangeName || exchange,
                high: dayHigh,
                low: dayLow,
                dayHigh,
                dayLow,
                week52High,
                week52Low,
                source: 'LIVE_EXCHANGE',
                timestamp: Date.now()
              };
              break;
            } else if (data && (data.price !== undefined || data.cmp !== undefined)) {
              const price = parseFloat(data.price || data.cmp);
              const prevClose = parseFloat(data.prevClose || price);
              const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
              quote = {
                symbol: cleanSym,
                cmp: price,
                prevClose: prevClose,
                dayChange: parseFloat((price - prevClose).toFixed(2)),
                dayChangePercent: prevClose > 0 ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0,
                high: refStock?.dayHigh || price,
                low: refStock?.dayLow || price,
                dayHigh: refStock?.dayHigh || price,
                dayLow: refStock?.dayLow || price,
                week52High: refStock?.week52High || 0,
                week52Low: refStock?.week52Low || 0,
                source: 'LIVE_EXCHANGE',
                timestamp: Date.now()
              };
              break;
            }
          }
        } catch (err) {}
      }
    }

    // 3. Tertiary fallback: Verified stocksDatabase catalog
    if (!quote) {
      const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
      if (ref) {
        quote = {
          symbol: cleanSym,
          cmp: ref.cmp,
          prevClose: ref.prevClose || ref.cmp,
          dayChange: parseFloat((ref.cmp - (ref.prevClose || ref.cmp)).toFixed(2)),
          dayChangePercent: ref.dayChangePercent || 0,
          high: ref.dayHigh || ref.cmp,
          low: ref.dayLow || ref.cmp,
          dayHigh: ref.dayHigh || ref.cmp,
          dayLow: ref.dayLow || ref.cmp,
          week52High: ref.week52High || (ref.cmp * 1.25),
          week52Low: ref.week52Low || (ref.cmp * 0.75),
          source: 'DATABASE_REFERENCE',
          timestamp: Date.now()
        };
      } else {
        quote = this.cache.get(cleanSym) || null;
      }
    }

    if (quote) {
      this.cache.set(cleanSym, quote);
    }

    return quote;
  }

  /**
   * Fetch live prices for an array of holdings in parallel
   * Returns: { [symbol]: quote }
   */
  async fetchQuotesForHoldings(holdings) {
    if (!Array.isArray(holdings) || holdings.length === 0) return {};

    const uniqueSymbols = [...new Set(holdings.map(h => (h.symbol || '').toUpperCase().trim()).filter(Boolean))];
    const results = {};
    let liveCount = 0;
    let detectedMarketState = this.isMarketOpen() ? 'OPEN' : 'CLOSED';

    await Promise.allSettled(
      uniqueSymbols.map(async (sym) => {
        const holding = holdings.find(h => (h.symbol || '').toUpperCase().trim() === sym);
        const quote = await this.fetchQuote(sym, holding?.exchange || 'NSE');
        if (quote) {
          results[sym] = quote;
          if (quote.source === 'LIVE_EXCHANGE') {
            liveCount++;
            if (quote.marketState) {
              detectedMarketState = quote.marketState;
            }
          }
        }
      })
    );

    this.lastSyncTimestamp = Date.now();
    this.lastSyncMeta = {
      total: uniqueSymbols.length,
      liveCount,
      marketState: detectedMarketState,
      timestamp: this.lastSyncTimestamp,
      lastSyncFormatted: this.getLastSyncFormatted()
    };

    this.notify({
      type: 'QUOTES_SYNCED',
      quotes: results,
      timestamp: this.lastSyncTimestamp,
      meta: this.lastSyncMeta
    });

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
      // Do not auto-poll continuously outside market hours (nights/weekends)
      if (!this.isMarketOpen()) return;
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
