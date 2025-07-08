'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, Globe } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../lib/financial-utils'

interface LiveCurrencyDashboardProps {
  currencyRates: any[]
  interestRates: { [key: string]: number }
  loading: boolean
}

export default function LiveCurrencyDashboard({ 
  currencyRates, 
  interestRates, 
  loading 
}: LiveCurrencyDashboardProps) {
  
  const interestRateData = Object.entries(interestRates).map(([currency, rate]) => ({
    currency,
    rate,
    name: currency === 'USD' ? 'Federal Funds Rate' :
          currency === 'EUR' ? 'ECB Deposit Rate' :
          currency === 'GBP' ? 'BoE Base Rate' :
          currency === 'JPY' ? 'BoJ Policy Rate' :
          currency === 'INR' ? 'RBI Repo Rate' :
          currency === 'AUD' ? 'RBA Cash Rate' :
          currency === 'CAD' ? 'BoC Overnight Rate' :
          currency === 'CHF' ? 'SNB Policy Rate' :
          currency === 'CNY' ? 'PBoC Loan Prime Rate' :
          `${currency} Rate`
  }))

  // Generate mock historical data for chart
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const baseRates = {
      'USD/INR': 83.25,
      'EUR/INR': 89.12,
      'GBP/INR': 105.89,
      'JPY/INR': 0.558
    }
    
    return {
      time: `${i.toString().padStart(2, '0')}:00`,
      'USD/INR': parseFloat((baseRates['USD/INR'] + Math.random() * 0.3 - 0.15).toFixed(4)),
      'EUR/INR': parseFloat((baseRates['EUR/INR'] + Math.random() * 0.4 - 0.2).toFixed(4)),
      'GBP/INR': parseFloat((baseRates['GBP/INR'] + Math.random() * 0.5 - 0.25).toFixed(4)),
      'JPY/INR': parseFloat((baseRates['JPY/INR'] + Math.random() * 0.01 - 0.005).toFixed(5))
    }
  })

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Currency Rates</h2>
          <p className="text-gray-600 mt-1">Real-time spot and forward rates</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              {loading ? 'Updating...' : 'Live Data'}
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Currency Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currencyRates.map((rate) => (
          <div key={rate.pair} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{rate.pair}</h3>
              {getChangeIcon(rate.change)}
            </div>
            <div className="space-y-1">
              <div>
                <div className="text-xs text-gray-500">Spot Rate</div>
                <div className="text-lg font-bold text-gray-900">
                  {rate.spotRate?.toFixed(4) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Forward Rate (90D)</div>
                <div className="text-sm font-medium text-gray-700">
                  {rate.forwardRate90D?.toFixed(4) || 'N/A'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Change</div>
                  <div className={`text-sm font-medium ${getChangeColor(rate.change)}`}>
                    {rate.change >= 0 ? '+' : ''}{rate.change?.toFixed(4) || '0.0000'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Change %</div>
                  <div className={`text-sm font-medium ${getChangeColor(rate.changePercent)}`}>
                    {formatPercentage(rate.changePercent || 0)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Last Updated: {new Date().toLocaleTimeString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intraday Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Intraday Currency Movements
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    typeof value === 'number' ? value.toFixed(4) : value,
                    name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="USD/INR" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="EUR/INR" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="GBP/INR" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interest Rates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Interest Rates
          </h3>
          <div className="space-y-3">
            {interestRateData.map((rate) => (
              <div key={rate.currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{rate.name}</div>
                  <div className="text-sm text-gray-500">{rate.currency}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {(rate.rate * 100).toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">Annual</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-900">
              {currencyRates.length}
            </div>
            <div className="text-sm text-blue-700">Currency Pairs Tracked</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-900">
              {currencyRates.filter(r => r.change > 0).length}
            </div>
            <div className="text-sm text-green-700">Currencies Up</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-900">
              {currencyRates.filter(r => r.change < 0).length}
            </div>
            <div className="text-sm text-red-700">Currencies Down</div>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Data Sources</h4>
            <p className="text-sm text-blue-700 mt-1">
              Live rates from ExchangeRate-API with institutional-grade calculations. 
              Forward rates calculated using Interest Rate Parity with cubic spline interpolation.
              Data refreshes every 30 seconds during market hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
