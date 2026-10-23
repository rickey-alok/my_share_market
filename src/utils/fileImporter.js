// Bulk Import Helper: Parses Excel (.xlsx, .xls), CSV (.csv), and JSON (.json) files
import * as XLSX from 'xlsx';
import { POPULAR_STOCKS } from '../data/stocksDatabase.js';

/**
 * Normalizes an arbitrary object/row into standard stock holding fields
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
  const rawQty = getVal(['quantity', 'shares', 'qty', 'units', 'totalqty', 'holdingqty', 'holding', 'volume', 'netqty']);
  const rawPrice = getVal(['buyprice', 'averageprice', 'avgprice', 'buyavg', 'price', 'costprice', 'rate', 'avgcost', 'purchaseprice', 'netprice']);
  const rawName = getVal(['companyname', 'name', 'company', 'stockname', 'description', 'security']);
  const rawExchange = getVal(['exchange', 'market', 'exch']);
  const rawSector = getVal(['sector', 'industry', 'category']);
  const rawDate = getVal(['buydate', 'date', 'purchasedate', 'transdate']);
  const rawNotes = getVal(['notes', 'remark', 'comments']);

  if (!rawSymbol) return null;

  const symbol = String(rawSymbol).trim().toUpperCase();
  const quantity = rawQty !== undefined ? parseFloat(String(rawQty).replace(/[^0-9.-]+/g, '')) : NaN;
  const buyPrice = rawPrice !== undefined ? parseFloat(String(rawPrice).replace(/[^0-9.-]+/g, '')) : NaN;

  // Cross-reference with our comprehensive stock database
  const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);

  return {
    symbol,
    name: (rawName && String(rawName).trim()) || (refStock ? refStock.name : symbol),
    exchange: (rawExchange && String(rawExchange).trim().toUpperCase()) || (refStock ? refStock.exchange : 'NSE'),
    sector: (rawSector && String(rawSector).trim()) || (refStock ? refStock.sector : 'General / Equity'),
    quantity,
    buyPrice,
    cmp: refStock ? refStock.cmp : buyPrice,
    prevClose: refStock ? refStock.prevClose : buyPrice,
    dayHigh: refStock ? refStock.dayHigh : buyPrice,
    dayLow: refStock ? refStock.dayLow : buyPrice,
    week52High: refStock ? refStock.week52High : (buyPrice * 1.25),
    week52Low: refStock ? refStock.week52Low : (buyPrice * 0.75),
    buyDate: rawDate ? String(rawDate).trim() : new Date().toISOString().split('T')[0],
    notes: rawNotes ? String(rawNotes).trim() : 'Bulk imported'
  };
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
    rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
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
 */
export function downloadSampleExcel() {
  const data = [
    ['Symbol', 'Company Name', 'Quantity', 'Buy Price', 'Exchange', 'Sector'],
    ['RELIANCE', 'Reliance Industries Ltd.', 50, 1180.50, 'NSE', 'Energy & Petrochemicals'],
    ['TCS', 'Tata Consultancy Services', 25, 2490.00, 'NSE', 'Information Technology'],
    ['INFY', 'Infosys Ltd.', 100, 1145.20, 'NSE', 'Information Technology'],
    ['HDFCBANK', 'HDFC Bank Ltd.', 75, 690.00, 'NSE', 'Banking & Financials'],
    ['ZOMATO', 'Zomato Ltd.', 200, 260.00, 'NSE', 'New Age / Consumer Tech'],
    ['TATAMOTORS', 'Tata Motors Ltd.', 120, 715.00, 'NSE', 'Automobile'],
    ['ITC', 'ITC Ltd.', 150, 255.00, 'NSE', 'Consumer Goods (FMCG)']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  // Auto-width columns
  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample Holdings');
  XLSX.writeFile(wb, 'apna_share_sample_holdings.xlsx');
}

/**
 * Downloads a pre-formatted sample CSV template (.csv)
 */
export function downloadSampleCsv() {
  const csvContent = [
    'Symbol,Company Name,Quantity,Buy Price,Exchange,Sector',
    'RELIANCE,Reliance Industries Ltd.,50,1180.50,NSE,Energy & Petrochemicals',
    'TCS,Tata Consultancy Services,25,2490.00,NSE,Information Technology',
    'INFY,Infosys Ltd.,100,1145.20,NSE,Information Technology',
    'HDFCBANK,HDFC Bank Ltd.,75,690.00,NSE,Banking & Financials',
    'ZOMATO,Zomato Ltd.,200,260.00,NSE,New Age / Consumer Tech',
    'TATAMOTORS,Tata Motors Ltd.,120,715.00,NSE,Automobile',
    'ITC,ITC Ltd.,150,255.00,NSE,Consumer Goods (FMCG)'
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
      quantity: 50,
      buyPrice: 1180.50,
      exchange: 'NSE',
      sector: 'Energy & Petrochemicals'
    },
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      quantity: 25,
      buyPrice: 2490.00,
      exchange: 'NSE',
      sector: 'Information Technology'
    },
    {
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      quantity: 100,
      buyPrice: 1145.20,
      exchange: 'NSE',
      sector: 'Information Technology'
    },
    {
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      quantity: 75,
      buyPrice: 690.00,
      exchange: 'NSE',
      sector: 'Banking & Financials'
    },
    {
      symbol: 'ZOMATO',
      name: 'Zomato Ltd.',
      quantity: 200,
      buyPrice: 260.00,
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
