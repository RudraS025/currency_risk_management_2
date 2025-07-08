'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import { useCurrency, type Contract } from '@/contexts/CurrencyContext'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { INTEREST_RATES } from '@/lib/enhanced-financial-utils'

export default function ContractManagement() {
  const { state, addContract, updateContract, deleteContract, initializeContractWithLiveRate } = useCurrency()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)

  const [formData, setFormData] = useState<{
    contractDate: string
    maturityDate: string
    currencyPair: string
    amount: string
    contractType: 'export' | 'import' | 'forward' | 'spot' | 'swap' | 'option'
    description: string
  }>({
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    maturityDate: '',
    currencyPair: 'USD/INR',
    amount: '',
    contractType: 'export',
    description: '',
  })

  const currencyPairs = [
    'USD/INR', 'EUR/INR', 'GBP/INR', 'JPY/INR', 
    'AUD/INR', 'CAD/INR', 'CHF/INR', 'CNY/INR'
  ]

  const contractTypes = [
    { value: 'export', label: 'Export Contract' },
    { value: 'import', label: 'Import Contract' },
    { value: 'forward', label: 'Forward Contract' },
    { value: 'spot', label: 'Spot Transaction' },
    { value: 'swap', label: 'Currency Swap' },
    { value: 'option', label: 'Currency Option' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingContract) {
        // For updating existing contracts, use the old method
        const rateInfo = state.currencyRates.find(r => r.pair === formData.currencyPair)
        if (!rateInfo) {
          toast.error(`No live rate available for ${formData.currencyPair}`)
          return
        }
        
        const spotRate = rateInfo.spotRate
        const maturityDays = Math.ceil((new Date(formData.maturityDate).getTime() - new Date(formData.contractDate).getTime()) / (1000 * 60 * 60 * 24))
        
        // Calculate accurate budgeted forward rate using Interest Rate Parity
        const [baseCurrency, quoteCurrency] = formData.currencyPair.split('/')
        const foreignRate = INTEREST_RATES[baseCurrency as keyof typeof INTEREST_RATES] || 0.05
        const domesticRate = INTEREST_RATES[quoteCurrency as keyof typeof INTEREST_RATES] || 0.055
        
        const budgetedForwardRate = spotRate * Math.exp((foreignRate - domesticRate) * (maturityDays / 365))
        
        const contractData = {
          ...editingContract,
          contractDate: new Date(formData.contractDate),
          maturityDate: new Date(formData.maturityDate),
          currencyPair: formData.currencyPair,
          amount: parseFloat(formData.amount),
          contractType: formData.contractType,
          budgetedForwardRate,
          currentForwardRate: budgetedForwardRate,
          spotRate,
          description: formData.description,
        }
        
        updateContract(contractData)
        setEditingContract(null)
      } else {
        // For new contracts, use the enhanced method
        await initializeContractWithLiveRate({
          contractDate: new Date(formData.contractDate),
          maturityDate: new Date(formData.maturityDate),
          currencyPair: formData.currencyPair,
          amount: parseFloat(formData.amount),
          contractType: formData.contractType,
          currentForwardRate: 0, // Will be calculated
          spotRate: 0, // Will be calculated
          pnl: 0,
          status: 'active',
          description: formData.description,
        })
      }

      // Reset form
      setFormData({
        contractDate: format(new Date(), 'yyyy-MM-dd'),
        maturityDate: '',
        currencyPair: 'USD/INR',
        amount: '',
        contractType: 'export',
        description: '',
      })
      setShowCreateForm(false)
      toast.success('Contract created successfully with live rates!')
      
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('Error creating contract. Please try again.')
    }

    // Reset form
    setFormData({
      contractDate: format(new Date(), 'yyyy-MM-dd'),
      maturityDate: '',
      currencyPair: 'USD/INR',
      amount: '',
      contractType: 'export',
      description: '',
    })
    setShowCreateForm(false)
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setFormData({
      contractDate: format(contract.contractDate, 'yyyy-MM-dd'),
      maturityDate: format(contract.maturityDate, 'yyyy-MM-dd'),
      currencyPair: contract.currencyPair,
      amount: contract.amount.toString(),
      contractType: contract.contractType,
      description: contract.description,
    })
    setShowCreateForm(true)
  }

  const handleCancel = () => {
    setShowCreateForm(false)
    setEditingContract(null)
    setFormData({
      contractDate: format(new Date(), 'yyyy-MM-dd'),
      maturityDate: '',
      currencyPair: 'USD/INR',
      amount: '',
      contractType: 'export',
      description: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Management</h2>
          <p className="text-gray-600 mt-1">
            Create, monitor, and manage your currency contracts
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Contract</span>
        </button>
      </div>

      {/* Contract Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingContract ? 'Edit Contract' : 'Create New Contract'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Date
                </label>
                <input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Pair
                </label>
                <select
                  value={formData.currencyPair}
                  onChange={(e) => setFormData({ ...formData, currencyPair: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {currencyPairs.map((pair) => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={formData.contractType}
                  onChange={(e) => setFormData({ ...formData, contractType: e.target.value as Contract['contractType'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {contractTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Paddy export to Iran"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingContract ? 'Update Contract' : 'Create Contract'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Contracts</h3>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all your currency risk management contracts
          </p>
        </div>
        {state.contracts.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first currency contract to start managing risk
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Contract</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budgeted Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state.contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contract.description || `${contract.contractType.toUpperCase()} Contract`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(contract.contractDate, 'MMM dd, yyyy')} - {format(contract.maturityDate, 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{contract.currencyPair}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${contract.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{contract.budgetedForwardRate.toFixed(4)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{contract.currentForwardRate.toFixed(4)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${contract.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {contract.pnl >= 0 ? '+' : ''}₹{contract.pnl.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contract.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : contract.status === 'closed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(contract)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteContract(contract.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
