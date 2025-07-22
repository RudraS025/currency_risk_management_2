import React from 'react'
import { useCurrency } from '../contexts/CurrencyContext'
import { Button } from './ui/button'
import { Trash2, RefreshCw, Database, Download } from 'lucide-react'

export function DataManagement() {
  const { state, clearAllContracts, loadDemoContracts } = useCurrency()

  const exportData = () => {
    const dataToExport = {
      contracts: state.contracts,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `currency_contracts_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearStorage = () => {
    if (confirm('⚠️ This will permanently delete all your contracts and data. Are you sure?')) {
      localStorage.clear()
      clearAllContracts()
      window.location.reload()
    }
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Management
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Manage your contracts data, storage, and demo content
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={loadDemoContracts}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Load Demo Contracts
          </Button>
          
          <Button
            variant="outline"
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          
          <Button
            variant="outline"
            onClick={clearAllContracts}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Contracts
          </Button>
          
          <Button
            variant="destructive"
            onClick={clearStorage}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Reset All Data
          </Button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Current Data Status:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Contracts:</span> {state.contracts.length}
            </div>
            <div>
              <span className="font-medium">Currency Pairs:</span> {state.currencyRates.length}
            </div>
            <div>
              <span className="font-medium">Interest Rates:</span> {state.interestRates.length}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {
                state.lastUpdated 
                  ? new Date(state.lastUpdated).toLocaleTimeString()
                  : 'Never'
              }
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h4 className="font-medium text-blue-800 mb-2">💾 Data Persistence Fixed!</h4>
          <p className="text-sm text-blue-700">
            Your contracts are now automatically saved to your browser's local storage. 
            They will persist across page refreshes and browser sessions. Demo contracts 
            are only loaded once when you first visit the app.
          </p>
          <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
            <strong>✅ Issue Resolved:</strong> Contracts no longer disappear on page refresh!
          </div>
        </div>
      </div>
    </div>
  )
}
