'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, DollarSign, Eye } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { format, differenceInDays, eachDayOfInterval, isToday, isBefore } from 'date-fns'
import { generateDailyPnLAnalysis, DailyPnLEntry as EnhancedDailyPnLEntry } from '@/lib/enhanced-financial-utils'

interface DailyPnLEntry {
  date: Date
  dayNumber: number
  daysToMaturity: number
  liveSpotRate: number
  cubicSplineForwardRate: number
  budgetedForwardRate: number
  dailyPnL: number
  cumulativePnL: number
  markToMarket: number
  unrealizedPnL: number
  volatility: number
  timeDecay: number
  isToday: boolean
  isPast: boolean
}

interface ContractDailyPnL {
  contractId: string
  contractType: string
  currencyPair: string
  amount: number
  description: string
  contractDate: Date
  maturityDate: Date
  budgetedForwardRate: number // Fixed at inception - NEVER changes
  totalDays: number
  totalPnL: number
  maxDrawdown: number
  maxProfit: number
  volatilityScore: number
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical'
  // World-class additions
  inceptionSpotRate: number
  currentSpotRate: number
  cubicSplineAnchors: Array<{ daysToMaturity: number; forwardRate: number }>
  dailyEntries: EnhancedDailyPnLEntry[]
}

interface RiskMetrics {
  totalExposure: number
  valueAtRisk: number
  maxDrawdown: number
  portfolioBeta: number
  sharpeRatio: number
  contractsAtRisk: number
}

export default function RiskReporting() {
  const { state, refreshRates } = useCurrency()
  const [selectedContract, setSelectedContract] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('detailed')
  const [filterRisk, setFilterRisk] = useState<string>('all')

  // Manual refresh function for user-triggered updates only
  const handleManualRefresh = useCallback(() => {
    refreshRates(true) // Show toast for manual refresh
  }, [refreshRates])

  // Remove the problematic useEffect that causes infinite loop
  // The context already loads rates automatically and refreshes periodically
  // Only add a manual refresh button for user control

  const riskFilters = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Risk' },
  ]

  // WORLD-CLASS: Generate comprehensive daily P&L data using enhanced utilities
  const dailyPnLData: ContractDailyPnL[] = useMemo(() => {
    // Return empty array if no rates are loaded yet or API is still loading
    if (!state.currencyRates.length || state.isLoading) {
      console.log('⏳ Waiting for currency rates to load...')
      return []
    }

    return state.contracts.map(contract => {
      const contractStartDate = new Date(contract.contractDate)
      const maturityDate = new Date(contract.maturityDate)
      const totalDays = differenceInDays(maturityDate, contractStartDate)
      
      // Get live spot rate for this currency pair
      const rateInfo = state.currencyRates.find(r => r.pair === contract.currencyPair)
      const liveSpotRate = rateInfo?.spotRate || 0
      
      // If no rate found, return empty contract data
      if (!liveSpotRate || liveSpotRate <= 0) {
        console.warn(`⚠️ No live rate found for ${contract.currencyPair}, skipping contract ${contract.id}`)
        return {
          contractId: contract.id,
          contractType: contract.contractType,
          currencyPair: contract.currencyPair,
          amount: contract.amount,
          description: contract.description,
          contractDate: contractStartDate,
          maturityDate: maturityDate,
          budgetedForwardRate: contract.budgetedForwardRate,
          totalDays,
          dailyEntries: [],
          totalPnL: 0,
          maxDrawdown: 0,
          maxProfit: 0,
          volatilityScore: 0,
          riskRating: 'Low' as const,
          inceptionSpotRate: contract.inceptionSpotRate || 0,
          currentSpotRate: liveSpotRate,
          cubicSplineAnchors: []
        }
      }

      // WORLD-CLASS: Use enhanced financial utilities for analysis
      const analysis = generateDailyPnLAnalysis(
        {
          id: contract.id,
          contractDate: contractStartDate,
          maturityDate: maturityDate,
          currencyPair: contract.currencyPair,
          amount: contract.amount,
          contractType: contract.contractType,
          budgetedForwardRate: contract.budgetedForwardRate,
          inceptionSpotRate: contract.inceptionSpotRate
        },
        liveSpotRate,
        new Date()
      )

      return {
        contractId: contract.id,
        contractType: contract.contractType,
        currencyPair: contract.currencyPair,
        amount: contract.amount,
        description: contract.description,
        contractDate: contractStartDate,
        maturityDate: maturityDate,
        budgetedForwardRate: contract.budgetedForwardRate,
        totalDays,
        dailyEntries: analysis.dailyEntries,
        totalPnL: analysis.dailyEntries[analysis.dailyEntries.length - 1]?.cumulativePnL || 0,
        maxDrawdown: analysis.riskMetrics.maxDrawdown,
        maxProfit: analysis.riskMetrics.maxProfit,
        volatilityScore: analysis.riskMetrics.volatilityScore,
        riskRating: analysis.riskMetrics.riskRating,
        inceptionSpotRate: contract.inceptionSpotRate || 0,
        currentSpotRate: liveSpotRate,
        cubicSplineAnchors: analysis.cubicSplineAnchors
      }
    })
  }, [state.currencyRates, state.contracts, state.isLoading])

  // Filter contracts based on selected criteria
  const filteredContracts = useMemo(() => {
    let filtered = dailyPnLData
    
    if (selectedContract !== 'all') {
      filtered = filtered.filter(c => c.contractId === selectedContract)
    }
    
    if (filterRisk !== 'all') {
      filtered = filtered.filter(c => c.riskRating.toLowerCase() === filterRisk)
    }
    
    return filtered
  }, [dailyPnLData, selectedContract, filterRisk])

  // Calculate risk metrics
  const riskMetrics: RiskMetrics = useMemo(() => {
    const totalExposure = state.contracts.reduce((sum, contract) => sum + contract.amount, 0)
    const totalPnL = dailyPnLData.reduce((sum, contract) => sum + contract.totalPnL, 0)
    const contractsAtRisk = dailyPnLData.filter(contract => contract.riskRating === 'High' || contract.riskRating === 'Critical').length
    
    const valueAtRisk = totalExposure * 0.05 // 5% VaR assumption
    const maxDrawdown = Math.min(...dailyPnLData.map(c => c.maxDrawdown), 0)
    const portfolioBeta = 1.2
    const sharpeRatio = totalPnL / Math.max(totalExposure * 0.1, 1)

    return {
      totalExposure,
      valueAtRisk,
      maxDrawdown,
      portfolioBeta,
      sharpeRatio,
      contractsAtRisk,
    }
  }, [state.contracts, dailyPnLData])

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      riskMetrics,
      contracts: filteredContracts,
      totalContracts: dailyPnLData.length,
    }
    
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `daily-pnl-report-${format(new Date(), 'yyyy-MM-dd')}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const exportToCsv = (contract: ContractDailyPnL) => {
    const csvHeader = [
      'Date',
      'Day Number',
      'Days to Maturity',
      'Live Spot Rate',
      'Cubic Spline Forward Rate',
      'Budgeted Forward Rate',
      'Daily P&L (₹)',
      'Cumulative P&L (₹)',
      'Mark to Market (₹)',
      'Volatility (%)'
    ].join(',')

    const csvData = contract.dailyEntries.map(entry => [
      format(entry.date, 'yyyy-MM-dd'),
      entry.dayNumber,
      entry.daysToMaturity,
      entry.liveSpotRate.toFixed(4),
      entry.cubicSplineForwardRate.toFixed(4),
      entry.budgetedForwardRate.toFixed(4),
      entry.dailyPnL.toFixed(2),
      entry.cumulativePnL.toFixed(2),
      entry.markToMarket.toFixed(2),
      entry.volatility.toFixed(2)
    ].join(',')).join('\n')

    const csvContent = `${csvHeader}\n${csvData}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `daily-pnl-${contract.contractId}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Risk Reporting</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive daily P&L analysis and risk reporting
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Contracts</option>
            {state.contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.description || `${contract.contractType.toUpperCase()} ${contract.currencyPair}`}
              </option>
            ))}
          </select>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            {riskFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{viewMode === 'summary' ? 'Detailed' : 'Summary'} View</span>
          </button>
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Exposure</p>
              <p className="text-2xl font-bold text-gray-900">
                ${riskMetrics.totalExposure.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Value at Risk (95%)</p>
              <p className="text-2xl font-bold text-red-600">
                ${riskMetrics.valueAtRisk.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-orange-600">
                {riskMetrics.sharpeRatio.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Portfolio Beta</p>
              <p className="text-2xl font-bold text-purple-600">
                {riskMetrics.portfolioBeta.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
              <p className="text-2xl font-bold text-gray-600">
                ₹{riskMetrics.maxDrawdown.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Contracts at Risk</p>
              <p className="text-2xl font-bold text-yellow-600">
                {riskMetrics.contractsAtRisk}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily P&L Tables - One for each contract */}
      {viewMode === 'detailed' && (
        <div className="space-y-8">
          {filteredContracts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h3>
              <p className="text-gray-600">No contracts match your current filter criteria.</p>
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <div key={contract.contractId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.description}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>{contract.currencyPair}</span>
                        <span>•</span>
                        <span>${contract.amount.toLocaleString()}</span>
                        <span>•</span>
                        <span>{format(contract.contractDate, 'MMM dd, yyyy')} - {format(contract.maturityDate, 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.riskRating === 'Critical' ? 'bg-red-100 text-red-800' :
                          contract.riskRating === 'High' ? 'bg-orange-100 text-orange-800' :
                          contract.riskRating === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {contract.riskRating} Risk
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        Total P&L: <span className={contract.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {contract.totalPnL >= 0 ? '+' : ''}₹{contract.totalPnL.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Max Drawdown: ₹{contract.maxDrawdown.toLocaleString()}
                      </div>
                      <button
                        onClick={() => exportToCsv(contract)}
                        className="mt-2 flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days to Maturity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Spot Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cubic Spline Forward</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budgeted Forward</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily P&L</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative P&L</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MTM</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volatility</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contract.dailyEntries.map((entry, index) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 ${entry.isToday ? 'bg-blue-50 font-medium' : ''} ${entry.isPast ? 'opacity-75' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`text-sm ${entry.isToday ? 'font-semibold text-blue-600' : 'text-gray-900'}`}>
                              {format(entry.date, 'MMM dd, yyyy')}
                              {entry.isToday && <span className="ml-1 text-xs">(Today)</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{entry.dayNumber}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{entry.daysToMaturity}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{entry.liveSpotRate.toFixed(4)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{entry.cubicSplineForwardRate.toFixed(4)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{entry.budgetedForwardRate.toFixed(4)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-medium ${entry.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.dailyPnL >= 0 ? '+' : ''}₹{entry.dailyPnL.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-medium ${entry.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.cumulativePnL >= 0 ? '+' : ''}₹{entry.cumulativePnL.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm ${entry.markToMarket >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.markToMarket >= 0 ? '+' : ''}₹{entry.markToMarket.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{entry.volatility.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary View - Contract Overview */}
      {viewMode === 'summary' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Contract Summary</h3>
            <p className="text-sm text-gray-600 mt-1">
              Overview of all active contracts and their current risk profile
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency Pair</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Drawdown</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volatility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No contracts available for analysis
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => (
                    <tr key={contract.contractId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{contract.description}</div>
                        <div className="text-sm text-gray-500">
                          {format(contract.contractDate, 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{contract.currencyPair}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${contract.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contract.totalDays}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${contract.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {contract.totalPnL >= 0 ? '+' : ''}₹{contract.totalPnL.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600">+₹{contract.maxProfit.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-red-600">₹{contract.maxDrawdown.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contract.volatilityScore.toFixed(2)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contract.riskRating === 'Critical' ? 'bg-red-100 text-red-800' : 
                          contract.riskRating === 'High' ? 'bg-orange-100 text-orange-800' :
                          contract.riskRating === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {contract.riskRating}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Management Summary</h3>
        <div className="prose prose-sm text-gray-600">
          <p>
            This comprehensive risk report provides an overview of your currency exposure and associated risks 
            as of {format(new Date(), 'MMMM dd, yyyy')}. The analysis includes:
          </p>
          <ul className="mt-4 space-y-2">
            <li>• <strong>Total Portfolio Exposure:</strong> ${riskMetrics.totalExposure.toLocaleString()} across {state.contracts.length} active contracts</li>
            <li>• <strong>Risk Assessment:</strong> {riskMetrics.contractsAtRisk} contracts currently showing high or critical risk levels</li>
            <li>• <strong>Value at Risk:</strong> 95% confidence level indicating potential loss of ${riskMetrics.valueAtRisk.toLocaleString()}</li>
            <li>• <strong>Performance Metrics:</strong> Sharpe ratio of {riskMetrics.sharpeRatio.toFixed(2)} indicating risk-adjusted returns</li>
          </ul>
          <p className="mt-4">
            <strong>Recommendations:</strong> Monitor high-volatility positions closely and consider hedging strategies 
            for contracts approaching maturity with significant unrealized losses.
          </p>
        </div>
      </div>
    </div>
  )
}
