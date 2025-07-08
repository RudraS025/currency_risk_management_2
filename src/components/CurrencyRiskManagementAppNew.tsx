'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import LiveCurrencyDashboardNew from './LiveCurrencyDashboardNew'
import ContractManagementNew from './ContractManagementNew'
import PnLAnalytics from './PnLAnalytics'
import RiskReporting from './RiskReporting'
import { Contract } from '../lib/financial-utils'
import { Toaster } from 'react-hot-toast'

export default function CurrencyRiskManagementApp() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [currencyRates, setCurrencyRates] = useState<any[]>([])
  const [interestRates, setInterestRates] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)

  // Fetch currency rates and interest rates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/currency-rates')
        const data = await response.json()
        
        if (data.rates) {
          setCurrencyRates(data.rates)
          setInterestRates(data.interestRates || {})
        }
      } catch (error) {
        console.error('Error fetching currency data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Update contracts with current spot rates periodically
  useEffect(() => {
    if (currencyRates.length > 0 && contracts.length > 0) {
      const updatedContracts = contracts.map(contract => {
        const currentRate = currencyRates.find(rate => 
          rate.pair === `${contract.baseCurrency}/${contract.quoteCurrency}`)
        
        if (currentRate && contract.status === 'active') {
          return {
            ...contract,
            currentSpotRate: currentRate.spotRate
          }
        }
        return contract
      })
      
      setContracts(updatedContracts)
    }
  }, [currencyRates])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">
                  Currency Risk Management 2025
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Institutional-Grade Currency Risk Management Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {loading ? 'Loading...' : 'Live Market Data'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                loading ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'
              }`}></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="dashboard" className="text-sm font-medium">
              📊 Live Dashboard
            </TabsTrigger>
            <TabsTrigger value="contracts" className="text-sm font-medium">
              📋 Contract Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm font-medium">
              📈 P&L Analytics  
            </TabsTrigger>
            <TabsTrigger value="reporting" className="text-sm font-medium">
              📊 Risk Reporting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <LiveCurrencyDashboardNew 
              currencyRates={currencyRates}
              interestRates={interestRates}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <ContractManagementNew 
              contracts={contracts}
              setContracts={setContracts}
              currencyRates={currencyRates}
              interestRates={interestRates}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PnLAnalytics 
              contracts={contracts}
              currencyRates={currencyRates}
              interestRates={interestRates}
            />
          </TabsContent>

          <TabsContent value="reporting" className="space-y-6">
            <RiskReporting 
              contracts={contracts}
              currencyRates={currencyRates}
            />
          </TabsContent>
        </Tabs>
      </main>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
        }}
      />
    </div>
  )
}
