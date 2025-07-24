'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Calendar, TrendingUp, TrendingDown, Calculator, Download } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { format, differenceInDays, addDays } from 'date-fns'
import { generateInstitutionalDailyPnLAnalysis } from '@/lib/institutional-pnl-analysis'
import { INTEREST_RATES } from '@/lib/enhanced-financial-utils'

export default function PnLAnalytics() {
  const { state } = useCurrency()
  const [selectedContractId, setSelectedContractId] = useState<string>('')

  // IMMEDIATE FIX: Generate realistic P&L data with market movement simulation
  const pnlDataWithBudgetedRate = useMemo(() => {
    if (!selectedContractId) return { data: [], calculatedBudgetedForwardRate: 0 }

    const contract = state.contracts.find(c => c.id === selectedContractId)
    if (!contract) return { data: [], calculatedBudgetedForwardRate: 0 }

    // Get the correct spot rate for the contract's currency pair
    const rateInfo = state.currencyRates.find(r => r.pair === contract.currencyPair)
    if (!rateInfo) {
      console.warn(`No live rate found for ${contract.currencyPair}`)
      return { data: [], calculatedBudgetedForwardRate: contract.budgetedForwardRate }
    }

    const contractDays = Math.min(differenceInDays(contract.maturityDate, new Date()), 30) // Limit to 30 days for display
    const currentSpotRate = rateInfo.spotRate

    console.log(`🎯 P&L ANALYTICS - Using INSTITUTIONAL STANDARD:`)
    console.log(`   Contract: ${contract.id}`)
    console.log(`   Currency Pair: ${contract.currencyPair}`)
    console.log(`   Live Spot Rate: ${currentSpotRate.toFixed(4)}`)
    console.log(`   Will calculate budgeted forward rate using institutional formula...`)

    // USE INSTITUTIONAL-GRADE P&L ANALYSIS (calculates budgeted rate internally)
    const { dailyEntries } = generateInstitutionalDailyPnLAnalysis(
      {
        id: contract.id,
        contractDate: contract.contractDate,
        maturityDate: contract.maturityDate,
        currencyPair: contract.currencyPair,
        amount: contract.amount,
        contractType: contract.contractType,
        // Don't pass budgetedForwardRate - let it be calculated
        inceptionSpotRate: contract.inceptionSpotRate
      },
      currentSpotRate,
      new Date()
    )

    // Get the calculated budgeted forward rate from the first entry (institutional standard)
    const calculatedBudgetedForwardRate = dailyEntries[0]?.budgetedForwardRate || contract.budgetedForwardRate
    
    console.log(`   Calculated Budgeted Forward Rate: ${calculatedBudgetedForwardRate.toFixed(4)} (INSTITUTIONAL FORMULA)`)
    console.log(`   This matches Risk Reporting calculations for symmetry`)

    // Transform to chart format (only current day data per institutional standards)
    const dailyData = dailyEntries.map((entry, index) => ({
      date: format(entry.date, 'MMM dd'),
      day: entry.dayNumber,
      spotRate: entry.liveSpotRate,
      forwardRate: entry.cubicSplineForwardRate,
      budgetedRate: entry.budgetedForwardRate,
      pnl: entry.dailyPnL,
      cumulativePnl: entry.cumulativePnL,
      markToMarket: entry.markToMarket,
      daysToMaturity: entry.daysToMaturity
    }))

    console.log(`✅ INSTITUTIONAL P&L DATA GENERATED:`)
    console.log(`   Entries: ${dailyData.length} (TODAY ONLY - no future projections)`)
    console.log(`   Current MTM: ${dailyData[0]?.markToMarket?.toFixed(2)} ${contract.currencyPair.split('/')[1]}`)

    console.log(`🎯 REALISTIC P&L DATA GENERATED for ${contract.currencyPair}:`)
    console.log(`Day 1 P&L: ₹${dailyData[0]?.pnl.toFixed(0) || 0}`)
    console.log(`Day 2 P&L: ₹${dailyData[1]?.pnl.toFixed(0) || 0}`)
    console.log(`Day 3 P&L: ₹${dailyData[2]?.pnl.toFixed(0) || 0}`)

    return { data: dailyData, calculatedBudgetedForwardRate }
  }, [selectedContractId, state.contracts, state.currencyRates])

  const pnlData = pnlDataWithBudgetedRate.data
  const calculatedBudgetedForwardRate = pnlDataWithBudgetedRate.calculatedBudgetedForwardRate

  const selectedContract = state.contracts.find(c => c.id === selectedContractId)

  // Calculate summary statistics with proper risk metrics
  const summary = useMemo(() => {
    if (pnlData.length === 0) return null

    const contract = selectedContract
    if (!contract) return null

    const totalPnl = pnlData[pnlData.length - 1]?.cumulativePnl || 0
    const maxProfit = Math.max(...pnlData.map(d => d.cumulativePnl || 0))
    const maxLoss = Math.abs(Math.min(...pnlData.map(d => d.cumulativePnl || 0)))
    
    const daysToMaturity = Math.max(1, differenceInDays(new Date(contract.maturityDate), new Date()))
    
    // Calculate volatility from daily P&L changes
    const dailyReturns = pnlData.slice(1).map((d, i) => 
      (d.forwardRate - pnlData[i].forwardRate) / pnlData[i].forwardRate
    )
    const volatility = dailyReturns.length > 1 ? 
      Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length) * Math.sqrt(365) * 100 : 15
    
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
                  <p className="text-lg font-semibold font-mono">{calculatedBudgetedForwardRate.toFixed(4)}</p>
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
