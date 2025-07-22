'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  FileText, 
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react'
import { useCurrency, type Contract, type HedgeUtilization } from '@/contexts/CurrencyContext'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'

interface UtilizeHedgeModalProps {
  contract: Contract
  isOpen: boolean
  onClose: () => void
}

function UtilizeHedgeModal({ contract, isOpen, onClose }: UtilizeHedgeModalProps) {
  const { utilizeHedge } = useCurrency()
  
  const [formData, setFormData] = useState({
    amount: '',
    utilizationRate: '',
    utilizationType: 'settlement' as HedgeUtilization['utilizationType'],
    description: '',
    invoiceNumber: '',
    shipmentDetails: '',
    documentsRequired: [] as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const amount = parseFloat(formData.amount)
    const availableAmount = contract.availableAmount ?? contract.amount
    
    if (amount > availableAmount) {
      toast.error('Amount exceeds available hedge amount')
      return
    }

    utilizeHedge(contract.id, {
      utilizationDate: new Date(),
      amount,
      utilizationRate: parseFloat(formData.utilizationRate),
      utilizationType: formData.utilizationType,
      description: formData.description,
      invoiceNumber: formData.invoiceNumber || undefined,
      shipmentDetails: formData.shipmentDetails || undefined,
      documentsRequired: formData.documentsRequired,
      complianceStatus: 'pending'
    })

    onClose()
    setFormData({
      amount: '',
      utilizationRate: '',
      utilizationType: 'settlement',
      description: '',
      invoiceNumber: '',
      shipmentDetails: '',
      documentsRequired: []
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Utilize Hedge - {contract.currencyPair}</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Available Amount</p>
              <p className="text-lg font-semibold">${(contract.availableAmount ?? contract.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Budgeted Rate</p>
              <p className="text-lg font-semibold font-mono">{contract.budgetedForwardRate.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilization Amount
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="100000"
                max={contract.availableAmount ?? contract.amount}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilization Rate
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.utilizationRate}
                onChange={(e) => setFormData({ ...formData, utilizationRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="83.2500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Utilization Type
            </label>
            <select
              value={formData.utilizationType}
              onChange={(e) => setFormData({ ...formData, utilizationType: e.target.value as HedgeUtilization['utilizationType'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="settlement">Settlement</option>
              <option value="delivery">Delivery</option>
              <option value="rollover">Rollover</option>
              <option value="partial_settlement">Partial Settlement</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Export invoice settlement"
              required
            />
          </div>

          {(formData.utilizationType === 'settlement' || formData.utilizationType === 'partial_settlement') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="INV-2025-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipment Details
                </label>
                <input
                  type="text"
                  value={formData.shipmentDetails}
                  onChange={(e) => setFormData({ ...formData, shipmentDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Container #ABC123"
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Utilize Hedge
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function HedgeManagement() {
  const { state, cancelHedge, rolloverHedge, getHedgeUtilization } = useCurrency()
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showUtilizeModal, setShowUtilizeModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  const handleCancelHedge = (contract: Contract) => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason')
      return
    }
    
    cancelHedge(contract.id, cancellationReason)
    setShowCancelModal(false)
    setCancellationReason('')
    setSelectedContract(null)
  }

  const getStatusColor = (hedgeStatus: Contract['hedgeStatus']) => {
    switch (hedgeStatus) {
      case 'available': return 'text-green-600 bg-green-100'
      case 'partially_utilized': return 'text-yellow-600 bg-yellow-100'
      case 'fully_utilized': return 'text-blue-600 bg-blue-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'expired': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hedge Management</h2>
          <p className="text-gray-600 mt-1">
            Manage hedge booking, utilization, and cancellation
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Hedges</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.contracts.filter(c => (c.hedgeStatus || 'available') === 'available').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Partially Utilized</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.contracts.filter(c => (c.hedgeStatus || 'available') === 'partially_utilized').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Exposure</p>
              <p className="text-2xl font-bold text-gray-900">
                ${state.contracts.reduce((sum, c) => sum + (c.availableAmount ?? c.amount), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.contracts.filter(c => (c.hedgeStatus || 'available') === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hedge Contracts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Hedge Contracts</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your currency hedge positions</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hedge Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days to Maturity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.contracts.map((contract) => {
                const utilization = getHedgeUtilization(contract.id)
                const daysToMaturity = differenceInDays(contract.maturityDate, new Date())
                
                // Ensure hedge properties exist with fallbacks
                const hedgeStatus = contract.hedgeStatus || 'available'
                const totalAmount = contract.totalAmount || contract.amount
                const availableAmount = contract.availableAmount ?? contract.amount
                const utilizedAmount = contract.utilizedAmount || 0
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contract.currencyPair} - {contract.contractType.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          Rate: {contract.budgetedForwardRate.toFixed(4)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(hedgeStatus)}`}>
                        {(hedgeStatus || 'available').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${utilization.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {utilization.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Used: ${utilization.utilized.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${availableAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        of ${totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${daysToMaturity < 7 ? 'text-red-600' : daysToMaturity < 30 ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {daysToMaturity} days
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(contract.maturityDate, 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(hedgeStatus === 'available' || hedgeStatus === 'partially_utilized') ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedContract(contract)
                                setShowUtilizeModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                              title="Utilize Hedge"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedContract(contract)
                                setShowCancelModal(true)
                              }}
                              className="text-red-600 hover:text-red-900 flex items-center"
                              title="Cancel Hedge"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Utilization History */}
      {state.contracts.some(c => (c.utilizationHistory || []).length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Utilizations</h3>
            <p className="text-sm text-gray-600 mt-1">History of hedge utilizations</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Realized P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state.contracts
                  .flatMap(contract => 
                    (contract.utilizationHistory || []).map(util => ({ ...util, contract }))
                  )
                  .sort((a, b) => new Date(b.utilizationDate).getTime() - new Date(a.utilizationDate).getTime())
                  .slice(0, 10)
                  .map((util) => (
                    <tr key={util.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(util.utilizationDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {util.contract.currencyPair}
                        </div>
                        <div className="text-xs text-gray-500">
                          {util.contract.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${util.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {util.utilizationRate.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {(util.utilizationType || 'unknown').replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${util.realizationPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {util.realizationPnL >= 0 ? '+' : ''}₹{util.realizationPnL.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          util.complianceStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          util.complianceStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {util.complianceStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Utilize Hedge Modal */}
      {selectedContract && (
        <UtilizeHedgeModal
          contract={selectedContract}
          isOpen={showUtilizeModal}
          onClose={() => {
            setShowUtilizeModal(false)
            setSelectedContract(null)
          }}
        />
      )}

      {/* Cancel Hedge Modal */}
      {showCancelModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Cancel Hedge</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this hedge? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Provide reason for cancellation..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleCancelHedge(selectedContract)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Hedge
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setSelectedContract(null)
                  setCancellationReason('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Keep Hedge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
