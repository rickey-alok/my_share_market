// Comprehensive database of market stocks (Indian NSE/BSE + Top Global)
// Includes real-world sectors, standard market prices, and 52-week reference ranges

export const POPULAR_STOCKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    sector: 'Energy & Petrochemicals',
    cmp: 1202.00,
    prevClose: 1211.20,
    dayChangePercent: -0.76,
    peRatio: 24.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 2460.90,
    prevClose: 2463.00,
    dayChangePercent: -0.09,
    peRatio: 28.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 712.00,
    prevClose: 728.85,
    dayChangePercent: -2.31,
    peRatio: 18.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    sector: 'Information Technology',
    cmp: 1161.20,
    prevClose: 1150.50,
    dayChangePercent: 0.93,
    peRatio: 24.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 418.60,
    prevClose: 412.00,
    dayChangePercent: 1.60,
    peRatio: 9.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 1384.00,
    prevClose: 1375.00,
    dayChangePercent: 0.65,
    peRatio: 17.6,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    sector: 'Consumer Goods (FMCG)',
    cmp: 261.00,
    prevClose: 263.40,
    dayChangePercent: -0.91,
    peRatio: 26.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    sector: 'Telecommunications',
    cmp: 1890.00,
    prevClose: 1875.00,
    dayChangePercent: 0.80,
    peRatio: 46.5,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    sector: 'Infrastructure & Capital Goods',
    cmp: 3661.90,
    prevClose: 3627.10,
    dayChangePercent: 0.96,
    peRatio: 30.1,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries',
    exchange: 'NSE',
    sector: 'Healthcare & Pharmaceuticals',
    cmp: 1739.10,
    prevClose: 1725.00,
    dayChangePercent: 0.82,
    peRatio: 36.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 976.20,
    prevClose: 985.00,
    dayChangePercent: -0.89,
    peRatio: 28.4,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'ZOMATO',
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
    cmp: 973.70,
    prevClose: 965.00,
    dayChangePercent: 0.90,
    peRatio: 10.8,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd.',
    exchange: 'NSE',
    sector: 'Banking & Financials',
    cmp: 444.50,
    prevClose: 440.00,
    dayChangePercent: 1.02,
    peRatio: 19.2,
    marketCap: 'Large Cap'
  },
  {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India Ltd.',
    exchange: 'NSE',
    sector: 'Automobile',
    cmp: 11483.00,
    prevClose: 11390.00,
    dayChangePercent: 0.82,
    peRatio: 25.6,
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

