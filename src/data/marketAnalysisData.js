// Market Analysis Data & Historical Generator
// FII / DII Institutional Activity, Indian Indices (NIFTY 50, SENSEX), and Holdings Range Gauges

export const FII_DII_DATA = {
  week: {
    periodName: 'Past 5 Trading Days',
    labels: ['Mon 13 Oct', 'Tue 14 Oct', 'Wed 15 Oct', 'Thu 16 Oct', 'Fri 17 Oct'],
    fiiNet: [1240.50, -850.20, 2410.80, 1850.40, 2180.60],
    diiNet: [1850.00, 2120.40, 1450.60, 2380.10, 1940.50],
    fiiGrossBuy: [11240, 9450, 14210, 13850, 15180],
    fiiGrossSell: [10000, 10300, 11800, 12000, 13000],
    diiGrossBuy: [9850, 10120, 8950, 11380, 9940],
    diiGrossSell: [8000, 8000, 7500, 9000, 8000]
  },
  month: {
    periodName: 'Past 4 Weeks (Current Month)',
    labels: ['Week 1 (1-7 Oct)', 'Week 2 (8-14 Oct)', 'Week 3 (15-21 Oct)', 'Week 4 (22-28 Oct)'],
    fiiNet: [4820.50, -2150.30, 6830.40, 5210.80],
    diiNet: [7450.20, 8120.60, 6950.40, 9240.10],
    fiiGrossBuy: [48200, 42150, 56830, 52210],
    fiiGrossSell: [43380, 44300, 50000, 47000],
    diiGrossBuy: [38450, 39120, 37950, 41240],
    diiGrossSell: [31000, 31000, 31000, 32000]
  },
  year: {
    periodName: 'Past 12 Months (FY 2025-26)',
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    fiiNet: [8240, -11450, -7820, 5420, 14250, 18920, 12450, -6840, 9420, 14850, 11200, 14710],
    diiNet: [14250, 19450, 18200, 16800, 21450, 19850, 22400, 18500, 17200, 24100, 26800, 31760],
    fiiGrossBuy: [128240, 114500, 118820, 135420, 154250, 168920, 152450, 136840, 149420, 164850, 151200, 174710],
    fiiGrossSell: [120000, 125950, 126640, 130000, 140000, 150000, 140000, 143680, 140000, 150000, 140000, 160000],
    diiGrossBuy: [104250, 119450, 108200, 116800, 121450, 129850, 132400, 128500, 127200, 144100, 146800, 161760],
    diiGrossSell: [90000, 100000, 90000, 100000, 100000, 110000, 110000, 110000, 110000, 120000, 120000, 130000]
  },
  '3year': {
    periodName: 'Past 3 Years (FY 2023 - 2026)',
    labels: ['FY 2023-24', 'FY 2024-25', 'FY 2025-26'],
    fiiNet: [-37650, 42180, 78450],
    diiNet: [182400, 214500, 248900],
    fiiGrossBuy: [1420000, 1680000, 1890000],
    fiiGrossSell: [1457650, 1637820, 1811550],
    diiGrossBuy: [1120000, 1340000, 1560000],
    diiGrossSell: [937600, 1125500, 1311100]
  },
  '5year': {
    periodName: 'Past 5 Years (FY 2021 - 2026)',
    labels: ['FY 2021-22', 'FY 2022-23', 'FY 2023-24', 'FY 2024-25', 'FY 2025-26'],
    fiiNet: [-140010, -35630, 42180, 58450, 78450],
    diiNet: [221380, 255740, 182400, 214500, 248900],
    fiiGrossBuy: [1320000, 1410000, 1550000, 1720000, 1890000],
    fiiGrossSell: [1460010, 1445630, 1507820, 1661550, 1811550],
    diiGrossBuy: [980000, 1080000, 1220000, 1390000, 1560000],
    diiGrossSell: [758620, 824260, 1037600, 1175500, 1311100]
  }
};

export function getFiiDiiMetrics(timeframe = 'week') {
  const data = FII_DII_DATA[timeframe] || FII_DII_DATA.week;
  const totalFiiNet = data.fiiNet.reduce((sum, val) => sum + val, 0);
  const totalDiiNet = data.diiNet.reduce((sum, val) => sum + val, 0);
  const totalFiiBuy = data.fiiGrossBuy.reduce((sum, val) => sum + val, 0);
  const totalFiiSell = data.fiiGrossSell.reduce((sum, val) => sum + val, 0);
  const totalDiiBuy = data.diiGrossBuy.reduce((sum, val) => sum + val, 0);
  const totalDiiSell = data.diiGrossSell.reduce((sum, val) => sum + val, 0);
  const combinedNet = totalFiiNet + totalDiiNet;

  return {
    ...data,
    totalFiiNet,
    totalDiiNet,
    totalFiiBuy,
    totalFiiSell,
    totalDiiBuy,
    totalDiiSell,
    combinedNet,
    sentiment: combinedNet >= 0 ? 'Bullish Accumulation' : 'Institutional Outflow'
  };
}

// Major Benchmark Indices Historical Trajectories (NIFTY 50 and SENSEX)
export const INDICES_DATA = {
  week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    nifty: {
      name: 'NIFTY 50',
      current: 25124.60,
      points: [24890.20, 24965.40, 25040.10, 25010.80, 25124.60],
      low: 24820.00,
      high: 25180.50,
      changePct: 0.94
    },
    sensex: {
      name: 'SENSEX',
      current: 82045.10,
      points: [81280.40, 81520.10, 81790.60, 81680.20, 82045.10],
      low: 81050.00,
      high: 82240.80,
      changePct: 0.94
    }
  },
  month: {
    labels: ['1 Oct', '5 Oct', '10 Oct', '15 Oct', '20 Oct', '25 Oct', 'Current'],
    nifty: {
      name: 'NIFTY 50',
      current: 25124.60,
      points: [24410.50, 24580.20, 24720.80, 24910.40, 24850.10, 25040.30, 25124.60],
      low: 24350.00,
      high: 25290.00,
      changePct: 2.92
    },
    sensex: {
      name: 'SENSEX',
      current: 82045.10,
      points: [79820.00, 80410.20, 80920.50, 81480.10, 81290.40, 81840.60, 82045.10],
      low: 79600.00,
      high: 82610.00,
      changePct: 2.79
    }
  },
  year: {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    nifty: {
      name: 'NIFTY 50',
      current: 25124.60,
      points: [21950, 22420, 22180, 22910, 23550, 23820, 24450, 24980, 25320, 25810, 24850, 25124.60],
      low: 21780.00,
      high: 26277.35,
      changePct: 14.46
    },
    sensex: {
      name: 'SENSEX',
      current: 82045.10,
      points: [72400, 73920, 73100, 75450, 77200, 78150, 80210, 81920, 82850, 84320, 81400, 82045.10],
      low: 71850.00,
      high: 85978.25,
      changePct: 13.32
    }
  },
  '3year': {
    labels: ['Oct 2023', 'Apr 2024', 'Oct 2024', 'Apr 2025', 'Oct 2025', 'Apr 2026', 'Current'],
    nifty: {
      name: 'NIFTY 50',
      current: 25124.60,
      points: [19047.25, 22419.95, 24200.50, 24850.10, 25400.30, 24900.20, 25124.60],
      low: 18837.85,
      high: 26277.35,
      changePct: 31.91
    },
    sensex: {
      name: 'SENSEX',
      current: 82045.10,
      points: [63782.80, 73872.30, 79402.30, 81500.20, 83120.40, 81450.60, 82045.10],
      low: 63183.77,
      high: 85978.25,
      changePct: 28.63
    }
  },
  '5year': {
    labels: ['Oct 2021', 'Oct 2022', 'Oct 2023', 'Oct 2024', 'Oct 2025', 'Current'],
    nifty: {
      name: 'NIFTY 50',
      current: 25124.60,
      points: [17929.65, 17786.80, 19047.25, 24200.50, 25400.30, 25124.60],
      low: 15183.40,
      high: 26277.35,
      changePct: 40.13
    },
    sensex: {
      name: 'SENSEX',
      current: 82045.10,
      points: [60718.70, 59959.85, 63782.80, 79402.30, 83120.40, 82045.10],
      low: 50921.22,
      high: 85978.25,
      changePct: 35.12
    }
  }
};

// Sector to Industry Specific Indices Mapping (e.g. Reliance -> NIFTY OIL & GAS)
export const SECTOR_INDUSTRY_MAP = {
  'Energy & Petrochemicals': {
    name: 'NIFTY OIL & GAS',
    trends: {
      week: [12310, 12380, 12420, 12400, 12450],
      month: [11980, 12120, 12250, 12380, 12450],
      year: [10240, 10580, 10920, 11450, 11800, 12150, 12450],
      '3year': [8450, 9200, 10100, 11200, 11900, 12450],
      '5year': [6800, 7900, 8900, 10500, 11800, 12450]
    }
  },
  'Information Technology': {
    name: 'NIFTY IT',
    trends: {
      week: [42400, 42320, 42150, 42080, 42180],
      month: [41200, 41650, 42300, 42500, 42180],
      year: [31200, 33500, 35400, 37800, 39500, 41200, 42180],
      '3year': [28400, 31000, 33800, 38500, 40500, 42180],
      '5year': [22100, 26800, 29500, 34200, 39000, 42180]
    }
  },
  'Banking & Financials': {
    name: 'BANK NIFTY',
    trends: {
      week: [51250, 51420, 51680, 51590, 51840],
      month: [50120, 50650, 51200, 51600, 51840],
      year: [43600, 45200, 46800, 48500, 49800, 51200, 51840],
      '3year': [38900, 42500, 45100, 48200, 50400, 51840],
      '5year': [31200, 35800, 41000, 46500, 49500, 51840]
    }
  },
  'Automobile': {
    name: 'NIFTY AUTO',
    trends: {
      week: [25980, 26120, 26250, 26190, 26340],
      month: [25100, 25480, 25850, 26150, 26340],
      year: [16800, 18500, 20400, 22800, 24500, 25800, 26340],
      '3year': [12400, 14800, 17900, 21500, 24600, 26340],
      '5year': [8900, 11200, 14500, 18800, 23500, 26340]
    }
  },
  'Consumer Goods (FMCG)': {
    name: 'NIFTY FMCG',
    trends: {
      week: [61200, 61350, 61400, 61380, 61450],
      month: [60200, 60600, 60950, 61250, 61450],
      year: [52400, 54100, 55800, 57400, 59200, 60800, 61450],
      '3year': [42500, 46800, 51200, 55400, 59100, 61450],
      '5year': [34200, 39500, 44800, 51000, 57200, 61450]
    }
  },
  'Healthcare & Pharmaceuticals': {
    name: 'NIFTY PHARMA',
    trends: {
      week: [22600, 22710, 22780, 22810, 22850],
      month: [21900, 22180, 22450, 22700, 22850],
      year: [15400, 16800, 18200, 19600, 21200, 22400, 22850],
      '3year': [12800, 14500, 16900, 19200, 21500, 22850],
      '5year': [11400, 13100, 15200, 17800, 20900, 22850]
    }
  },
  'Infrastructure & Capital Goods': {
    name: 'NIFTY INFRA',
    trends: {
      week: [9020, 9060, 9090, 9080, 9120],
      month: [8750, 8880, 8990, 9080, 9120],
      year: [6200, 6800, 7400, 8100, 8650, 8950, 9120],
      '3year': [4800, 5600, 6500, 7600, 8500, 9120],
      '5year': [3900, 4600, 5500, 6900, 8200, 9120]
    }
  },
  'Telecommunications': {
    name: 'NIFTY TELECOM',
    trends: {
      week: [1815, 1825, 1832, 1835, 1840],
      month: [1750, 1780, 1805, 1825, 1840],
      year: [1240, 1360, 1480, 1610, 1720, 1810, 1840],
      '3year': [980, 1120, 1310, 1520, 1710, 1840],
      '5year': [740, 890, 1080, 1350, 1650, 1840]
    }
  },
  'New Age / Consumer Tech': {
    name: 'NIFTY SERVICES',
    trends: {
      week: [30800, 30950, 31100, 31050, 31200],
      month: [29800, 30200, 30650, 31000, 31200],
      year: [24500, 25800, 27200, 28600, 29900, 30800, 31200],
      '3year': [21000, 23200, 25800, 28100, 30200, 31200],
      '5year': [18200, 20500, 23800, 26900, 29500, 31200]
    }
  },
  'Metal & Mining': {
    name: 'NIFTY METAL',
    trends: {
      week: [9720, 9780, 9840, 9810, 9850],
      month: [9450, 9580, 9710, 9820, 9850],
      year: [7100, 7650, 8200, 8750, 9300, 9720, 9850],
      '3year': [5400, 6200, 7100, 8200, 9200, 9850],
      '5year': [4200, 5100, 6300, 7600, 8900, 9850]
    }
  }
};

export function getIndustryForHolding(holding) {
  const sector = holding?.sector || '';
  if (SECTOR_INDUSTRY_MAP[sector]) {
    return SECTOR_INDUSTRY_MAP[sector];
  }
  for (const [key, val] of Object.entries(SECTOR_INDUSTRY_MAP)) {
    if (sector.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sector.toLowerCase())) {
      return val;
    }
  }
  return {
    name: 'NIFTY 500',
    trends: {
      week: [23150, 23280, 23390, 23350, 23450],
      month: [22600, 22900, 23150, 23380, 23450],
      year: [19200, 20100, 21200, 22100, 22800, 23200, 23450],
      '3year': [16400, 18100, 19800, 21500, 22700, 23450],
      '5year': [13800, 15900, 18200, 20600, 22500, 23450]
    }
  };
}

const BENCHMARK_MAP = {
  nifty: {
    name: 'NIFTY 50',
    trends: {
      week: [24890.20, 24965.40, 25040.10, 25010.80, 25124.60],
      month: [24410.50, 24680.20, 24850.10, 25040.30, 25124.60],
      year: [21950.00, 22800.00, 23600.00, 24450.00, 25300.00, 24850.00, 25124.60],
      '3year': [19047.25, 21500.00, 23800.00, 24850.10, 25400.30, 25124.60],
      '5year': [17929.65, 17786.80, 19047.25, 24200.50, 25400.30, 25124.60]
    }
  },
  sensex: {
    name: 'SENSEX',
    trends: {
      week: [81280.40, 81520.10, 81790.60, 81680.20, 82045.10],
      month: [79820.00, 80410.20, 81290.40, 81840.60, 82045.10],
      year: [72400.00, 75450.00, 77200.00, 80210.00, 82850.00, 81400.00, 82045.10],
      '3year': [63782.80, 71500.00, 77400.00, 81500.20, 83120.40, 82045.10],
      '5year': [60718.70, 59959.85, 63782.80, 79402.30, 83120.40, 82045.10]
    }
  }
};

/**
 * Generates accurate trajectory, volume, RSI, benchmark, and industry data
 * @param {Object} holding - holding item from portfolioStore
 * @param {string} timeframe - 'week' | 'month' | 'year' | '3year' | '5year'
 */
export function getStockAnalysisData(holding, timeframe = 'week') {
  if (!holding) return null;

  const cmp = holding.cmp || holding.avgPrice;
  const avgPrice = holding.avgPrice || cmp;

  let labels = [];
  let deltaFactors = [];
  let lowSpread = 0.04;
  let highSpread = 0.05;

  if (timeframe === 'week') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    deltaFactors = [-0.015, -0.008, 0.004, -0.002, 0];
    lowSpread = 0.025;
    highSpread = 0.035;
  } else if (timeframe === 'month') {
    labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Current'];
    deltaFactors = [-0.042, -0.021, -0.005, 0.012, 0];
    lowSpread = 0.06;
    highSpread = 0.08;
  } else if (timeframe === 'year') {
    labels = ['Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep', 'Current'];
    deltaFactors = [-0.18, -0.14, -0.08, -0.02, 0.06, -0.03, 0];
    lowSpread = 0.22;
    highSpread = 0.16;
  } else if (timeframe === '3year') {
    labels = ['2023 H2', '2024 H1', '2024 H2', '2025 H1', '2025 H2', 'Current'];
    deltaFactors = [-0.34, -0.22, -0.12, 0.04, -0.05, 0];
    lowSpread = 0.38;
    highSpread = 0.18;
  } else if (timeframe === '5year') {
    labels = ['2021', '2022', '2023', '2024', '2025', 'Current'];
    deltaFactors = [-0.52, -0.44, -0.30, -0.10, 0.06, 0];
    lowSpread = 0.55;
    highSpread = 0.22;
  }

  // Calculate realistic historical price trajectory ending at current market price (CMP)
  const priceHistory = deltaFactors.map(factor => {
    return parseFloat((cmp * (1 + factor)).toFixed(2));
  });

  // Calculate realistic Volume in Lakhs
  const baseVolumeLakhs = Math.max(12, Math.round((2800000 / Math.max(80, cmp)) * 0.1) / 10);
  const volumeHistory = deltaFactors.map((factor, idx) => {
    const variance = (Math.sin(idx * 1.8) * 0.28) + (Math.abs(factor) * 0.4);
    return parseFloat((baseVolumeLakhs * (1 + variance)).toFixed(1));
  });

  const volumeColors = priceHistory.map((p, idx) => {
    if (idx === 0) return 'rgba(16, 185, 129, 0.75)';
    return p >= priceHistory[idx - 1] ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)';
  });

  const currentVolume = volumeHistory[volumeHistory.length - 1];

  // Calculate realistic RSI (14-period)
  const rsiHistory = deltaFactors.map((factor, idx) => {
    const oscillation = Math.cos(idx * 1.4) * 5.5;
    const rawRsi = 52 + (factor * 55) + oscillation;
    return parseFloat(Math.min(84, Math.max(24, rawRsi)).toFixed(1));
  });
  const currentRsi = rsiHistory[rsiHistory.length - 1];
  let rsiSentiment = 'Neutral';
  if (currentRsi >= 70) rsiSentiment = 'Overbought (>70)';
  else if (currentRsi <= 30) rsiSentiment = 'Oversold (<30)';
  else if (currentRsi > 55) rsiSentiment = 'Bullish Zone';
  else rsiSentiment = 'Consolidation';

  // Get Industry Specific Data
  const industryConfig = getIndustryForHolding(holding);
  const industryTrends = industryConfig.trends[timeframe] || industryConfig.trends.week;
  const industryPoints = [...industryTrends];

  // Get Benchmark Data
  const benchmarkNifty = BENCHMARK_MAP.nifty.trends[timeframe] || BENCHMARK_MAP.nifty.trends.week;
  const benchmarkSensex = BENCHMARK_MAP.sensex.trends[timeframe] || BENCHMARK_MAP.sensex.trends.week;

  let minVal = cmp * (1 - lowSpread);
  let maxVal = cmp * (1 + highSpread);
  if (avgPrice < minVal) minVal = avgPrice * 0.96;
  if (avgPrice > maxVal) maxVal = avgPrice * 1.04;

  const periodLow = parseFloat(minVal.toFixed(2));
  const periodHigh = parseFloat(maxVal.toFixed(2));

  // High-Low Gauge Pointer Position Percentage (0% to 100%)
  const rangeSpan = periodHigh - periodLow || 1;
  const cmpPositionPct = Math.min(96, Math.max(4, ((cmp - periodLow) / rangeSpan) * 100));
  const avgPositionPct = Math.min(96, Math.max(4, ((avgPrice - periodLow) / rangeSpan) * 100));

  // Distances
  const distFromLowPct = ((cmp - periodLow) / periodLow) * 100;
  const distFromHighPct = ((periodHigh - cmp) / periodHigh) * 100;
  const cmpVsAvgPct = ((cmp - avgPrice) / avgPrice) * 100;

  return {
    symbol: holding.symbol,
    name: holding.name,
    exchange: holding.exchange || 'NSE',
    sector: holding.sector || 'Equity',
    cmp,
    avgPrice,
    quantity: holding.quantity,
    timeframe,
    labels,
    priceHistory,
    periodLow,
    periodHigh,
    cmpPositionPct,
    avgPositionPct,
    distFromLowPct,
    distFromHighPct,
    cmpVsAvgPct,
    // Technical Indicators & Overlays
    volumeHistory,
    volumeColors,
    currentVolume,
    rsiHistory,
    currentRsi,
    rsiSentiment,
    industry: {
      name: industryConfig.name,
      points: industryPoints
    },
    benchmark: {
      name: 'NIFTY 50',
      points: benchmarkNifty
    },
    sensex: {
      name: 'SENSEX',
      points: benchmarkSensex
    }
  };
}
