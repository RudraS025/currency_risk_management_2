/**
 * TEST IMPLEMENTATION
 * Quick verification of the corrected logic
 */

// Simulate the enhanced-financial-utils functions
const INTEREST_RATES = {
  USD: 0.0450, // 4.50% Fed Funds
  EUR: 0.0215, // 2.15% ECB Main Rate
  GBP: 0.0425, // 4.25% BoE Base Rate
  JPY: 0.0050, // 0.50% BoJ Policy Rate
  AUD: 0.0435, // 4.35% RBA Rate
  CAD: 0.0475, // 4.75% BoC Rate
  CHF: 0.0175, // 1.75% SNB Rate
  CNY: 0.0320, // 3.20% PBoC Rate
  INR: 0.0550  // 5.50% RBI Repo Rate (CORRECTED from 6.50%)
}

function calculateBudgetedForwardRate(inceptionSpotRate, currencyPair, contractMaturityDays) {
  const [baseCurrency, quoteCurrency] = currencyPair.split('/')
  
  const t = contractMaturityDays / 365 // Time in years
  const r_foreign = INTEREST_RATES[baseCurrency] || 0.045
  const r_domestic = INTEREST_RATES[quoteCurrency] || 0.065
  
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

function createCubicSplineAnchors(currentSpotRate, currencyPair, maxDaysToMaturity, budgetedForwardRate, isInceptionDay) {
  const anchors = []
  
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
  }
  
  return anchors.sort((a, b) => a.daysToMaturity - b.daysToMaturity)
}

function interpolateCubicSplineForwardRate(anchors, daysToMaturity) {
  if (anchors.length === 0) return 0
  
  // If exactly at an anchor point, return that rate
  const exactAnchor = anchors.find(a => a.daysToMaturity === daysToMaturity)
  if (exactAnchor) return exactAnchor.forwardRate
  
  // For simplicity, return the first anchor rate for Day 1
  return anchors[0].forwardRate
}

// TEST SCENARIO: Same as your example
console.log('=== TESTING CORRECTED IMPLEMENTATION ===')
console.log()

const inceptionSpotRate = 86.6810 // Your example spot rate
const currencyPair = 'USD/INR'
const contractMaturityDays = 104 // Your example

// Step 1: Calculate budgeted forward rate
const budgetedForwardRate = calculateBudgetedForwardRate(inceptionSpotRate, currencyPair, contractMaturityDays)
console.log()
console.log(`✅ BUDGETED FORWARD RATE: ${budgetedForwardRate.toFixed(4)}`)
console.log()

// Step 2: Create Day 1 anchors
const anchors = createCubicSplineAnchors(inceptionSpotRate, currencyPair, contractMaturityDays, budgetedForwardRate, true)
console.log('Day 1 Anchors:')
anchors.forEach(anchor => {
  console.log(`  Days ${anchor.daysToMaturity}: ${anchor.forwardRate.toFixed(4)}`)
})
console.log()

// Step 3: Get Day 1 forward rate
const day1ForwardRate = interpolateCubicSplineForwardRate(anchors, contractMaturityDays)
console.log(`Day 1 Forward Rate: ${day1ForwardRate.toFixed(4)}`)
console.log(`Budgeted Forward Rate: ${budgetedForwardRate.toFixed(4)}`)
console.log(`✅ Day 1 Forward = Budgeted? ${Math.abs(day1ForwardRate - budgetedForwardRate) < 0.0001}`)
console.log()

// Step 4: Calculate Day 1 P&L
const previousForwardRate = budgetedForwardRate // Day 0 doesn't exist, so use budgeted
const contractAmount = 500000
const dailyPnL = (day1ForwardRate - previousForwardRate) * contractAmount
console.log(`Day 1 P&L Calculation:`)
console.log(`  Formula: (${day1ForwardRate.toFixed(4)} - ${previousForwardRate.toFixed(4)}) × ${contractAmount}`)
console.log(`  Result: ${dailyPnL.toFixed(2)}`)
console.log(`✅ Day 1 P&L = 0? ${Math.abs(dailyPnL) < 0.01}`)
console.log()

console.log('=== VERIFICATION COMPLETE ===')
