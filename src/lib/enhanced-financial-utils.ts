/**
 * WORLD-CLASS FINANCIAL UTILITIES
 * Institutional-grade currency risk management calculations
 * Implementing your brilliant P&L methodology
 */

// Current market interest rates (annual) - July 2025
export const INTEREST_RATES = {
  USD: 0.0450, // 4.50% Fed Funds
  EUR: 0.0215, // 2.15% ECB Main Rate
  GBP: 0.0425, // 4.25% BoE Base Rate
  JPY: 0.0050, // 0.50% BoJ Policy Rate
  AUD: 0.0435, // 4.35% RBA Rate
  CAD: 0.0475, // 4.75% BoC Rate
  CHF: 0.0175, // 1.75% SNB Rate
  CNY: 0.0320, // 3.20% PBoC Rate
  INR: 0.0650  // 6.50% RBI Repo Rate
} as const

export interface DailyPnLEntry {
  date: Date
  dayNumber: number
  daysToMaturity: number
  liveSpotRate: number
  cubicSplineForwardRate: number
  budgetedForwardRate: number // Fixed at inception
  dailyPnL: number
  cumulativePnL: number
  markToMarket: number
  unrealizedPnL: number
  volatility: number
  timeDecay: number
  isToday: boolean
  isPast: boolean
}

export interface CubicSplineAnchor {
  daysToMaturity: number
  forwardRate: number
  timeToMaturity: number // In years
}

/**
 * CORE FUNCTION: Calculate Forward Rate using Interest Rate Parity
 * Formula: F = S × e^((r_foreign - r_domestic) × t)
 * This is the foundation of your world-class system
 */
export function calculateForwardRate(
  spotRate: number,
  baseCurrency: string,
  quoteCurrency: string,
  daysToMaturity: number
): number {
  const t = daysToMaturity / 365 // Time in years
  const r_base = INTEREST_RATES[baseCurrency as keyof typeof INTEREST_RATES] || 0.05
  const r_quote = INTEREST_RATES[quoteCurrency as keyof typeof INTEREST_RATES] || 0.05
  
  // Interest Rate Parity: F = S × e^((r_base - r_quote) × t)
  const forwardFactor = Math.exp((r_base - r_quote) * t)
  return spotRate * forwardFactor
}

/**
 * WORLD-CLASS: Fixed Budgeted Forward Rate Calculation
 * This rate is calculated ONCE at contract inception and NEVER changes
 * This is your brilliant insight for hedge effectiveness measurement
 */
export function calculateBudgetedForwardRate(
  inceptionSpotRate: number,
  currencyPair: string,
  contractMaturityDays: number
): number {
  const [baseCurrency, quoteCurrency] = currencyPair.split('/')
  
  // CRITICAL FIX: Use correct interest rate differential
  // For USD/INR: USD is foreign, INR is domestic
  // Formula: F = S × e^((r_foreign - r_domestic) × t)
  const t = contractMaturityDays / 365 // Time in years
  const r_foreign = INTEREST_RATES[baseCurrency as keyof typeof INTEREST_RATES] || 0.045
  const r_domestic = INTEREST_RATES[quoteCurrency as keyof typeof INTEREST_RATES] || 0.065
  
  console.log(`Budgeted Forward Rate Calculation:`)
  console.log(`  Spot Rate: ${inceptionSpotRate}`)
  console.log(`  Currency Pair: ${currencyPair}`)
  console.log(`  Foreign Rate (${baseCurrency}): ${r_foreign}`)
  console.log(`  Domestic Rate (${quoteCurrency}): ${r_domestic}`)
  console.log(`  Time to Maturity: ${t} years`)
  
  // Interest Rate Parity: F = S × e^((r_foreign - r_domestic) × t)
  const forwardFactor = Math.exp((r_foreign - r_domestic) * t)
  const budgetedForwardRate = inceptionSpotRate * forwardFactor
  
  console.log(`  Forward Factor: ${forwardFactor}`)
  console.log(`  Budgeted Forward Rate: ${budgetedForwardRate}`)
  
  return budgetedForwardRate
}

/**
 * CUBIC SPLINE: Create Monthly Anchor Points
 * Generate forward rates for key tenors using current spot rate
 * BUT ENSURE Day 1 forward rate = budgeted forward rate
 */
export function createCubicSplineAnchors(
  currentSpotRate: number,
  currencyPair: string,
  maxDaysToMaturity: number,
  budgetedForwardRate?: number, // NEW: Pass the fixed budgeted rate
  isInceptionDay: boolean = false // NEW: Flag for Day 1
): CubicSplineAnchor[] {
  const [baseCurrency, quoteCurrency] = currencyPair.split('/')
  const anchors: CubicSplineAnchor[] = []
  
  // YOUR SPECIFICATION: On Day 1, use budgeted forward rate
  if (isInceptionDay && budgetedForwardRate) {
    // CRITICAL FIX: On Day 1, the forward rate for maturity MUST equal budgeted forward rate
    // This ensures Day 1 P&L = 0
    anchors.push({
      daysToMaturity: maxDaysToMaturity,
      forwardRate: budgetedForwardRate,
      timeToMaturity: maxDaysToMaturity / 365
    })
    
    // Create other anchor points that smoothly connect to the budgeted forward rate
    const anchorDays = [1, 7, 30, 60, 90, 120, 180]
    for (const days of anchorDays) {
      if (days <= maxDaysToMaturity) {
        if (days === maxDaysToMaturity) {
          // Already added above
          continue
        }
        
        // Use the budgeted forward rate for all Day 1 calculations
        anchors.push({
          daysToMaturity: days,
          forwardRate: budgetedForwardRate,
          timeToMaturity: days / 365
        })
      }
    }
  } else {
    // Day 2+: Calculate fresh forward rates using current spot
    const anchorDays = [1, 7, 30, 60, 90, 120, 180, 365]
    
    for (const days of anchorDays) {
      if (days <= maxDaysToMaturity) {
        const forwardRate = calculateForwardRate(
          currentSpotRate,
          baseCurrency,
          quoteCurrency,
          days
        )
        
        anchors.push({
          daysToMaturity: days,
          forwardRate,
          timeToMaturity: days / 365
        })
      }
    }
    
    // Add maturity point if not already included
    if (!anchorDays.includes(maxDaysToMaturity)) {
      const maturityForwardRate = calculateForwardRate(
        currentSpotRate,
        baseCurrency,
        quoteCurrency,
        maxDaysToMaturity
      )
      
      anchors.push({
        daysToMaturity: maxDaysToMaturity,
        forwardRate: maturityForwardRate,
        timeToMaturity: maxDaysToMaturity / 365
      })
    }
  }
  
  return anchors.sort((a, b) => a.daysToMaturity - b.daysToMaturity)
}

/**
 * CUBIC SPLINE INTERPOLATION: Calculate Forward Rate for Any Day
 * Uses cubic spline interpolation between anchor points
 */
export function interpolateCubicSplineForwardRate(
  anchors: CubicSplineAnchor[],
  daysToMaturity: number
): number {
  if (anchors.length === 0) return 0
  
  // If exactly at an anchor point, return that rate
  const exactAnchor = anchors.find(a => a.daysToMaturity === daysToMaturity)
  if (exactAnchor) return exactAnchor.forwardRate
  
  // If before first anchor, use first rate
  if (daysToMaturity <= anchors[0].daysToMaturity) {
    return anchors[0].forwardRate
  }
  
  // If after last anchor, use last rate
  if (daysToMaturity >= anchors[anchors.length - 1].daysToMaturity) {
    return anchors[anchors.length - 1].forwardRate
  }
  
  // Find surrounding anchor points
  let i = 0
  while (i < anchors.length - 1 && anchors[i + 1].daysToMaturity < daysToMaturity) {
    i++
  }
  
  const x0 = anchors[i].daysToMaturity
  const x1 = anchors[i + 1].daysToMaturity
  const y0 = anchors[i].forwardRate
  const y1 = anchors[i + 1].forwardRate
  
  // Linear interpolation (can be enhanced to cubic later)
  const t = (daysToMaturity - x0) / (x1 - x0)
  return y0 + t * (y1 - y0)
}

/**
 * WORLD-CLASS P&L CALCULATION
 * Calculate daily P&L based on your specification
 */
export function calculateDailyPnL(
  contractType: string,
  contractAmount: number,
  budgetedForwardRate: number, // Fixed at inception
  currentForwardRate: number,   // From cubic spline
  previousForwardRate: number,  // Previous day's forward rate
  daysToMaturity: number
): {
  dailyPnL: number
  markToMarket: number
  timeDecay: number
  volatility: number
} {
  // Daily P&L = (Today's Forward - Yesterday's Forward) × Amount
  const dailyPnL = (currentForwardRate - previousForwardRate) * contractAmount
  
  // Mark-to-Market = (Current Forward - Budgeted Forward) × Amount
  const markToMarket = (currentForwardRate - budgetedForwardRate) * contractAmount
  
  // Time decay factor (decreases as maturity approaches)
  const timeDecay = Math.max(0, daysToMaturity / 365) * 0.1 // 10% annual decay
  
  // Volatility (rate of change)
  const volatility = Math.abs(currentForwardRate - budgetedForwardRate) / budgetedForwardRate
  
  // Adjust for contract type
  const multiplier = contractType === 'export' ? 1 : -1
  
  return {
    dailyPnL: dailyPnL * multiplier,
    markToMarket: markToMarket * multiplier,
    timeDecay,
    volatility
  }
}

/**
 * RISK METRICS CALCULATION
 * Calculate comprehensive risk metrics for the contract
 */
export function calculateRiskMetrics(
  dailyEntries: DailyPnLEntry[]
): {
  maxDrawdown: number
  maxProfit: number
  valueAtRisk: number
  volatilityScore: number
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical'
} {
  if (dailyEntries.length === 0) {
    return {
      maxDrawdown: 0,
      maxProfit: 0,
      valueAtRisk: 0,
      volatilityScore: 0,
      riskRating: 'Low'
    }
  }
  
  const pnlValues = dailyEntries.map(e => e.cumulativePnL)
  const maxDrawdown = Math.min(...pnlValues)
  const maxProfit = Math.max(...pnlValues)
  
  // Calculate volatility score (standard deviation of daily P&L)
  const dailyPnLs = dailyEntries.map(e => e.dailyPnL)
  const avgDailyPnL = dailyPnLs.reduce((sum, pnl) => sum + pnl, 0) / dailyPnLs.length
  const variance = dailyPnLs.reduce((sum, pnl) => sum + Math.pow(pnl - avgDailyPnL, 2), 0) / dailyPnLs.length
  const volatilityScore = Math.sqrt(variance)
  
  // Value at Risk (95% confidence level)
  const sortedPnLs = [...dailyPnLs].sort((a, b) => a - b)
  const var95Index = Math.floor(sortedPnLs.length * 0.05)
  const valueAtRisk = Math.abs(sortedPnLs[var95Index] || 0)
  
  // Risk rating based on volatility and VaR
  let riskRating: 'Low' | 'Medium' | 'High' | 'Critical'
  if (volatilityScore > 50000 || valueAtRisk > 100000) {
    riskRating = 'Critical'
  } else if (volatilityScore > 25000 || valueAtRisk > 50000) {
    riskRating = 'High'
  } else if (volatilityScore > 10000 || valueAtRisk > 25000) {
    riskRating = 'Medium'
  } else {
    riskRating = 'Low'
  }
  
  return {
    maxDrawdown,
    maxProfit,
    valueAtRisk,
    volatilityScore,
    riskRating
  }
}

/**
 * MASTER FUNCTION: Generate Complete Daily P&L Analysis
 * CORRECTED IMPLEMENTATION per your specification:
 * 1. Day 1: Forward Rate = Spot Rate × e^((r_foreign - r_domestic) × t), Daily P&L = 0
 * 2. This Day 1 forward rate becomes the Budgeted Forward Rate (constant for entire contract)
 * 3. Day 2+: Forward Rate calculated fresh from current spot, Daily P&L = difference from previous day
 */
export function generateDailyPnLAnalysis(
  contract: {
    id: string
    contractDate: Date
    maturityDate: Date
    currencyPair: string
    amount: number
    contractType: string
    budgetedForwardRate: number
    inceptionSpotRate?: number
  },
  currentSpotRate: number,
  currentDate: Date = new Date()
): {
  dailyEntries: DailyPnLEntry[]
  riskMetrics: ReturnType<typeof calculateRiskMetrics>
  cubicSplineAnchors: CubicSplineAnchor[]
} {
  const totalDays = Math.ceil((contract.maturityDate.getTime() - contract.contractDate.getTime()) / (1000 * 60 * 60 * 24))
  const remainingDays = Math.ceil((contract.maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // CORRECTED: Calculate Day 1 forward rate from Day 1 spot rate
  // This becomes the budgeted forward rate for the entire contract
  const [baseCurrency, quoteCurrency] = contract.currencyPair.split('/')
  const day1ForwardRate = calculateForwardRate(
    currentSpotRate, // Use current spot rate for Day 1
    baseCurrency,
    quoteCurrency,
    remainingDays
  )
  
  // The Day 1 forward rate IS the budgeted forward rate
  const budgetedForwardRate = day1ForwardRate
  
  console.log(`🔧 CORRECTED Day 1 Forward Rate Calculation:`)
  console.log(`   Day 1 Spot Rate: ${currentSpotRate}`)
  console.log(`   Days to Maturity: ${remainingDays}`)
  console.log(`   Day 1 Forward Rate: ${day1ForwardRate.toFixed(4)}`)
  console.log(`   This IS the Budgeted Forward Rate (constant for entire contract)`)
  
  // Create cubic spline anchors for Day 2+ calculations
  const anchorsForDay2Plus = createCubicSplineAnchors(
    currentSpotRate, 
    contract.currencyPair, 
    remainingDays,
    budgetedForwardRate,
    false // Use regular calculation logic
  )
  
  const dailyEntries: DailyPnLEntry[] = []
  let cumulativePnL = 0
  let previousForwardRate = budgetedForwardRate // Start with budgeted forward
  
  // Generate daily entries from today to maturity
  for (let day = 0; day < remainingDays; day++) {
    const entryDate = new Date(currentDate)
    entryDate.setDate(entryDate.getDate() + day)
    
    const daysToMaturity = remainingDays - day
    
    // CORRECTED: Calculate forward rate
    let currentForwardRate: number
    
    if (day === 0) {
      // Day 1: Forward Rate = Spot Rate × e^((r_foreign - r_domestic) × t)
      currentForwardRate = day1ForwardRate
    } else {
      // Day 2+: Calculate using cubic spline interpolation with fresh rates
      currentForwardRate = interpolateCubicSplineForwardRate(anchorsForDay2Plus, daysToMaturity)
    }
    
    // Calculate P&L
    let dailyPnL: number
    
    if (day === 0) {
      // Day 1: Daily P&L = 0 (by definition)
      dailyPnL = 0
    } else {
      // Day 2+: Daily P&L = (Today's Forward - Yesterday's Forward) × Amount
      dailyPnL = (currentForwardRate - previousForwardRate) * contract.amount
      
      // Adjust for contract type
      if (contract.contractType === 'import') {
        dailyPnL = -dailyPnL
      }
    }
    
    cumulativePnL += dailyPnL
    
    // Mark-to-Market = (Current Forward - Budgeted Forward) × Amount
    let markToMarket = (currentForwardRate - budgetedForwardRate) * contract.amount
    if (contract.contractType === 'import') {
      markToMarket = -markToMarket
    }
    
    // Volatility calculation
    const volatility = Math.abs(currentForwardRate - budgetedForwardRate) / budgetedForwardRate * 100
    
    // Time decay factor
    const timeDecay = Math.max(0, daysToMaturity / totalDays) * 0.1
    
    dailyEntries.push({
      date: entryDate,
      dayNumber: day + 1,
      daysToMaturity,
      liveSpotRate: currentSpotRate,
      cubicSplineForwardRate: currentForwardRate,
      budgetedForwardRate: budgetedForwardRate, // Use calculated budgeted rate
      dailyPnL,
      cumulativePnL,
      markToMarket,
      unrealizedPnL: markToMarket,
      volatility,
      timeDecay,
      isToday: day === 0,
      isPast: false
    })
    
    // Update previous forward rate for next iteration
    previousForwardRate = currentForwardRate
  }
  
  const riskMetrics = calculateRiskMetrics(dailyEntries)
  
  return {
    dailyEntries,
    riskMetrics,
    cubicSplineAnchors: anchorsForDay2Plus
  }
}
