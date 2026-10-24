// Bulk Import Helper: Parses Excel (.xlsx, .xls), CSV (.csv), and JSON (.json) files
import * as XLSX from 'xlsx';
import { POPULAR_STOCKS } from '../data/stocksDatabase.js';

// Fast dictionary of popular Indian stock symbols and ISINs to company names and sectors
export const STOCK_DICTIONARY = {
  // Symbols
  'ADANIENT': { name: 'Adani Enterprises Ltd.', sector: 'Trading & Infrastructure' },
  'ADANIGREEN': { name: 'Adani Green Energy Ltd.', sector: 'Renewable Energy' },
  'ATGL': { name: 'Adani Total Gas Ltd.', sector: 'City Gas Distribution' },
  'ETERNAL': { name: 'Zomato Ltd. (Eternal)', sector: 'New Age / Consumer Tech' },
  'RAILTEL': { name: 'RailTel Corporation of India Ltd.', sector: 'Telecom & IT Infrastructure' },
  'RVNL': { name: 'Rail Vikas Nigam Ltd.', sector: 'Railway Infrastructure' },
  'SWIGGY': { name: 'Swiggy Ltd.', sector: 'New Age / Consumer Tech' },
  'TATATECH': { name: 'Tata Technologies Ltd.', sector: 'Engineering & Technology Services' },
  'TEJASNET': { name: 'Tejas Networks Ltd.', sector: 'Telecom Equipment' },
  'TTML': { name: 'Tata Teleservices (Maharashtra) Ltd.', sector: 'Telecommunications' },
  'IRFC': { name: 'Indian Railway Finance Corporation', sector: 'Banking & Financials' },
  'JIOFIN': { name: 'Jio Financial Services Ltd.', sector: 'Banking & Financials' },
  'HDFCAMC': { name: 'HDFC Asset Management Company Ltd.', sector: 'Banking & Financials' },
  'PAYTM': { name: 'One97 Communications Ltd. (Paytm)', sector: 'New Age / Consumer Tech' },
  'EICHERMOT': { name: 'Eicher Motors Ltd.', sector: 'Automobile' },
  'MOTHERSON': { name: 'Samvardhana Motherson International Ltd.', sector: 'Automobile' },
  'MSUMI': { name: 'Motherson Sumi Wiring India Ltd.', sector: 'Automobile' },
  'APOLLOTYRE': { name: 'Apollo Tyres Ltd.', sector: 'Automobile Tyres' },
  'ABBOTINDIA': { name: 'Abbott India Ltd.', sector: 'Pharmaceuticals & Healthcare' },
  'BANDHANBNK': { name: 'Bandhan Bank Ltd.', sector: 'Banking & Financials' },
  'CEATLTD': { name: 'CEAT Ltd.', sector: 'Automobile Tyres' },
  'CENTURYPLY': { name: 'Century Plyboards Ltd.', sector: 'Consumer Goods' },
  'DABUR': { name: 'Dabur India Ltd.', sector: 'Consumer Goods (FMCG)' },
  'FCSSOFT': { name: 'FCS Software Solutions Ltd.', sector: 'Information Technology' },
  'HAPPSTMNDS': { name: 'Happiest Minds Technologies Ltd.', sector: 'Information Technology' },
  'HEROMOTOCO': { name: 'Hero MotoCorp Ltd.', sector: 'Automobile' },
  'HINDALCO': { name: 'Hindalco Industries Ltd.', sector: 'Metal & Mining' },
  'IEX': { name: 'Indian Energy Exchange Ltd.', sector: 'Financial Services' },
  'ITCHOTELS': { name: 'ITC Hotels Ltd.', sector: 'Hospitality & Services' },
  'LATENTVIEW': { name: 'Latent View Analytics Ltd.', sector: 'Information Technology' },
  'LLOYDSENGG': { name: 'Lloyds Engineering Works Ltd.', sector: 'Infrastructure & Capital Goods' },
  'NMDC': { name: 'NMDC Ltd.', sector: 'Metal & Mining' },
  'NSLNISP': { name: 'NMDC Steel Ltd.', sector: 'Metal & Mining' },
  'PIDILITIND': { name: 'Pidilite Industries Ltd.', sector: 'Chemicals & Materials' },
  'PTC': { name: 'PTC India Ltd.', sector: 'Energy & Power Trading' },
  'PTCIL': { name: 'PTC Industries Ltd.', sector: 'Automobile & Ancillaries' },

  // ISIN mappings
  'INE423A01024': { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', sector: 'Trading & Infrastructure' },
  'INE364U01010': { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd.', sector: 'Renewable Energy' },
  'INE399L01023': { symbol: 'ATGL', name: 'Adani Total Gas Ltd.', sector: 'City Gas Distribution' },
  'INE758T01015': { symbol: 'ETERNAL', name: 'Zomato Ltd. (Eternal)', sector: 'New Age / Consumer Tech' },
  'INE0DD101019': { symbol: 'RAILTEL', name: 'RailTel Corporation of India Ltd.', sector: 'Telecom & IT Infrastructure' },
  'INE415G01027': { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', sector: 'Railway Infrastructure' },
  'INE00H001014': { symbol: 'SWIGGY', name: 'Swiggy Ltd.', sector: 'New Age / Consumer Tech' },
  'INE142M01025': { symbol: 'TATATECH', name: 'Tata Technologies Ltd.', sector: 'Engineering & Technology Services' },
  'INE010J01012': { symbol: 'TEJASNET', name: 'Tejas Networks Ltd.', sector: 'Telecom Equipment' },
  'INE517B01013': { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', sector: 'Telecommunications' },
  'INE877F01012': { symbol: 'PTC', name: 'PTC India Ltd.', sector: 'Energy & Power Trading' },
  'INE596F01018': { symbol: 'PTCIL', name: 'PTC Industries Ltd.', sector: 'Automobile & Ancillaries' }
};

/**
 * Normalizes an arbitrary object/row into standard stock holding fields
 * Supports standard headers, broker exports (Zerodha Kite, Groww, Invest Right, AngelOne, Upstox),
 * and custom spreadsheets.
 */
export function normalizeRow(row, metadata = {}) {
  if (!row || typeof row !== 'object') return null;

  const keys = Object.keys(row);
  const getVal = (patterns) => {
    for (const p of patterns) {
      const found = keys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
        return row[found];
      }
    }
    return undefined;
  };

  const rawSymbol = getVal(['symbol', 'stock', 'ticker', 'scrip', 'tradingsymbol', 'instrument', 'stocksymbol', 'code', 'securityid', 'isin']);
  if (!rawSymbol) return null;

  let symbol = String(rawSymbol).trim().toUpperCase();
  const cleanSymbolCheck = symbol.replace(/[^A-Z0-9]/g, '');
  if (!cleanSymbolCheck || ['SYMBOL', 'TOTAL', 'GRANDTOTAL', 'SUBTOTAL', 'SUMMARY', 'DISCLAIMER', 'NOTE', 'NOTES'].includes(cleanSymbolCheck)) {
    return null;
  }

  // Strip common broker suffixes like .NS, .BO, -EQ, -BE
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
    symbol = symbol.slice(0, -3).trim();
  } else if (symbol.endsWith('-EQ') || symbol.endsWith('-BE') || symbol.endsWith('-BL') || symbol.endsWith('-BZ')) {
    symbol = symbol.slice(0, -3).trim();
  }

  // 1. Support multi-part quantities (Zerodha Kite statement format: Quantity Available + Pledged + Discrepant)
  const rawAvailQty = getVal(['quantityavailable', 'availableqty', 'availablequantity']);
  const rawPledgedMargin = getVal(['quantitypledgedmargin', 'pledgedmarginqty', 'pledgedmargin']);
  const rawPledgedLoan = getVal(['quantitypledgedloan', 'pledgedloanqty', 'pledgedloan']);
  const rawDiscrepant = getVal(['quantitydiscrepant', 'discrepantqty']);

  let quantity = NaN;
  if (rawAvailQty !== undefined) {
    const parseNum = (v) => {
      if (v === undefined || v === null || String(v).trim() === '') return 0;
      const n = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
      return isNaN(n) ? 0 : n;
    };
    const avail = parseNum(rawAvailQty);
    const pMargin = parseNum(rawPledgedMargin);
    const pLoan = parseNum(rawPledgedLoan);
    const disc = parseNum(rawDiscrepant);
    const totalCalc = avail + pMargin + pLoan + disc;
    if (totalCalc > 0) {
      quantity = totalCalc;
    }
  }

  // 2. Standard single quantity column fallback
  if (isNaN(quantity) || quantity <= 0) {
    const rawQty = getVal([
      'quantity', 'shares', 'qty', 'units', 'totalqty', 'totalquantity',
      'holdingqty', 'holdingquantity', 'holding', 'volume', 'netqty', 'netquantity',
      'currentqty', 'currentquantity', 'openqty', 'balqty', 'balanceqty',
      'longtermqty', 'quantitylongterm'
    ]);
    if (rawQty !== undefined) {
      quantity = parseFloat(String(rawQty).replace(/[^0-9.-]+/g, ''));
    }
  }

  // Buy Price / Cost
  const rawPrice = getVal([
    'buyprice', 'averageprice', 'avgprice', 'buyavg', 'price', 'costprice', 'rate',
    'avgcost', 'purchaseprice', 'netprice', 'avgbuyprice', 'purchaseavg', 'cost',
    'costbasis', 'entryprice', 'averagecost', 'avgcostprice', 'purprice'
  ]);
  const buyPrice = rawPrice !== undefined ? parseFloat(String(rawPrice).replace(/[^0-9.-]+/g, '')) : NaN;

  // CMP / LTP / Previous Closing Price (Zerodha Kite exports Previous Closing Price)
  const rawCmp = getVal([
    'ltp', 'cmp', 'currentmarketprice', 'lasttradedprice', 'marketprice', 'lastprice', 'currentprice',
    'previousclosingprice', 'prevclosingprice', 'previousclose', 'prevclose', 'closingprice', 'close'
  ]);
  const fileCmp = rawCmp !== undefined ? parseFloat(String(rawCmp).replace(/[^0-9.-]+/g, '')) : NaN;

  const rawPrevClose = getVal([
    'previousclosingprice', 'prevclosingprice', 'previousclose', 'prevclose', 'closingprice', 'close'
  ]);
  const filePrevClose = rawPrevClose !== undefined ? parseFloat(String(rawPrevClose).replace(/[^0-9.-]+/g, '')) : NaN;

  // Metadata columns
  const rawName = getVal(['companyname', 'name', 'company', 'stockname', 'description', 'security', 'instrumentname', 'scripname']);
  const rawExchange = getVal(['exchange', 'market', 'exch']);
  const rawSector = getVal(['sector', 'industry', 'category']);
  const rawDate = getVal(['buydate', 'date', 'purchasedate', 'transdate', 'tradedate']);
  const rawNotes = getVal(['notes', 'remark', 'comments']);
  const rawIsin = getVal(['isin', 'isincode']);

  const isin = (rawIsin && String(rawIsin).trim().toUpperCase()) || '';

  // Cross-reference with stock database and dictionary
  const refStock = POPULAR_STOCKS.find(s => 
    s.symbol.toUpperCase() === symbol || 
    (isin && s.isin && s.isin.toUpperCase() === isin)
  );

  const dictStock = STOCK_DICTIONARY[symbol] || (isin ? STOCK_DICTIONARY[isin] : null);

  // If file provided LTP/Previous Closing Price, prioritize it, otherwise fallback to database CMP or buyPrice
  const cmp = (!isNaN(fileCmp) && fileCmp > 0) ? fileCmp : (refStock ? refStock.cmp : buyPrice);
  const prevClose = (!isNaN(filePrevClose) && filePrevClose > 0) ? filePrevClose : (refStock ? refStock.prevClose : cmp);
  const dayHigh = refStock ? refStock.dayHigh : cmp;
  const dayLow = refStock ? refStock.dayLow : cmp;
  const week52High = refStock ? refStock.week52High : parseFloat((cmp * 1.25).toFixed(2));
  const week52Low = refStock ? refStock.week52Low : parseFloat((cmp * 0.75).toFixed(2));

  // Determine Company Name
  let name = symbol;
  if (rawName && String(rawName).trim() && String(rawName).trim().toUpperCase() !== symbol) {
    name = String(rawName).trim();
  } else if (refStock && refStock.name) {
    name = refStock.name;
  } else if (dictStock && dictStock.name) {
    name = dictStock.name;
  }

  // Determine Sector and format cleanly
  let sector = (rawSector && String(rawSector).trim()) || (refStock ? refStock.sector : (dictStock ? dictStock.sector : 'General / Equity'));
  if (sector && sector === sector.toUpperCase() && sector.length > 3) {
    // Convert uppercase strings like "ENGINEERING & CAPITAL GOODS" to Title Case
    sector = sector.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\bAnd\b/g, '&');
  }

  // Determine Buy Date (use row date, or statement date from file header, or today)
  let buyDate = rawDate ? String(rawDate).trim() : (metadata.statementDate || new Date().toISOString().split('T')[0]);
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(buyDate)) {
    const parts = buyDate.split(/[\/-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    buyDate = `${year}-${month}-${day}`;
  }

  const notes = rawNotes ? String(rawNotes).trim() : (metadata.defaultNote || 'Bulk imported');

  return {
    symbol,
    name,
    isin,
    exchange: (rawExchange && String(rawExchange).trim().toUpperCase()) || (String(rawSymbol).toUpperCase().includes('.BO') ? 'BSE' : (refStock ? refStock.exchange : 'NSE')),
    sector,
    quantity,
    buyPrice,
    cmp,
    prevClose,
    dayHigh,
    dayLow,
    week52High,
    week52Low,
    buyDate,
    notes
  };
}

/**
 * Intelligently extracts rows from a sheet by locating the actual table header row.
 * Handles broker exports with metadata/title headers (e.g. Zerodha Kite statements, Invest Right, dates, or blank lines).
 * Returns { rows: Array<Object>, metadata: Object }
 */
export function extractSheetRows(sheet) {
  if (!sheet) return { rows: [], metadata: {} };

  // Convert sheet to a 2D array of rows
  const rawAoA = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawAoA || rawAoA.length === 0) return { rows: [], metadata: {} };

  const metadata = {
    clientId: '',
    statementDate: '',
    broker: '',
    defaultNote: 'Bulk imported'
  };

  // Inspect pre-table rows for broker info, client ID, and statement date
  for (let r = 0; r < Math.min(rawAoA.length, 30); r++) {
    const row = rawAoA[r];
    if (!Array.isArray(row)) continue;
    const lineText = row.map(c => String(c || '').trim()).filter(Boolean).join(' ');

    // Zerodha Kite Client ID
    const clientMatch = lineText.match(/Client\s*ID\s*[:\s]*([A-Z0-9_-]+)/i);
    if (clientMatch && !metadata.clientId) {
      metadata.clientId = clientMatch[1].trim();
      metadata.broker = 'Zerodha Kite';
    }

    // Motilal Oswal Invest Right Trading Account
    const accMatch = lineText.match(/Trading\s*account\s*[:\s]*(\d+)/i);
    if (accMatch && !metadata.clientId) {
      metadata.clientId = accMatch[1].trim();
      metadata.broker = 'Motilal Oswal Invest Right';
    }

    // Statement Date: ISO (YYYY-MM-DD) or DMY (DD/MM/YYYY)
    const dateMatchIso = lineText.match(/(?:as on|as of|dated?)\s*[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const dateMatchDmy = lineText.match(/(?:as on|as of|dated?)\s*[:\s]*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4})/i);
    if (dateMatchIso && !metadata.statementDate) {
      metadata.statementDate = dateMatchIso[1];
    } else if (dateMatchDmy && !metadata.statementDate) {
      const parts = dateMatchDmy[1].split(/[\/-]/);
      metadata.statementDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  if (metadata.broker && metadata.clientId) {
    metadata.defaultNote = `${metadata.broker} (${metadata.clientId}) imported`;
  } else if (metadata.broker) {
    metadata.defaultNote = `${metadata.broker} imported`;
  }

  const SYMBOL_PATTERNS = ['symbol', 'stock', 'ticker', 'scrip', 'tradingsymbol', 'instrument', 'security', 'securityid', 'stockname', 'company'];
  const QTY_PRICE_PATTERNS = [
    'quantity', 'qty', 'shares', 'units', 'holding', 'quantityavailable', 'availableqty', 'totalqty',
    'price', 'avgprice', 'averageprice', 'buyprice', 'costprice', 'rate', 'ltp', 'cmp', 'previousclosingprice', 'close'
  ];

  // Scan top 60 rows to identify the real table header row (checking for both symbol and quantity/price columns)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawAoA.length, 60); r++) {
    const row = rawAoA[r];
    if (Array.isArray(row)) {
      const cleanedCells = row.map(cell => String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      const hasSymbol = cleanedCells.some(c => SYMBOL_PATTERNS.includes(c));
      const hasQtyOrPrice = cleanedCells.some(c => QTY_PRICE_PATTERNS.includes(c));

      if (hasSymbol && hasQtyOrPrice) {
        headerRowIndex = r;
        break;
      }
    }
  }

  // Fallback: If combined check didn't match, check for symbol column alone
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rawAoA.length, 30); r++) {
      const row = rawAoA[r];
      if (Array.isArray(row)) {
        const cleanedCells = row.map(cell => String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (cleanedCells.some(c => SYMBOL_PATTERNS.includes(c))) {
          headerRowIndex = r;
          break;
        }
      }
    }
  }

  // If a header row was located, map subsequent rows into objects
  if (headerRowIndex !== -1) {
    const headerRow = rawAoA[headerRowIndex].map(h => String(h || '').trim());
    const objects = [];
    for (let r = headerRowIndex + 1; r < rawAoA.length; r++) {
      const row = rawAoA[r];
      if (!row || row.length === 0 || row.every(c => c === '' || c === undefined || c === null)) continue;

      const obj = {};
      headerRow.forEach((key, colIdx) => {
        if (key) {
          obj[key] = row[colIdx];
        }
      });
      objects.push(obj);
    }
    return { rows: objects, metadata };
  }

  // Fallback to standard sheet_to_json if no header could be identified
  return { rows: XLSX.utils.sheet_to_json(sheet, { defval: '' }), metadata };
}

/**
 * Parses an uploaded File (Excel, CSV, or JSON)
 * @param {File} file
 * @returns {Promise<Object>} Summary and parsed stock items
 */
export async function parseImportFile(file) {
  if (!file) throw new Error('No file provided');

  const fileName = file.name;
  const ext = fileName.split('.').pop().toLowerCase();

  let rawRows = [];
  let fileType = 'Unknown';
  let fileMetadata = {};
  let selectedSheetName = '';

  if (ext === 'json') {
    fileType = 'JSON';
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      rawRows = parsed;
    } else if (parsed && Array.isArray(parsed.holdings)) {
      rawRows = parsed.holdings;
    } else if (parsed && Array.isArray(parsed.stocks)) {
      rawRows = parsed.stocks;
    } else if (parsed && Array.isArray(parsed.data)) {
      rawRows = parsed.data;
    } else {
      throw new Error('Unrecognized JSON structure. Expected array of holdings or { holdings: [...] } object.');
    }
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    fileType = ext === 'csv' ? 'CSV' : 'Excel';
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('Excel workbook contains no sheets.');
    }

    if (ext === 'csv' || wb.SheetNames.length === 1) {
      // Single sheet file
      selectedSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[selectedSheetName];
      const res = extractSheetRows(sheet);
      rawRows = res.rows;
      fileMetadata = res.metadata;
    } else {
      // Multi-sheet Excel workbook (e.g., Zerodha Kite with Equity, Mutual Funds, Combined)
      // Prioritize sheets named 'Equity', 'Holdings', 'Stocks', 'Portfolio', 'Combined'
      const preferredNames = ['equity', 'holdings', 'holding', 'stocks', 'portfolio', 'shares', 'equity holdings', 'combined', 'investments'];

      const sortedSheetNames = [...wb.SheetNames].sort((a, b) => {
        const aLower = a.toLowerCase().trim();
        const bLower = b.toLowerCase().trim();
        const aScore = preferredNames.findIndex(p => aLower === p || aLower.includes(p));
        const bScore = preferredNames.findIndex(p => bLower === p || bLower.includes(p));
        if (aScore !== -1 && bScore !== -1) return aScore - bScore;
        if (aScore !== -1) return -1;
        if (bScore !== -1) return 1;
        return 0;
      });

      let bestResult = null;
      let bestValidCount = 0;

      for (const sheetName of sortedSheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;

        const res = extractSheetRows(sheet);
        if (!res.rows || res.rows.length === 0) continue;

        // Count how many rows successfully normalize to valid stock holdings
        const validCount = res.rows.filter(r => {
          const item = normalizeRow(r, res.metadata);
          return item && !isNaN(item.quantity) && item.quantity > 0 && !isNaN(item.buyPrice);
        }).length;

        if (validCount > bestValidCount) {
          bestValidCount = validCount;
          bestResult = res;
          selectedSheetName = sheetName;
          // If this is an Equity/Holdings sheet with valid stocks, break early
          if (sheetName.toLowerCase().includes('equity') || sheetName.toLowerCase().includes('holding')) {
            break;
          }
        }
      }

      if (bestResult) {
        rawRows = bestResult.rows;
        fileMetadata = bestResult.metadata;
      } else {
        // Fallback to first sheet
        selectedSheetName = wb.SheetNames[0];
        const res = extractSheetRows(wb.Sheets[selectedSheetName]);
        rawRows = res.rows;
        fileMetadata = res.metadata;
      }
    }
  } else {
    throw new Error(`Unsupported file format (.${ext}). Please upload an Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) file.`);
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('File appears to be empty or contains no readable rows.');
  }

  const validItems = [];
  const invalidRows = [];

  rawRows.forEach((row, idx) => {
    const item = normalizeRow(row, fileMetadata);
    if (!item) {
      invalidRows.push({ rowIndex: idx + 2, reason: 'Missing or invalid stock symbol', raw: row });
      return;
    }
    if (isNaN(item.quantity) || item.quantity <= 0) {
      invalidRows.push({ rowIndex: idx + 2, symbol: item.symbol, reason: 'Invalid or zero quantity', raw: row });
      return;
    }
    if (isNaN(item.buyPrice) || item.buyPrice < 0) {
      invalidRows.push({ rowIndex: idx + 2, symbol: item.symbol, reason: 'Invalid buy price', raw: row });
      return;
    }

    validItems.push(item);
  });

  const totalInvested = validItems.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);
  const totalShares = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPresentValue = validItems.reduce((sum, item) => sum + (item.quantity * item.cmp), 0);
  const unrealizedPnL = totalPresentValue - totalInvested;
  const unrealizedPnLPct = totalInvested > 0 ? ((unrealizedPnL / totalInvested) * 100) : 0;

  return {
    fileName,
    fileType,
    fileSize: (file.size / 1024).toFixed(1) + ' KB',
    sheetName: selectedSheetName,
    broker: fileMetadata.broker || (fileName.toLowerCase().includes('kkz') ? 'Zerodha Kite' : ''),
    clientId: fileMetadata.clientId || '',
    statementDate: fileMetadata.statementDate || '',
    totalRows: rawRows.length,
    validItems,
    invalidRows,
    totalInvested,
    totalShares,
    totalPresentValue,
    unrealizedPnL,
    unrealizedPnLPct
  };
}

/**
 * Downloads a pre-formatted sample Excel template (.xlsx)
 * Modeled after real broker portfolios like Motilal Oswal Invest Right, Zerodha Kite & Groww
 */
export function downloadSampleExcel() {
  const data = [
    ['SYMBOL', 'COMPANY NAME', 'QTY', 'AVG PRICE', 'LTP', 'EXCHANGE', 'SECTOR'],
    ['RELIANCE', 'Reliance Industries Ltd.', 20, 937.09, 1190.00, 'NSE', 'Energy & Petrochemicals'],
    ['ABBOTINDIA', 'Abbott India Ltd.', 3, 15193.58, 25030.00, 'NSE', 'Pharmaceuticals & Healthcare'],
    ['APOLLOTYRE', 'Apollo Tyres Ltd.', 50, 321.32, 384.15, 'NSE', 'Automobile Tyres'],
    ['AXISBANK', 'Axis Bank Ltd.', 8, 740.20, 1217.50, 'NSE', 'Banking & Financials'],
    ['BAJFINANCE', 'Bajaj Finance Ltd.', 60, 465.47, 928.95, 'NSE', 'Banking & Financials'],
    ['BAJAJ-AUTO', 'Bajaj Auto Ltd.', 10, 3696.00, 10072.00, 'NSE', 'Automobile'],
    ['TCS', 'Tata Consultancy Services', 25, 2380.00, 2530.00, 'NSE', 'Information Technology'],
    ['INFY', 'Infosys Ltd.', 100, 1145.20, 1153.80, 'NSE', 'Information Technology'],
    ['HDFCBANK', 'HDFC Bank Ltd.', 100, 738.98, 692.80, 'NSE', 'Banking & Financials'],
    ['ZOMATO', 'Zomato Ltd. (Eternal)', 200, 260.00, 317.40, 'NSE', 'New Age / Consumer Tech'],
    ['TATAMOTORS', 'Tata Motors Commercial Vehicles', 116, 96.71, 396.00, 'NSE', 'Automobile'],
    ['ITC', 'ITC Ltd.', 100, 176.82, 257.90, 'NSE', 'Consumer Goods (FMCG)']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 34 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equity Portfolio');
  XLSX.writeFile(wb, 'apna_share_sample_holdings.xlsx');
}

/**
 * Downloads a pre-formatted sample CSV template (.csv)
 */
export function downloadSampleCsv() {
  const csvContent = [
    'SYMBOL,COMPANY NAME,QTY,AVG PRICE,LTP,EXCHANGE,SECTOR',
    'RELIANCE,Reliance Industries Ltd.,20,937.09,1190.00,NSE,Energy & Petrochemicals',
    'ABBOTINDIA,Abbott India Ltd.,3,15193.58,25030.00,NSE,Pharmaceuticals & Healthcare',
    'APOLLOTYRE,Apollo Tyres Ltd.,50,321.32,384.15,NSE,Automobile Tyres',
    'AXISBANK,Axis Bank Ltd.,8,740.20,1217.50,NSE,Banking & Financials',
    'BAJFINANCE,Bajaj Finance Ltd.,60,465.47,928.95,NSE,Banking & Financials',
    'BAJAJ-AUTO,Bajaj Auto Ltd.,10,3696.00,10072.00,NSE,Automobile',
    'TCS,Tata Consultancy Services,25,2380.00,2530.00,NSE,Information Technology',
    'INFY,Infosys Ltd.,100,1145.20,1153.80,NSE,Information Technology',
    'HDFCBANK,HDFC Bank Ltd.,100,738.98,692.80,NSE,Banking & Financials',
    'ZOMATO,Zomato Ltd. (Eternal),200,260.00,317.40,NSE,New Age / Consumer Tech',
    'TATAMOTORS,Tata Motors Commercial Vehicles,116,96.71,396.00,NSE,Automobile',
    'ITC,ITC Ltd.,100,176.82,257.90,NSE,Consumer Goods (FMCG)'
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apna_share_sample_holdings.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a pre-formatted sample JSON template (.json)
 */
export function downloadSampleJson() {
  const sample = [
    {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      quantity: 20,
      buyPrice: 937.09,
      cmp: 1190.00,
      exchange: 'NSE',
      sector: 'Energy & Petrochemicals'
    },
    {
      symbol: 'ABBOTINDIA',
      name: 'Abbott India Ltd.',
      quantity: 3,
      buyPrice: 15193.58,
      cmp: 25030.00,
      exchange: 'NSE',
      sector: 'Pharmaceuticals & Healthcare'
    },
    {
      symbol: 'BAJFINANCE',
      name: 'Bajaj Finance Ltd.',
      quantity: 60,
      buyPrice: 465.47,
      cmp: 928.95,
      exchange: 'NSE',
      sector: 'Banking & Financials'
    },
    {
      symbol: 'BAJAJ-AUTO',
      name: 'Bajaj Auto Ltd.',
      quantity: 10,
      buyPrice: 3696.00,
      cmp: 10072.00,
      exchange: 'NSE',
      sector: 'Automobile'
    },
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      quantity: 25,
      buyPrice: 2380.00,
      cmp: 2530.00,
      exchange: 'NSE',
      sector: 'Information Technology'
    },
    {
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      quantity: 100,
      buyPrice: 1145.20,
      cmp: 1153.80,
      exchange: 'NSE',
      sector: 'Information Technology'
    },
    {
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      quantity: 100,
      buyPrice: 738.98,
      cmp: 692.80,
      exchange: 'NSE',
      sector: 'Banking & Financials'
    },
    {
      symbol: 'ZOMATO',
      name: 'Zomato Ltd. (Eternal)',
      quantity: 200,
      buyPrice: 260.00,
      cmp: 317.40,
      exchange: 'NSE',
      sector: 'New Age / Consumer Tech'
    }
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apna_share_sample_holdings.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
