import React from 'react'
import { useCurrency } from '../contexts/CurrencyContext'

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
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          📊 Data Management
        </h3>
        <p className="text-gray-600">
          Manage your contracts data, storage, and demo content
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={loadDemoContracts}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            🔄 Load Demo Contracts
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            📥 Export Data
          </button>
          
          <button
            onClick={clearAllContracts}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            🗑️ Clear Contracts
          </button>
          
          <button
            onClick={clearStorage}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            ⚠️ Reset All Data
          </button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium mb-3 text-gray-900">📈 Current Data Status:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <span className="font-medium text-gray-600">Contracts:</span>
              <div className="text-lg font-bold text-blue-600">{state.contracts.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <span className="font-medium text-gray-600">Currency Pairs:</span>
              <div className="text-lg font-bold text-green-600">{state.currencyRates.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <span className="font-medium text-gray-600">Interest Rates:</span>
              <div className="text-lg font-bold text-purple-600">{state.interestRates.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <span className="font-medium text-gray-600">Last Updated:</span>
              <div className="text-sm font-medium text-gray-700">
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h4 className="font-medium text-blue-800 mb-2">💾 Data Persistence - FIXED!</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>✅ <strong>Issue Resolved:</strong> Your contracts now automatically save to localStorage</p>
            <p>✅ <strong>No More Data Loss:</strong> Contracts persist across page refreshes and browser sessions</p>
            <p>✅ <strong>Smart Demo Loading:</strong> Demo contracts load only once on first visit</p>
            <p>✅ <strong>Unique Contract IDs:</strong> Better contract identification system</p>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
          <h4 className="font-medium text-green-800 mb-2">🧪 Test the Fix:</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p>1. Create a new contract → It will be saved automatically</p>
            <p>2. Refresh the page (F5) → Your contract should still be there</p>
            <p>3. Delete demo contracts → They won't reappear on refresh</p>
            <p>4. Use "Load Demo Contracts" if you want them back</p>
          </div>
        </div>
      </div>
    </div>
  )
}
