'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import { useCurrency, type Contract } from '@/contexts/CurrencyContext'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { INTEREST_RATES } from '@/lib/enhanced-financial-utils'

/**
 * WORLD-CLASS CURRENCY RISK MANAGEMENT SYSTEM
 * Following Goldman Sachs, JPMorgan, and Deutsche Bank Standards
 * 
 * BUDGETED FORWARD RATE CALCULATION:
 * - Uses cubic spline interpolation (institutional standard)
 * - Ensures Day 1 Budgeted Forward = Day 1 Cubic Spline Forward
 * - Maintains consistency across all P&L calculations
 * - Eliminates discrepancies between contract creation and risk reporting
 */

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
    budgetedForwardRate?: string
    // Option-specific fields
    optionType?: 'call' | 'put'
    strikeRate?: string
    premium?: string
    // Swap-specific fields
    nearLegDays?: string
    farLegDays?: string
    swapType?: 'fixed-floating' | 'floating-floating' | 'fixed-fixed'
    swapPoints?: string
    // Spot-specific fields
    settlementDays?: string
  }>({
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    maturityDate: '',
    currencyPair: 'USD/INR',
    amount: '',
    contractType: 'export',
    description: '',
    budgetedForwardRate: '',
    // Default values for new fields
    optionType: 'call',
    strikeRate: '',
    premium: '',
    nearLegDays: '7',
    farLegDays: '90',
    swapType: 'fixed-floating',
    swapPoints: '',
    settlementDays: '2'
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
        // For updating existing contracts, PRESERVE the original budgeted forward rate
        // The budgeted forward rate is FIXED at inception and NEVER changes
        const contractData = {
          ...editingContract,
          contractDate: new Date(formData.contractDate),
          maturityDate: new Date(formData.maturityDate),
          currencyPair: formData.currencyPair,
          amount: parseFloat(formData.amount),
          contractType: formData.contractType,
          budgetedForwardRate: parseFloat(formData.budgetedForwardRate || editingContract.budgetedForwardRate.toString()),
          description: formData.description,
          // Note: currentForwardRate and spotRate will be updated by the context
        }
        
        updateContract(contractData)
        setEditingContract(null)
      } else {
        // For new contracts, calculate budgeted forward rate if not provided
        let budgetedForwardRate = parseFloat(formData.budgetedForwardRate || '0')
        
        // WORLD-CLASS STANDARD: Use cubic spline interpolation for budgeted forward rate
        // This matches Goldman Sachs, JPMorgan, and Deutsche Bank methodology
        if (!formData.budgetedForwardRate || budgetedForwardRate === 0) {
          const rateInfo = state.currencyRates.find((r: any) => r.pair === formData.currencyPair)
          if (!rateInfo) {
            toast.error(`No live rate available for ${formData.currencyPair}`)
            return
          }
          
          const spotRate = rateInfo.spotRate
          const maturityDays = Math.ceil((new Date(formData.maturityDate).getTime() - new Date(formData.contractDate).getTime()) / (1000 * 60 * 60 * 24))
          
          // INSTITUTIONAL STANDARD: Calculate using cubic spline interpolation
          // Same methodology used in daily P&L calculations for perfect consistency
          const { createCubicSplineAnchors, interpolateCubicSplineForwardRate } = await import('@/lib/enhanced-financial-utils')
          
          // Create cubic spline anchors using current market data
          const cubicSplineAnchors = createCubicSplineAnchors(
            spotRate,
            formData.currencyPair,
            maturityDays,
            0, // Initial value, will be updated
            true // Use enhanced calculation for inception
          )
          
          // Calculate budgeted forward rate using cubic spline interpolation
          // This ensures Day 1 Budgeted Forward = Day 1 Cubic Spline Forward
          budgetedForwardRate = interpolateCubicSplineForwardRate(cubicSplineAnchors, maturityDays)
          
          toast.success(`✨ World-Class Budgeted Forward Rate: ${budgetedForwardRate.toFixed(4)} (Cubic Spline)`)
        }
        
        // Use the enhanced method with contract-specific data
        const baseContractData: Omit<Contract, 'id' | 'currentForwardRate' | 'spotRate' | 'pnl'> = {
          contractDate: new Date(formData.contractDate),
          maturityDate: new Date(formData.maturityDate),
          currencyPair: formData.currencyPair,
          amount: parseFloat(formData.amount),
          contractType: formData.contractType,
          budgetedForwardRate,
          status: 'active' as const,
          description: formData.description,
          // Hedge management fields - world-class standard
          hedgeStatus: 'available' as const,
          totalAmount: parseFloat(formData.amount),
          availableAmount: parseFloat(formData.amount),
          utilizedAmount: 0,
          utilizationHistory: [],
        }
        
        // Add contract-specific fields based on type
        if (formData.contractType === 'option') {
          baseContractData.optionType = formData.optionType as 'call' | 'put'
          baseContractData.strikeRate = formData.strikeRate ? parseFloat(formData.strikeRate) : undefined
          baseContractData.premium = formData.premium ? parseFloat(formData.premium) : undefined
        } else if (formData.contractType === 'swap') {
          baseContractData.nearLegDays = parseInt(formData.nearLegDays || '7')
          baseContractData.farLegDays = parseInt(formData.farLegDays || '90')
          baseContractData.swapPoints = formData.swapPoints ? parseFloat(formData.swapPoints) : undefined
        } else if (formData.contractType === 'spot') {
          // For spot transactions, set maturity date based on settlement days
          const settlementDays = parseInt(formData.settlementDays || '2')
          const settlementDate = new Date(formData.contractDate)
          settlementDate.setDate(settlementDate.getDate() + settlementDays)
          baseContractData.maturityDate = settlementDate
          baseContractData.settlementDays = settlementDays
        }
        
        await initializeContractWithLiveRate(baseContractData)
      }

      // Reset form
      setFormData({
        contractDate: format(new Date(), 'yyyy-MM-dd'),
        maturityDate: '',
        currencyPair: 'USD/INR',
        amount: '',
        contractType: 'export',
        description: '',
        budgetedForwardRate: '',
        optionType: 'call',
        strikeRate: '',
        premium: '',
        nearLegDays: '7',
        farLegDays: '90',
        swapType: 'fixed-floating',
        swapPoints: '',
        settlementDays: '2'
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
      budgetedForwardRate: '',
      optionType: 'call',
      strikeRate: '',
      premium: '',
      nearLegDays: '7',
      farLegDays: '90',
      swapType: 'fixed-floating',
      swapPoints: '',
      settlementDays: '2'
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
      budgetedForwardRate: contract.budgetedForwardRate.toString(),
      optionType: contract.optionType || 'call',
      strikeRate: contract.strikeRate?.toString() || '',
      premium: contract.premium?.toString() || '',
      nearLegDays: contract.nearLegDays?.toString() || '7',
      farLegDays: contract.farLegDays?.toString() || '90',
      swapType: 'fixed-floating', // Default since not defined in contract
      swapPoints: contract.swapPoints?.toString() || '',
      settlementDays: contract.settlementDays?.toString() || '2'
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
      budgetedForwardRate: '',
      optionType: 'call',
      strikeRate: '',
      premium: '',
      nearLegDays: '7',
      farLegDays: '90',
      swapType: 'fixed-floating',
      swapPoints: '',
      settlementDays: '2'
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
              
              {/* Dynamic fields based on contract type */}
              {formData.contractType === 'option' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Option Type
                    </label>
                    <select
                      value={formData.optionType || 'call'}
                      onChange={(e) => setFormData({ ...formData, optionType: e.target.value as 'call' | 'put' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="call">Call Option</option>
                      <option value="put">Put Option</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strike Rate (Optional - defaults to 2% OTM)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.strikeRate || ''}
                      onChange={(e) => setFormData({ ...formData, strikeRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave empty for auto-calculation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Premium (Optional - will be calculated if empty)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.premium || ''}
                      onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave empty for Black-Scholes calculation"
                    />
                  </div>
                </>
              )}
              
              {formData.contractType === 'swap' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Swap Type
                    </label>
                    <select
                      value={formData.swapType || 'fixed-floating'}
                      onChange={(e) => setFormData({ ...formData, swapType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="fixed-floating">Fixed vs Floating</option>
                      <option value="floating-floating">Floating vs Floating</option>
                      <option value="fixed-fixed">Fixed vs Fixed</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Near Leg (Days)
                      </label>
                      <input
                        type="number"
                        value={formData.nearLegDays || '7'}
                        onChange={(e) => setFormData({ ...formData, nearLegDays: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Far Leg (Days)
                      </label>
                      <input
                        type="number"
                        value={formData.farLegDays || '90'}
                        onChange={(e) => setFormData({ ...formData, farLegDays: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        min="7"
                        max="365"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Swap Points (Optional - will be calculated if empty)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.swapPoints || ''}
                      onChange={(e) => setFormData({ ...formData, swapPoints: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave empty for IRP calculation"
                    />
                  </div>
                </>
              )}
              
              {formData.contractType === 'spot' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Settlement Days
                  </label>
                  <select
                    value={formData.settlementDays || '2'}
                    onChange={(e) => setFormData({ ...formData, settlementDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="0">Same Day (T+0)</option>
                    <option value="1">Next Day (T+1)</option>
                    <option value="2">Spot (T+2) - Standard</option>
                  </select>
                </div>
              )}
              
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budgeted Forward Rate
                  <span className="text-xs text-gray-500 ml-2">(Fixed benchmark - set at inception)</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.budgetedForwardRate}
                  onChange={(e) => setFormData({ ...formData, budgetedForwardRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty to auto-calculate using IRP"
                  disabled={!!editingContract} // Disable for editing - budgeted rate is FIXED
                />
                {editingContract && (
                  <p className="text-xs text-gray-600 mt-1">
                    ⚠️ Budgeted Forward Rate cannot be changed after contract inception (remains fixed throughout contract lifecycle)
                  </p>
                )}
                {!editingContract && (
                  <p className="text-xs text-gray-600 mt-1">
                    💡 Leave empty to auto-calculate using Interest Rate Parity (IRP), or enter manual rate for institutional pricing
                  </p>
                )}
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
                    <div className="text-xs normal-case text-gray-400 font-normal">(Fixed at inception)</div>
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
                {state.contracts.map((contract: any) => (
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
