'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Trash2, Edit, Eye, X as CloseIcon } from 'lucide-react'
import { Contract, generateDailyPnL, closeContract, formatCurrency, formatPercentage } from '../lib/financial-utils'
import toast from 'react-hot-toast'

interface ContractManagementProps {
  contracts: Contract[]
  setContracts: (contracts: Contract[]) => void
  currencyRates: any[]
  interestRates: { [key: string]: number }
}

export default function ContractManagement({ 
  contracts, 
  setContracts, 
  currencyRates,
  interestRates 
}: ContractManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [newContract, setNewContract] = useState({
    type: 'export' as Contract['type'],
    baseCurrency: 'USD',
    quoteCurrency: 'INR',
    amount: 0,
    contractRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  // Automatically fetch spot rate when currency is selected
  useEffect(() => {
    if (newContract.baseCurrency && newContract.quoteCurrency) {
      const pair = currencyRates.find(rate => 
        rate.pair === `${newContract.baseCurrency}/${newContract.quoteCurrency}`)
      
      if (pair) {
        setNewContract(prev => ({
          ...prev,
          contractRate: pair.spotRate // Set contract rate to current spot rate
        }))
      }
    }
  }, [newContract.baseCurrency, newContract.quoteCurrency, currencyRates])

  const handleCreateContract = () => {
    if (newContract.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    const currentSpotRate = currencyRates.find(rate => 
      rate.pair === `${newContract.baseCurrency}/${newContract.quoteCurrency}`)?.spotRate || 0

    const contract: Contract = {
      id: Date.now().toString(),
      type: newContract.type,
      baseCurrency: newContract.baseCurrency,
      quoteCurrency: newContract.quoteCurrency,
      amount: newContract.amount,
      contractRate: newContract.contractRate,
      spotRateAtStart: currentSpotRate,
      startDate: newContract.startDate,
      endDate: newContract.endDate,
      status: 'active',
      currentSpotRate
    }

    // Generate daily P&L for the contract
    contract.dailyPnL = generateDailyPnL(contract, currentSpotRate, interestRates)
    contract.totalPnL = contract.dailyPnL[contract.dailyPnL.length - 1]?.cumulativePnL || 0

    setContracts([...contracts, contract])
    setIsDialogOpen(false)
    setNewContract({
      type: 'export',
      baseCurrency: 'USD',
      quoteCurrency: 'INR',
      amount: 0,
      contractRate: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    toast.success('Contract created successfully!')
  }

  const handleCloseContract = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId)
    if (!contract) return

    const currentSpotRate = currencyRates.find(rate => 
      rate.pair === `${contract.baseCurrency}/${contract.quoteCurrency}`)?.spotRate || 0

    const closedContract = closeContract(contract, currentSpotRate)
    
    setContracts(contracts.map(c => 
      c.id === contractId ? closedContract : c
    ))
    toast.success(`Contract closed with P&L: ${formatCurrency(closedContract.totalPnL || 0)}`)
  }

  const handleDeleteContract = (contractId: string) => {
    setContracts(contracts.filter(c => c.id !== contractId))
    toast.success('Contract deleted successfully!')
  }

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'closed': return 'bg-blue-500'
      case 'expired': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Contract Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Contract</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Currency Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contract Type</label>
                <Select
                  value={newContract.type}
                  onValueChange={(value: Contract['type']) => 
                    setNewContract(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="forward">Forward</SelectItem>
                    <SelectItem value="spot">Spot</SelectItem>
                    <SelectItem value="swap">Swap</SelectItem>
                    <SelectItem value="option">Option</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Base Currency</label>
                  <Select
                    value={newContract.baseCurrency}
                    onValueChange={(value) => 
                      setNewContract(prev => ({ ...prev, baseCurrency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quote Currency</label>
                  <Select
                    value={newContract.quoteCurrency}
                    onValueChange={(value) => 
                      setNewContract(prev => ({ ...prev, quoteCurrency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <Input
                  type="number"
                  value={newContract.amount}
                  onChange={(e) => 
                    setNewContract(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter contract amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contract Rate (Current Spot: {
                    currencyRates.find(rate => 
                      rate.pair === `${newContract.baseCurrency}/${newContract.quoteCurrency}`)?.spotRate?.toFixed(4) || 'N/A'
                  })
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newContract.contractRate}
                  onChange={(e) => 
                    setNewContract(prev => ({ ...prev, contractRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="Contract rate"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={newContract.startDate}
                    onChange={(e) => 
                      setNewContract(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Input
                    type="date"
                    value={newContract.endDate}
                    onChange={(e) => 
                      setNewContract(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={handleCreateContract} className="w-full">
                Create Contract
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Currency Pair</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Contract Rate</TableHead>
              <TableHead>Current Spot</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const currentRate = currencyRates.find(rate => 
                rate.pair === `${contract.baseCurrency}/${contract.quoteCurrency}`)
              
              return (
                <TableRow key={contract.id}>
                  <TableCell className="font-mono">{contract.id.slice(-6)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{contract.type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{`${contract.baseCurrency}/${contract.quoteCurrency}`}</TableCell>
                  <TableCell>{formatCurrency(contract.amount, contract.baseCurrency)}</TableCell>
                  <TableCell>{contract.contractRate.toFixed(4)}</TableCell>
                  <TableCell>{currentRate?.spotRate?.toFixed(4) || 'N/A'}</TableCell>
                  <TableCell className={`font-semibold ${
                    (contract.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(contract.totalPnL || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingContract(contract)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {contract.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCloseContract(contract.id)}
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteContract(contract.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Contract Details Dialog */}
      {viewingContract && (
        <Dialog open={!!viewingContract} onOpenChange={() => setViewingContract(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Contract Details - {viewingContract.baseCurrency}/{viewingContract.quoteCurrency}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Contract Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Contract Type</div>
                  <div className="font-semibold">{viewingContract.type.toUpperCase()}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Amount</div>
                  <div className="font-semibold">{formatCurrency(viewingContract.amount, viewingContract.baseCurrency)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Contract Rate</div>
                  <div className="font-semibold">{viewingContract.contractRate.toFixed(4)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Total P&L</div>
                  <div className={`font-semibold ${
                    (viewingContract.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(viewingContract.totalPnL || 0)}
                  </div>
                </div>
              </div>

              {/* Daily P&L Table */}
              {viewingContract.dailyPnL && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Daily P&L Analysis</h3>
                  <div className="max-h-96 overflow-y-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Days to Maturity</TableHead>
                          <TableHead>Spot Rate</TableHead>
                          <TableHead>Forward Rate</TableHead>
                          <TableHead>Daily P&L</TableHead>
                          <TableHead>Cumulative P&L</TableHead>
                          <TableHead>Time Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingContract.dailyPnL.slice(0, 30).map((daily, index) => ( // Show first 30 days
                          <TableRow key={index}>
                            <TableCell>{daily.date}</TableCell>
                            <TableCell>{daily.dayNumber}</TableCell>
                            <TableCell>{daily.spotRate.toFixed(4)}</TableCell>
                            <TableCell>{daily.forwardRate.toFixed(4)}</TableCell>
                            <TableCell className={`${
                              daily.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(daily.pnl)}
                            </TableCell>
                            <TableCell className={`font-semibold ${
                              daily.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(daily.cumulativePnL)}
                            </TableCell>
                            <TableCell>{formatCurrency(daily.timeValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {viewingContract.dailyPnL.length > 30 && (
                    <div className="text-sm text-gray-600 mt-2">
                      Showing first 30 days of {viewingContract.dailyPnL.length} total days
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {contracts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium">No contracts yet</div>
          <div className="text-sm">Create your first currency contract to get started</div>
        </div>
      )}
    </div>
  )
}
