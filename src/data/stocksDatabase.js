// Comprehensive database of market stocks (Indian NSE/BSE + Top Global)
// Includes real-world sectors, standard market prices, and 52-week reference ranges

export const POPULAR_STOCKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    cmp: 2984.50,
    prevClose: 2955.20,
    dayChangePercent: 0.99,
    peRatio: 28.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 4120.75,
    prevClose: 4165.00,
    dayChangePercent: -1.06,
    peRatio: 31.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1682.30,
    prevClose: 1664.10,
    dayChangePercent: 1.09,
    peRatio: 19.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 1895.40,
    prevClose: 1878.00,
    dayChangePercent: 0.93,
    peRatio: 27.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 948.60,
    prevClose: 932.10,
    dayChangePercent: 1.77,
    peRatio: 10.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1245.80,
    prevClose: 1238.00,
    dayChangePercent: 0.63,
    peRatio: 18.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    cmp: 504.25,
    prevClose: 508.90,
    dayChangePercent: -0.91,
    peRatio: 29.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    sector: 'Telecommunications',
    cmp: 1712.00,
    prevClose: 1695.50,
    dayChangePercent: 0.97,
    peRatio: 52.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    sector: 'Infrastructure & Capital Goods',
    cmp: 3620.10,
    prevClose: 3590.00,
    dayChangePercent: 0.84,
    peRatio: 33.6,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries',
    exchange: 'NSE',
    sector: 'Healthcare & Pharmaceuticals',
    cmp: 1890.20,
    prevClose: 1872.50,
    dayChangePercent: 0.95,
    peRatio: 38.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 7150.00,
    prevClose: 7210.00,
    dayChangePercent: -0.83,
    peRatio: 30.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ETERNAL',
    name: 'Zomato Ltd. (Eternal)',
    exchange: 'NSE',
    sector: 'New Age / Consumer Tech',
    cmp: 334.00,
    prevClose: 328.50,
    dayChangePercent: 1.67,
    peRatio: 95.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 792.40,
    prevClose: 785.10,
    dayChangePercent: 0.93,
    peRatio: 11.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1785.60,
    prevClose: 1772.00,
    dayChangePercent: 0.77,
    peRatio: 19.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 11840.00,
    prevClose: 11720.00,
    dayChangePercent: 1.02,
    peRatio: 26.4,
    marketCap: 'Large Cap'
  }
];

export const SECTORS = [
  'Information Technology',
  'Banking & Financials',
  'Energy & Petrochemicals',
  'Automobile',
  'Consumer Goods (FMCG)',
  'Healthcare & Pharmaceuticals',
  'Infrastructure & Capital Goods',
  'Telecommunications',
  'New Age / Consumer Tech',
  'Metal & Mining',
  'Real Estate',
  'Others'
];

export const EXCHANGES = ['NSE', 'BSE'];

