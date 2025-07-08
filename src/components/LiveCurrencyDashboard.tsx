'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, Globe } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

const majorCurrencies = [
  { pair: 'USD/INR', name: 'US Dollar to Indian Rupee' },
  { pair: 'EUR/INR', name: 'Euro to Indian Rupee' },
  { pair: 'GBP/INR', name: 'British Pound to Indian Rupee' },
  { pair: 'JPY/INR', name: 'Japanese Yen to Indian Rupee' },
  { pair: 'AUD/INR', name: 'Australian Dollar to Indian Rupee' },
  { pair: 'CAD/INR', name: 'Canadian Dollar to Indian Rupee' },
  { pair: 'CHF/INR', name: 'Swiss Franc to Indian Rupee' },
  { pair: 'CNY/INR', name: 'Chinese Yuan to Indian Rupee' },
]

const interestRateSources = [
  { name: 'RBI Repo Rate', rate: 6.50, country: 'India', currency: 'INR' },
  { name: 'Federal Funds Rate', rate: 4.50, country: 'United States', currency: 'USD' },
  { name: 'ECB Main Refinancing Rate', rate: 2.15, country: 'European Union', currency: 'EUR' },
  { name: 'BoE Base Rate', rate: 4.25, country: 'United Kingdom', currency: 'GBP' },
  { name: 'BoJ Policy Rate', rate: 0.50, country: 'Japan', currency: 'JPY' },
]

export default function LiveCurrencyDashboard() {
  const { state, refreshRates } = useCurrency()

  // Create chart data from current rates
  const chartData = state.currencyRates.length > 0 
    ? state.currencyRates.slice(0, 3).map(rate => ({
        name: rate.pair,
        spot: rate.spotRate,
        forward90D: rate.forwardRate90D,
      }))
    : [
        { name: 'USD/INR', spot: 0, forward90D: 0 },
        { name: 'EUR/INR', spot: 0, forward90D: 0 },
        { name: 'GBP/INR', spot: 0, forward90D: 0 },
      ]

  return (
    <div className="space-y-6">
      {/* Header with Real-time Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Currency Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Real-time currency rates and market analysis
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${state.currencyRates.length > 0 ? 'bg-green-400 animate-pulse-subtle' : 'bg-orange-400'}`}></div>
            <span className="text-sm text-gray-600">
              {state.currencyRates.length > 0 ? 'Live Data' : 'Loading...'}
            </span>
            {state.lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated: {state.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={() => refreshRates(true)}
            disabled={state.isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              state.isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
            <span>{state.isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 card-professional border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Contracts</p>
              <p className="text-2xl font-bold text-gray-900">{state.contracts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 card-professional border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total P&L</p>
              <p className="text-2xl font-bold text-green-600">₹2,45,680</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 card-professional border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Market Exposure</p>
              <p className="text-2xl font-bold text-gray-900">$1.2M</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 card-professional border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Currency Pairs</p>
              <p className="text-2xl font-bold text-gray-900">{majorCurrencies.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Currency Rates Table */}
      <div className="bg-white rounded-lg card-professional border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Live Currency Rates</h3>
          <p className="text-sm text-gray-600 mt-1">Real-time spot and forward rates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-professional">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency Pair
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spot Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forward Rate (90D)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.currencyRates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full ${state.isLoading ? 'bg-blue-100' : 'bg-gray-100'} flex items-center justify-center mb-3`}>
                        <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-gray-500 text-sm">
                        {state.isLoading ? 'Loading live currency rates...' : 'No currency rates available. Click refresh to load data.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                state.currencyRates.map((rate) => (
                  <tr key={rate.pair} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{rate.pair}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-mono">{rate.spotRate.toFixed(4)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-mono">{rate.forwardRate90D.toFixed(4)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center ${rate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rate.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 mr-1" />
                        )}
                        <span className="font-mono">{rate.change.toFixed(4)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-mono ${rate.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rate.changePercent >= 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rate.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interest Rates Section */}
      <div className="bg-white rounded-lg card-professional border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Central Bank Interest Rates</h3>
          <p className="text-sm text-gray-600 mt-1">Key policy rates for forward rate calculations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-professional">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Central Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interestRateSources.map((source) => (
                <tr key={source.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{source.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{source.country}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 font-mono">{source.currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 font-mono font-semibold">{source.rate.toFixed(2)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Chart */}
      <div className="bg-white rounded-lg card-professional border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Spot vs Forward Rates Comparison</h3>
          <p className="text-sm text-gray-600 mt-1">Current spot rates vs 90-day forward rates</p>
        </div>
        <div className="p-6">
          <div className="h-80">
            {state.currencyRates.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full ${state.isLoading ? 'bg-blue-100' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
                    <BarChart3 className={`w-6 h-6 ${state.isLoading ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {state.isLoading ? 'Loading chart data...' : 'No data available for chart visualization'}
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number | string, name: string) => [
                      parseFloat(value.toString()).toFixed(4), 
                      name === 'spot' ? 'Spot Rate' : '90D Forward Rate'
                    ]}
                    labelFormatter={(label) => `Currency: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spot" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    name="Spot Rate"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forward90D" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                    name="90D Forward Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
