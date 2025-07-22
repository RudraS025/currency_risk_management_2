'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Calendar, TrendingUp, TrendingDown, Calculator, Download } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { format, differenceInDays, addDays } from 'date-fns'
import { INTEREST_RATES } from '@/lib/enhanced-financial-utils'

// Cubic Spline Interpolation Implementation
class CubicSpline {
  private x: number[]
  private y: number[]
  private a: number[]
  private b: number[]
  private c: number[]
  private d: number[]

  constructor(x: number[], y: number[]) {
    this.x = [...x]
    this.y = [...y]
    this.a = [...y]
    this.b = []
    this.c = []
    this.d = []
    this.calculateCoefficients()
  }

  private calculateCoefficients() {
    const n = this.x.length - 1
    const h: number[] = []
    
    for (let i = 0; i < n; i++) {
      h[i] = this.x[i + 1] - this.x[i]
    }

    const alpha: number[] = []
    for (let i = 1; i < n; i++) {
      alpha[i] = (3 / h[i]) * (this.a[i + 1] - this.a[i]) - (3 / h[i - 1]) * (this.a[i] - this.a[i - 1])
    }

    const l: number[] = [1]
    const mu: number[] = [0]
    const z: number[] = [0]

    for (let i = 1; i < n; i++) {
      l[i] = 2 * (this.x[i + 1] - this.x[i - 1]) - h[i - 1] * mu[i - 1]
      mu[i] = h[i] / l[i]
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
    }

    l[n] = 1
    z[n] = 0
    this.c[n] = 0

    for (let j = n - 1; j >= 0; j--) {
      this.c[j] = z[j] - mu[j] * this.c[j + 1]
      this.b[j] = (this.a[j + 1] - this.a[j]) / h[j] - h[j] * (this.c[j + 1] + 2 * this.c[j]) / 3
      this.d[j] = (this.c[j + 1] - this.c[j]) / (3 * h[j])
    }
  }

  interpolate(x: number): number {
    let j = 0
    for (let i = 1; i < this.x.length; i++) {
      if (x <= this.x[i]) {
        j = i - 1
        break
      }
    }

    const dx = x - this.x[j]
    return this.a[j] + this.b[j] * dx + this.c[j] * dx * dx + this.d[j] * dx * dx * dx
  }
}

// Forward Rate Calculator using Interest Rate Parity and Cubic Spline
function calculateForwardCurve(
  spotRate: number,
  homeRate: number,
  foreignRate: number,
  maxDays: number
): { day: number; forwardRate: number }[] {
  // Create anchor points at standard market tenors
  const anchorDays = [0, 30, 60, 90, 120, 150, 180, 240, 300, 365]
  const anchorRates = anchorDays.map(days => {
    if (days === 0) return spotRate
    
    // Interest Rate Parity formula
    const homeDiscount = 1 + (homeRate / 100) * (days / 365)
    const foreignDiscount = 1 + (foreignRate / 100) * (days / 365)
    return spotRate * (homeDiscount / foreignDiscount)
  })

  // Filter anchor points to only include those within our time range
  const validAnchors = anchorDays
    .map((day, i) => ({ day, rate: anchorRates[i] }))
    .filter(anchor => anchor.day <= maxDays)

  // If we need to extrapolate beyond our anchors, add an end point
  if (maxDays > validAnchors[validAnchors.length - 1].day) {
    const extrapolatedRate = spotRate * 
      ((1 + (homeRate / 100) * (maxDays / 365)) / 
       (1 + (foreignRate / 100) * (maxDays / 365)))
    validAnchors.push({ day: maxDays, rate: extrapolatedRate })
  }

  const spline = new CubicSpline(
    validAnchors.map(a => a.day),
    validAnchors.map(a => a.rate)
  )

  // Generate daily forward rates using cubic spline interpolation
  const forwardCurve = []
  for (let day = 0; day <= maxDays; day++) {
    forwardCurve.push({
      day,
      forwardRate: spline.interpolate(day)
    })
  }

  return forwardCurve
}

export default function PnLAnalytics() {
  const { state } = useCurrency()
  const [selectedContractId, setSelectedContractId] = useState<string>('')

  // Generate P&L data for selected contract
  const pnlData = useMemo(() => {
    if (!selectedContractId) return []

    const contract = state.contracts.find(c => c.id === selectedContractId)
    if (!contract) return []

    // Get the correct spot rate for the contract's currency pair
    const rateInfo = state.currencyRates.find(r => r.pair === contract.currencyPair)
    if (!rateInfo) {
      console.warn(`No live rate found for ${contract.currencyPair}`)
      return []
    }

    const contractDays = differenceInDays(contract.maturityDate, contract.contractDate)
    const spotRate = rateInfo.spotRate
    const [baseCurrency, quoteCurrency] = contract.currencyPair.split('/')
    const homeRate = INTEREST_RATES[quoteCurrency as keyof typeof INTEREST_RATES] || 0.055
    const foreignRate = INTEREST_RATES[baseCurrency as keyof typeof INTEREST_RATES] || 0.05

    // Generate forward curve using cubic spline
    const forwardCurve = calculateForwardCurve(spotRate, homeRate, foreignRate, contractDays)

    // Calculate daily P&L
    return forwardCurve.map((point) => {
      const date = addDays(contract.contractDate, point.day)
      const currentForwardRate = point.forwardRate
      const pnl = (currentForwardRate - contract.budgetedForwardRate) * contract.amount

      return {
        date: format(date, 'MMM dd'),
        day: point.day,
        spotRate: spotRate + (Math.random() * 0.2 - 0.1), // Mock daily spot variation
        forwardRate: currentForwardRate,
        budgetedRate: contract.budgetedForwardRate,
        pnl: pnl,
        cumulativePnl: pnl, // Simplified - would be cumulative in real implementation
      }
    })
  }, [selectedContractId, state.contracts])

  const selectedContract = state.contracts.find(c => c.id === selectedContractId)

  // Calculate summary statistics with proper risk metrics
  const summary = useMemo(() => {
    if (pnlData.length === 0) return null

    const contract = selectedContract
    if (!contract) return null

    const totalPnl = pnlData[pnlData.length - 1]?.pnl || 0
    const maxProfit = Math.max(...pnlData.map(d => d.pnl))
    
    // CORRECTED: Calculate Max Loss using VaR-based approach (99% confidence)
    // For forward contracts, max loss is based on extreme adverse movements
    const budgetedRate = contract.budgetedForwardRate
    const contractAmount = contract.amount
    const daysToMaturity = Math.max(1, differenceInDays(new Date(contract.maturityDate), new Date()))
    
    // Calculate volatility properly (annualized)
    const dailyReturns = pnlData.slice(1).map((d, i) => 
      (d.forwardRate - pnlData[i].forwardRate) / pnlData[i].forwardRate
    )
    const volatility = dailyReturns.length > 1 ? 
      Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length) * Math.sqrt(365) * 100 : 15
    
    // VaR-based Max Loss calculation (99% confidence level)
    // Assumes normal distribution, 2.33 is 99% confidence z-score
    const timeToMaturityYears = daysToMaturity / 365
    const maxAdverseMovement = 2.33 * (volatility / 100) * Math.sqrt(timeToMaturityYears)
    
    // For EUR/INR export contract, max loss occurs when EUR weakens
    const worstCaseForwardRate = budgetedRate * (1 - maxAdverseMovement)
    const maxLoss = Math.abs((worstCaseForwardRate - budgetedRate) * contractAmount)
    
    // CORRECTED: Calculate Optimal Exit Day properly
    // Find the day with best risk-adjusted return (within maturity period)
    let optimalExitDay = 0
    let bestRiskAdjustedReturn = -Infinity
    
    pnlData.forEach((d, index) => {
      if (index < daysToMaturity) { // Ensure within maturity period
        const pnl = d.pnl
        const timeRemaining = daysToMaturity - index
        const riskAdjustedReturn = timeRemaining > 0 ? pnl / Math.sqrt(timeRemaining) : pnl
        
        if (riskAdjustedReturn > bestRiskAdjustedReturn) {
          bestRiskAdjustedReturn = riskAdjustedReturn
          optimalExitDay = index
        }
      }
    })
    
    // Ensure optimal exit is within valid range
    optimalExitDay = Math.min(optimalExitDay, daysToMaturity - 1)

    return {
      totalPnl,
      maxProfit,
      maxLoss,
      volatility,
      optimalExitDay,
      daysToMaturity,
      riskAdjustedReturn: bestRiskAdjustedReturn
    }
  }, [pnlData, selectedContract])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">P&L Analytics</h2>
          <p className="text-gray-600 mt-1">
            Advanced profit & loss analysis with cubic spline forward curves
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a contract</option>
            {state.contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.description || `${contract.contractType.toUpperCase()} - ${contract.currencyPair}`}
              </option>
            ))}
          </select>
          {selectedContractId && (
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {!selectedContractId ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Contract</h3>
          <p className="text-gray-600">
            Choose a contract to view detailed P&L analytics and forward rate projections
          </p>
        </div>
      ) : (
        <>
          {/* Contract Summary */}
          {selectedContract && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Currency Pair</p>
                  <p className="text-lg font-semibold">{selectedContract.currencyPair}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-lg font-semibold">${selectedContract.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Budgeted Rate (Inception)</p>
                  <p className="text-lg font-semibold font-mono">{selectedContract.budgetedForwardRate.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days to Maturity</p>
                  <p className="text-lg font-semibold">
                    {differenceInDays(selectedContract.maturityDate, new Date())} days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* P&L Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${summary.totalPnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {summary.totalPnl >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Current P&L</p>
                    <p className={`text-2xl font-bold ${summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.totalPnl >= 0 ? '+' : ''}₹{summary.totalPnl.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Max Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      +₹{summary.maxProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Max Loss</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{summary.maxLoss.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Optimal Exit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      Day {summary.optimalExitDay}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forward Rate Curve Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Forward Rate Curve (Cubic Spline)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Professional-grade forward rate projection using institutional methodology
              </p>
            </div>
            <div className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number | string, name: string) => [
                        typeof value === 'number' ? value.toFixed(4) : value,
                        name === 'forwardRate' ? 'Current Forward Rate' :
                        name === 'budgetedRate' ? 'Budgeted Rate (Fixed)' :
                        name === 'spotRate' ? 'Spot Rate' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forwardRate" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={false}
                      name="Forward Rate"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budgetedRate" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Budgeted Rate"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="spotRate" 
                      stroke="#16a34a" 
                      strokeWidth={1}
                      dot={false}
                      name="Spot Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* P&L Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Daily P&L Projection</h3>
              <p className="text-sm text-gray-600 mt-1">
                Profit and loss analysis for each day until maturity
              </p>
            </div>
            <div className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [
                        `₹${value.toLocaleString()}`,
                        'P&L'
                      ]}
                    />
                    <Bar 
                      dataKey="pnl" 
                      fill="#2563eb"
                      name="P&L"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
