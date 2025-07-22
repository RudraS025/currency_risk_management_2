'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LiveCurrencyDashboard from '@/components/LiveCurrencyDashboard'
import ContractManagement from '@/components/ContractManagement'
import PnLAnalytics from '@/components/PnLAnalytics'
import RiskReporting from '@/components/RiskReporting'
import HedgeManagement from '@/components/HedgeManagement'
import { DataManagement } from '@/components/DataManagement'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { Toaster } from 'react-hot-toast'

export default function CurrencyRiskManagementApp() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Currency Risk Management
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Professional-Grade Financial Risk Management Platform
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Loading...</div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }
  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Currency Risk Management
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Professional-Grade Financial Risk Management Platform
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">Live Market Data</p>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
              <TabsTrigger value="dashboard" className="text-sm font-medium">
                Live Dashboard
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-sm font-medium">
                Contract Management
              </TabsTrigger>
              <TabsTrigger value="hedge" className="text-sm font-medium">
                Hedge Management
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm font-medium">
                P&L Analytics
              </TabsTrigger>
              <TabsTrigger value="reporting" className="text-sm font-medium">
                Risk Reporting
              </TabsTrigger>
              <TabsTrigger value="data" className="text-sm font-medium">
                Data Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <LiveCurrencyDashboard />
            </TabsContent>

            <TabsContent value="contracts" className="space-y-6">
              <ContractManagement />
            </TabsContent>

            <TabsContent value="hedge" className="space-y-6">
              <HedgeManagement />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <PnLAnalytics />
            </TabsContent>

            <TabsContent value="reporting" className="space-y-6">
              <RiskReporting />
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <DataManagement />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Toaster position="top-right" />
    </CurrencyProvider>
  )
}
