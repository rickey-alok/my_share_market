// Comprehensive database of market stocks (Indian NSE/BSE + Top Global)
// Includes real-world sectors, standard market prices, and 52-week reference ranges

export const POPULAR_STOCKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    cmp: 1190.00,
    prevClose: 1184.50,
    dayChangePercent: 0.46,
    peRatio: 24.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 2530.00,
    prevClose: 2506.90,
    dayChangePercent: 0.92,
    peRatio: 28.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 692.80,
    prevClose: 694.05,
    dayChangePercent: -0.18,
    peRatio: 18.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 1153.80,
    prevClose: 1153.35,
    dayChangePercent: 0.04,
    peRatio: 24.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Commercial Vehicles Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 396.00,
    prevClose: 414.25,
    dayChangePercent: -4.41,
    peRatio: 9.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TMCV',
    name: 'TML Commercial Vehicles Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 396.00,
    prevClose: 414.25,
    dayChangePercent: -4.41,
    peRatio: 9.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1394.20,
    prevClose: 1398.50,
    dayChangePercent: -0.31,
    peRatio: 17.6,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    cmp: 257.90,
    prevClose: 258.90,
    dayChangePercent: -0.39,
    peRatio: 26.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    sector: 'Telecommunications',
    cmp: 1892.10,
    prevClose: 1895.00,
    dayChangePercent: -0.15,
    peRatio: 46.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    sector: 'Infrastructure & Capital Goods',
    cmp: 3647.00,
    prevClose: 3638.30,
    dayChangePercent: 0.24,
    peRatio: 30.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries',
    exchange: 'NSE',
    sector: 'Healthcare & Pharmaceuticals',
    cmp: 1748.00,
    prevClose: 1758.00,
    dayChangePercent: -0.57,
    peRatio: 36.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 928.95,
    prevClose: 942.10,
    dayChangePercent: -1.40,
    peRatio: 28.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd. (Eternal)',
    exchange: 'NSE',
    sector: 'New Age / Consumer Tech',
    cmp: 317.40,
    prevClose: 304.45,
    dayChangePercent: 4.25,
    peRatio: 95.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ETERNAL',
    name: 'Zomato Ltd. (Eternal)',
    exchange: 'NSE',
    sector: 'New Age / Consumer Tech',
    cmp: 317.40,
    prevClose: 304.45,
    dayChangePercent: 4.25,
    peRatio: 95.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 958.60,
    prevClose: 970.00,
    dayChangePercent: -1.18,
    peRatio: 10.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 430.50,
    prevClose: 437.00,
    dayChangePercent: -1.49,
    peRatio: 19.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 11230.00,
    prevClose: 11170.00,
    dayChangePercent: 0.54,
    peRatio: 25.6,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 189.84,
    prevClose: 190.41,
    dayChangePercent: -0.30,
    peRatio: 21.0,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    cmp: 4299.70,
    prevClose: 4350.00,
    dayChangePercent: -1.16,
    peRatio: 82.0,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'HCLTECH',
    name: 'HCL Technologies Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 1422.20,
    prevClose: 1421.70,
    dayChangePercent: 0.04,
    peRatio: 24.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'AXISBANK',
    name: 'Axis Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1217.50,
    prevClose: 1212.00,
    dayChangePercent: 0.45,
    peRatio: 14.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ASIANPAINT',
    name: 'Asian Paints Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    cmp: 2307.00,
    prevClose: 2284.80,
    dayChangePercent: 0.97,
    peRatio: 52.0,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Ltd.',
    exchange: 'NSE',
    sector: 'Metal & Mining',
    cmp: 167.67,
    prevClose: 172.33,
    dayChangePercent: -2.70,
    peRatio: 38.0,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'NTPC',
    name: 'NTPC Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    cmp: 298.00,
    prevClose: 302.60,
    dayChangePercent: -1.52,
    peRatio: 16.0,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ONGC',
    name: 'Oil & Natural Gas Corp. Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    cmp: 227.50,
    prevClose: 225.00,
    dayChangePercent: 1.11,
    peRatio: 7.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'COALINDIA',
    name: 'Coal India Ltd.',
    exchange: 'NSE',
    sector: 'Metal & Mining',
    cmp: 397.45,
    prevClose: 402.55,
    dayChangePercent: -1.27,
    peRatio: 7.8,
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

