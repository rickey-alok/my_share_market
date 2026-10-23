// Bulk Import Helper: Parses Excel (.xlsx, .xls), CSV (.csv), and JSON (.json) files
import * as XLSX from 'xlsx';
import { POPULAR_STOCKS } from '../data/stocksDatabase.js';

/**
 * Normalizes an arbitrary object/row into standard stock holding fields
 * Supports standard headers, broker exports (Zerodha Kite, Groww, Invest Right, AngelOne, Upstox),
 * and custom spreadsheets.
 */
export function normalizeRow(row) {
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

  const rawSymbol = getVal(['symbol', 'stock', 'ticker', 'scrip', 'tradingsymbol', 'instrument', 'stocksymbol', 'code', 'securityid']);
  const rawQty = getVal(['quantity', 'shares', 'qty', 'units', 'totalqty', 'holdingqty', 'holding', 'volume', 'netqty', 'longtermqty']);
  const rawPrice = getVal(['buyprice', 'averageprice', 'avgprice', 'buyavg', 'price', 'costprice', 'rate', 'avgcost', 'purchaseprice', 'netprice']);
  const rawCmp = getVal(['ltp', 'cmp', 'currentmarketprice', 'lasttradedprice', 'marketprice', 'lastprice', 'currentprice', 'close']);
  const rawName = getVal(['companyname', 'name', 'company', 'stockname', 'description', 'security']);
  const rawExchange = getVal(['exchange', 'market', 'exch']);
  const rawSector = getVal(['sector', 'industry', 'category']);
  const rawDate = getVal(['buydate', 'date', 'purchasedate', 'transdate']);
  const rawNotes = getVal(['notes', 'remark', 'comments']);

  if (!rawSymbol) return null;

  let symbol = String(rawSymbol).trim().toUpperCase();
  // Strip common broker suffixes like .NS, .BO, -EQ
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
    symbol = symbol.slice(0, -3).trim();
  } else if (symbol.endsWith('-EQ')) {
    symbol = symbol.slice(0, -3).trim();
  }

  const quantity = rawQty !== undefined ? parseFloat(String(rawQty).replace(/[^0-9.-]+/g, '')) : NaN;
  const buyPrice = rawPrice !== undefined ? parseFloat(String(rawPrice).replace(/[^0-9.-]+/g, '')) : NaN;
  const fileCmp = rawCmp !== undefined ? parseFloat(String(rawCmp).replace(/[^0-9.-]+/g, '')) : NaN;

  // Cross-reference with our comprehensive stock database
  const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);

  // If file provided LTP/CMP, prioritize it, otherwise fallback to database CMP or buyPrice
  const cmp = (!isNaN(fileCmp) && fileCmp > 0) ? fileCmp : (refStock ? refStock.cmp : buyPrice);
  const prevClose = refStock ? refStock.prevClose : cmp;
  const dayHigh = refStock ? refStock.dayHigh : cmp;
  const dayLow = refStock ? refStock.dayLow : cmp;
  const week52High = refStock ? refStock.week52High : parseFloat((cmp * 1.25).toFixed(2));
  const week52Low = refStock ? refStock.week52Low : parseFloat((cmp * 0.75).toFixed(2));

  return {
    symbol,
    name: (rawName && String(rawName).trim()) || (refStock ? refStock.name : symbol),
    exchange: (rawExchange && String(rawExchange).trim().toUpperCase()) || (String(rawSymbol).toUpperCase().includes('.BO') ? 'BSE' : (refStock ? refStock.exchange : 'NSE')),
    sector: (rawSector && String(rawSector).trim()) || (refStock ? refStock.sector : 'General / Equity'),
    quantity,
    buyPrice,
    cmp,
    prevClose,
    dayHigh,
    dayLow,
    week52High,
    week52Low,
    buyDate: rawDate ? String(rawDate).trim() : new Date().toISOString().split('T')[0],
    notes: rawNotes ? String(rawNotes).trim() : 'Bulk imported'
  };
}

/**
 * Intelligently extracts rows from a sheet by locating the actual table header row.
 * Handles broker exports with metadata/title headers (e.g. "Trading account: ...", dates, or blank lines).
 */
export function extractSheetRows(sheet) {
  if (!sheet) return [];

  // Convert sheet to a 2D array of rows
  const rawAoA = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawAoA || rawAoA.length === 0) return [];

  const SYMBOL_PATTERNS = ['symbol', 'stock', 'ticker', 'scrip', 'tradingsymbol', 'instrument', 'security', 'securityid', 'stockname', 'company'];

  // Scan top 25 rows to identify the real table header row
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawAoA.length, 25); r++) {
    const row = rawAoA[r];
    if (Array.isArray(row)) {
      const hasSymbolCol = row.some(cell => {
        const clean = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return SYMBOL_PATTERNS.some(p => clean === p);
      });
      if (hasSymbolCol) {
        headerRowIndex = r;
        break;
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
    return objects;
  }

  // Fallback to standard sheet_to_json if no header could be identified
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
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
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new Error('Excel workbook contains no sheets.');
    const sheet = wb.Sheets[firstSheetName];
    // Use intelligent header detection to bypass leading account/title rows
    rawRows = extractSheetRows(sheet);
  } else {
    throw new Error(`Unsupported file format (.${ext}). Please upload an Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) file.`);
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('File appears to be empty or contains no readable rows.');
  }

  const validItems = [];
  const invalidRows = [];

  rawRows.forEach((row, idx) => {
    const item = normalizeRow(row);
    if (!item) {
      invalidRows.push({ rowIndex: idx + 2, reason: 'Missing stock symbol', raw: row });
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

  return {
    fileName,
    fileType,
    fileSize: (file.size / 1024).toFixed(1) + ' KB',
    totalRows: rawRows.length,
    validItems,
    invalidRows,
    totalInvested,
    totalShares
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
