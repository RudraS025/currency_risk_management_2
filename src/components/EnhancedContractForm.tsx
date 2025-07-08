/**
 * WORLD-CLASS CONTRACT CREATION FORM
 * Uses live rates to set budgeted forward rate at inception
 */

'use client'

import { useState } from 'react'
import { Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { format } from 'date-fns'

export default function EnhancedContractForm() {
  const { state, initializeContractWithLiveRate } = useCurrency()
  const [formData, setFormData] = useState({
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    maturityDate: '',
    currencyPair: 'USD/INR',
    amount: 500000,
    contractType: 'export' as const,
    description: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewData, setPreviewData] = useState<{
    currentSpotRate: number
    estimatedForwardRate: number
    maturityDays: number
  } | null>(null)

  const handleInputChange = (field: string, value: string | number) => {
    const updatedFormData = { ...formData, [field]: value }
    setFormData(updatedFormData)
    
    // Update preview when key fields change
    if (field === 'currencyPair' || field === 'maturityDate') {
      updatePreview(updatedFormData)
    }
  }

  const updatePreview = (data: typeof formData) => {
    if (!data.maturityDate) {
      setPreviewData(null)
      return
    }

    const rateInfo = state.currencyRates.find(r => r.pair === data.currencyPair)
    if (!rateInfo) {
      setPreviewData(null)
      return
    }

    const maturityDate = new Date(data.maturityDate)
    const contractDate = new Date(data.contractDate)
    const maturityDays = Math.ceil((maturityDate.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Estimate forward rate (will be calculated precisely on creation)
    const estimatedForwardRate = rateInfo.spotRate * Math.exp((0.045 - 0.065) * (maturityDays / 365))

    setPreviewData({
      currentSpotRate: rateInfo.spotRate,
      estimatedForwardRate,
      maturityDays
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await initializeContractWithLiveRate({
        contractDate: new Date(formData.contractDate),
        maturityDate: new Date(formData.maturityDate),
        currencyPair: formData.currencyPair,
        amount: formData.amount,
        contractType: formData.contractType,
        currentForwardRate: previewData?.estimatedForwardRate || 0,
        spotRate: previewData?.currentSpotRate || 0,
        pnl: 0,
        status: 'active',
        description: formData.description
      })

      // Reset form
      setFormData({
        contractDate: format(new Date(), 'yyyy-MM-dd'),
        maturityDate: '',
        currencyPair: 'USD/INR',
        amount: 500000,
        contractType: 'export',
        description: ''
      })
      setPreviewData(null)

    } catch (error) {
      console.error('Error creating contract:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Create New Contract (World-Class)
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Date
            </label>
            <input
              type="date"
              value={formData.contractDate}
              onChange={(e) => handleInputChange('contractDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Maturity Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maturity Date
            </label>
            <input
              type="date"
              value={formData.maturityDate}
              onChange={(e) => handleInputChange('maturityDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Currency Pair */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency Pair
            </label>
            <select
              value={formData.currencyPair}
              onChange={(e) => handleInputChange('currencyPair', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="USD/INR">USD/INR</option>
              <option value="EUR/INR">EUR/INR</option>
              <option value="GBP/INR">GBP/INR</option>
              <option value="JPY/INR">JPY/INR</option>
              <option value="AUD/INR">AUD/INR</option>
              <option value="CAD/INR">CAD/INR</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="1000"
              step="1000"
              required
            />
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Type
            </label>
            <select
              value={formData.contractType}
              onChange={(e) => handleInputChange('contractType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="export">Export</option>
              <option value="import">Import</option>
              <option value="forward">Forward</option>
              <option value="spot">Spot</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contract description..."
              required
            />
          </div>
        </div>

        {/* Live Rate Preview */}
        {previewData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Live Rate Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">Current Spot Rate</p>
                <p className="text-lg font-semibold text-blue-900">
                  {previewData.currentSpotRate.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Budgeted Forward Rate</p>
                <p className="text-lg font-semibold text-blue-900">
                  {previewData.estimatedForwardRate.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Days to Maturity</p>
                <p className="text-lg font-semibold text-blue-900">
                  {previewData.maturityDays} days
                </p>
              </div>
            </div>
            <div className="mt-2 text-sm text-blue-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Budgeted forward rate will be fixed at contract creation and never change
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !previewData}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isSubmitting || !previewData
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white transition-colors`}
        >
          {isSubmitting ? 'Creating Contract...' : 'Create World-Class Contract'}
        </button>
      </form>
    </div>
  )
}
