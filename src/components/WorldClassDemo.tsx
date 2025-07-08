/**
 * WORLD-CLASS DEMONSTRATION COMPONENT
 * Shows the brilliant P&L calculation system in action
 */

'use client'

import { useState, useEffect } from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { generateDailyPnLAnalysis } from '@/lib/enhanced-financial-utils'
import { format } from 'date-fns'

export default function WorldClassDemo() {
  const { state } = useCurrency()
  const [selectedContract, setSelectedContract] = useState<string>('')
  const [analysisData, setAnalysisData] = useState<any>(null)

  // Demo contract data (like your Paddy example)
  const demoContract = {
    id: 'paddy-demo',
    contractDate: new Date('2025-07-07'),
    maturityDate: new Date('2025-09-30'),
    currencyPair: 'USD/INR',
    amount: 500000, // $500,000
    contractType: 'export',
    budgetedForwardRate: 86.6810, // Fixed at inception
    inceptionSpotRate: 85.7206
  }

  useEffect(() => {
    if (state.currencyRates.length > 0) {
      const usdInrRate = state.currencyRates.find(r => r.pair === 'USD/INR')
      if (usdInrRate) {
        console.log('🎯 Running World-Class P&L Analysis...')
        
        const analysis = generateDailyPnLAnalysis(
          demoContract,
          usdInrRate.spotRate,
          new Date()
        )
        
        setAnalysisData(analysis)
        
        console.log('✅ World-Class Analysis Complete:', {
          totalEntries: analysis.dailyEntries.length,
          totalPnL: analysis.dailyEntries[analysis.dailyEntries.length - 1]?.cumulativePnL || 0,
          riskRating: analysis.riskMetrics.riskRating,
          maxDrawdown: analysis.riskMetrics.maxDrawdown,
          cubicSplineAnchors: analysis.cubicSplineAnchors.length
        })
      }
    }
  }, [state.currencyRates])

  if (!analysisData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 World-Class P&L System Loading...
        </h3>
        <p className="text-gray-600">Waiting for live currency rates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🏆 World-Class P&L System Demo</h2>
        <p className="text-blue-100">
          Institutional-grade currency risk management - Your brilliant specification in action
        </p>
      </div>

      {/* Contract Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Contract Overview - "Paddy" USD/INR Export
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Contract Details</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Amount:</strong> ${demoContract.amount.toLocaleString()}</p>
              <p><strong>Currency:</strong> {demoContract.currencyPair}</p>
              <p><strong>Type:</strong> {demoContract.contractType}</p>
              <p><strong>Period:</strong> {format(demoContract.contractDate, 'MMM dd, yyyy')} - {format(demoContract.maturityDate, 'MMM dd, yyyy')}</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Fixed Rates (Never Change)</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Inception Spot:</strong> {demoContract.inceptionSpotRate.toFixed(4)}</p>
              <p><strong>Budgeted Forward:</strong> {demoContract.budgetedForwardRate.toFixed(4)}</p>
              <p><strong>Status:</strong> ✅ Fixed at inception</p>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Live Performance</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Current Spot:</strong> {state.currencyRates.find(r => r.pair === 'USD/INR')?.spotRate.toFixed(4)}</p>
              <p><strong>Total P&L:</strong> ₹{analysisData.dailyEntries[analysisData.dailyEntries.length - 1]?.cumulativePnL.toLocaleString()}</p>
              <p><strong>Risk Rating:</strong> {analysisData.riskMetrics.riskRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cubic Spline Anchors */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📐 Cubic Spline Anchor Points
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days to Maturity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forward Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time to Maturity (Years)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisData.cubicSplineAnchors.map((anchor: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {anchor.daysToMaturity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {anchor.forwardRate.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {anchor.timeToMaturity.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily P&L Table (First 10 days) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📈 Daily P&L Analysis (First 10 Days)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days to Maturity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Live Spot Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cubic Spline Forward
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budgeted Forward
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cumulative P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MTM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volatility
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisData.dailyEntries.slice(0, 10).map((entry: any, index: number) => (
                <tr key={index} className={`hover:bg-gray-50 ${entry.isToday ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(entry.date, 'MMM dd, yyyy')}
                    {entry.isToday && <span className="text-blue-600 ml-2">(Today)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.dayNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.daysToMaturity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.liveSpotRate.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.cubicSplineForwardRate.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.budgetedForwardRate.toFixed(4)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    entry.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.dailyPnL >= 0 ? '+' : ''}₹{entry.dailyPnL.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    entry.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.cumulativePnL >= 0 ? '+' : ''}₹{entry.cumulativePnL.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    entry.markToMarket >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.markToMarket >= 0 ? '+' : ''}₹{entry.markToMarket.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.volatility.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ⚠️ Risk Metrics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">Max Drawdown</h4>
            <p className="text-2xl font-bold text-red-600">
              ₹{analysisData.riskMetrics.maxDrawdown.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Max Profit</h4>
            <p className="text-2xl font-bold text-green-600">
              ₹{analysisData.riskMetrics.maxProfit.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Value at Risk</h4>
            <p className="text-2xl font-bold text-orange-600">
              ₹{analysisData.riskMetrics.valueAtRisk.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">Risk Rating</h4>
            <p className={`text-2xl font-bold ${
              analysisData.riskMetrics.riskRating === 'Critical' ? 'text-red-600' :
              analysisData.riskMetrics.riskRating === 'High' ? 'text-orange-600' :
              analysisData.riskMetrics.riskRating === 'Medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {analysisData.riskMetrics.riskRating}
            </p>
          </div>
        </div>
      </div>

      {/* Methodology Explanation */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎯 World-Class Methodology
        </h3>
        
        <div className="space-y-4 text-sm text-gray-700">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-blue-900">1. Fixed Budgeted Forward Rate</h4>
            <p>Calculated ONCE at inception using live spot rate × e^((r_foreign - r_domestic) × t) and NEVER changes throughout contract life.</p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-green-900">2. Dynamic Cubic Spline Curve</h4>
            <p>Daily recalculation of forward curve using current spot rate with cubic spline interpolation for smooth rate projections.</p>
          </div>
          
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-orange-900">3. Real-Time P&L Attribution</h4>
            <p>Daily P&L = (Today's Forward - Yesterday's Forward) × Amount. MTM = (Current Forward - Budgeted Forward) × Amount.</p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-purple-900">4. Institutional Risk Metrics</h4>
            <p>Value at Risk (95% confidence), volatility scoring, drawdown analysis, and dynamic risk rating based on live market conditions.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
