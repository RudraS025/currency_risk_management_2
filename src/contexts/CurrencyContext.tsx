'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export interface HedgeUtilization {
  id: string
  utilizationDate: Date
  amount: number
  utilizationRate: number // Rate at which utilization happened
  utilizationType: 'settlement' | 'delivery' | 'rollover' | 'partial_settlement'
  description: string
  invoiceNumber?: string // For export/import settlements
  shipmentDetails?: string
  realizationPnL: number // P&L realized from this utilization
  documentsRequired: string[] // KYC/Trade documents
  complianceStatus: 'pending' | 'approved' | 'rejected'
}

export interface Contract {
  id: string
  contractDate: Date
  maturityDate: Date
  currencyPair: string
  amount: number
  contractType: 'export' | 'import' | 'forward' | 'spot' | 'swap' | 'option'
  budgetedForwardRate: number // Fixed at inception - NEVER changes
  currentForwardRate: number
  spotRate: number
  pnl: number
  status: 'active' | 'closed' | 'matured' | 'partially_utilized' | 'cancelled'
  description: string
  
  // HEDGE MANAGEMENT FIELDS
  hedgeStatus: 'available' | 'fully_utilized' | 'partially_utilized' | 'cancelled' | 'expired'
  totalAmount: number // Original contract amount
  availableAmount: number // Remaining available for utilization
  utilizedAmount: number // Total amount already utilized
  utilizationHistory: HedgeUtilization[] // Track all utilizations
  cancellationReason?: string // If cancelled, reason for cancellation
  cancellationDate?: Date // When cancelled
  cancellationPnL?: number // P&L at cancellation
  
  // New fields for world-class implementation
  inceptionSpotRate?: number // Day 1 spot rate (for reference)
  inceptionDate?: Date // When budgeted forward was fixed
  lastUpdateDate?: Date // When rates were last recalculated
  cubicSplineCoefficients?: number[] // For forward curve interpolation
  riskMetrics?: {
    volatility: number
    maxDrawdown: number
    maxProfit: number
    valueAtRisk: number
    riskRating: 'Low' | 'Medium' | 'High' | 'Critical'
  }
  // Enhanced contract type specific fields
  spotDetails?: any // Spot transaction details
  swapDetails?: any // Currency swap details
  optionDetails?: any // Option contract details
  strikeRate?: number // For options
  optionType?: 'call' | 'put' // For options
  premium?: number // For options
  settlementDate?: Date // For spot transactions
  settlementDays?: number // For spot transactions
  nearLegDate?: Date // For swaps
  farLegDate?: Date // For swaps
  nearLegDays?: number // For swaps
  farLegDays?: number // For swaps
  swapPoints?: number // For swaps
}

export interface CurrencyRate {
  pair: string
  spotRate: number
  forwardRate30D: number
  forwardRate90D: number
  forwardRate180D: number
  forwardRate365D: number
  change: number
  changePercent: number
  lastUpdated: string
  timestamp: string
  interestRateDifferential: number
  bid: number
  ask: number
}

export interface InterestRate {
  currency: string
  rate: number
  centralBank: string
  lastUpdated: string
}

interface CurrencyState {
  contracts: Contract[]
  currencyRates: CurrencyRate[]
  interestRates: InterestRate[]
  isLoading: boolean
  lastUpdated?: Date
}

type CurrencyAction = 
  | { type: 'SET_CONTRACTS'; payload: Contract[] }
  | { type: 'ADD_CONTRACT'; payload: Contract }
  | { type: 'UPDATE_CONTRACT'; payload: Contract }
  | { type: 'DELETE_CONTRACT'; payload: string }
  | { type: 'CLEAR_CONTRACTS' }
  | { type: 'SET_CURRENCY_RATES'; payload: CurrencyRate[] }
  | { type: 'SET_INTEREST_RATES'; payload: InterestRate[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  // HEDGE MANAGEMENT ACTIONS
  | { type: 'UTILIZE_HEDGE'; payload: { contractId: string; utilization: HedgeUtilization } }
  | { type: 'CANCEL_HEDGE'; payload: { contractId: string; reason: string; cancellationPnL: number } }
  | { type: 'ROLLOVER_HEDGE'; payload: { contractId: string; newMaturityDate: Date } }

const getInitialState = (): CurrencyState => {
  const contracts: Contract[] = []
  const currencyRates: CurrencyRate[] = []
  const interestRates: InterestRate[] = []
  
  return {
    contracts,
    currencyRates,
    interestRates,
    isLoading: false
  }
}

// Check if this is the first load (no contracts in state and no localStorage)
const isFirstLoad = (): boolean => {
  const savedContracts = localStorage.getItem('currency-risk-contracts')
  return !savedContracts || savedContracts === '[]'
}

// Local Storage Management
const saveContractsToStorage = (contracts: Contract[]) => {
  localStorage.setItem('currency-risk-contracts', JSON.stringify(contracts))
}

const loadContractsFromStorage = (): Contract[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const saved = localStorage.getItem('currency-risk-contracts')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert date strings back to Date objects and migrate to hedge management
      const contracts = parsed.map((contract: any) => ({
        ...contract,
        contractDate: new Date(contract.contractDate),
        maturityDate: new Date(contract.maturityDate),
        inceptionDate: contract.inceptionDate ? new Date(contract.inceptionDate) : undefined,
        lastUpdateDate: contract.lastUpdateDate ? new Date(contract.lastUpdateDate) : undefined,
        settlementDate: contract.settlementDate ? new Date(contract.settlementDate) : undefined,
        nearLegDate: contract.nearLegDate ? new Date(contract.nearLegDate) : undefined,
        farLegDate: contract.farLegDate ? new Date(contract.farLegDate) : undefined,
        cancellationDate: contract.cancellationDate ? new Date(contract.cancellationDate) : undefined,
        // Migrate utilization history dates
        utilizationHistory: (contract.utilizationHistory || []).map((util: any) => ({
          ...util,
          utilizationDate: new Date(util.utilizationDate)
        }))
      }))
      
      // Apply migration to add hedge management fields
      const migratedContracts = migrateContractsToHedgeManagement(contracts)
      
      // Save back to storage with migration applied
      saveContractsToStorage(migratedContracts)
      
      return migratedContracts
    }
  } catch (error) {
    console.error('Error loading contracts from storage:', error)
  }
  return []
}

// Migration function to update existing contracts with hedge management fields
const migrateContractsToHedgeManagement = (contracts: Contract[]): Contract[] => {
  return contracts.map(contract => {
    // If contract already has hedge management fields, return as is
    if (contract.hedgeStatus && contract.totalAmount !== undefined) {
      return contract
    }
    
    // Otherwise, add hedge management fields with defaults
    return {
      ...contract,
      hedgeStatus: 'available' as const,
      totalAmount: contract.amount,
      availableAmount: contract.amount,
      utilizedAmount: 0,
      utilizationHistory: []
    }
  })
}

// Enhanced Demo Data Generator
const generateDemoContracts = (): Contract[] => {
  const today = new Date()
  
  const demoContracts: Contract[] = [
    {
      id: 'demo-1',
      contractDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      maturityDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      currencyPair: 'USD/INR',
      amount: 1000000,
      contractType: 'export',
      budgetedForwardRate: 82.50, // Fixed at inception
      currentForwardRate: 83.25, // Current market rate
      spotRate: 83.20,
      pnl: (83.25 - 82.50) * 1000000, // Positive PnL for exporter
      status: 'active',
      description: 'Export revenue hedge - Q1 receivables',
      
      // HEDGE MANAGEMENT FIELDS
      hedgeStatus: 'partially_utilized',
      totalAmount: 1000000,
      availableAmount: 650000,
      utilizedAmount: 350000,
      utilizationHistory: [
        {
          id: 'util-1',
          utilizationDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
          amount: 350000,
          utilizationRate: 82.85,
          utilizationType: 'settlement',
          description: 'Export invoice settlement - Shipment #EXP2025001',
          invoiceNumber: 'INV-EXP-2025-001',
          shipmentDetails: 'Cotton export to Bangladesh - 50 MT',
          realizationPnL: (82.85 - 82.50) * 350000,
          documentsRequired: ['Bill of Lading', 'Export License', 'Invoice'],
          complianceStatus: 'approved'
        }
      ],
      
      inceptionSpotRate: 82.45,
      inceptionDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      lastUpdateDate: today,
      riskMetrics: {
        volatility: 8.5,
        maxDrawdown: -50000,
        maxProfit: 150000,
        valueAtRisk: 75000,
        riskRating: 'Medium'
      }
    },
    {
      id: 'demo-2',
      contractDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      maturityDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      currencyPair: 'EUR/USD',
      amount: 500000,
      contractType: 'import',
      budgetedForwardRate: 1.0950, // Fixed at inception
      currentForwardRate: 1.0875, // Current market rate
      spotRate: 1.0870,
      pnl: (1.0950 - 1.0875) * 500000, // Positive PnL for importer (rate went down)
      status: 'active',
      description: 'Import payment hedge - Equipment purchase',
      
      // HEDGE MANAGEMENT FIELDS
      hedgeStatus: 'available',
      totalAmount: 500000,
      availableAmount: 500000,
      utilizedAmount: 0,
      utilizationHistory: [],
      
      inceptionSpotRate: 1.0945,
      inceptionDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      lastUpdateDate: today,
      riskMetrics: {
        volatility: 6.2,
        maxDrawdown: -25000,
        maxProfit: 40000,
        valueAtRisk: 30000,
        riskRating: 'Low'
      }
    },
    {
      id: 'demo-3',
      contractDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      maturityDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (matured)
      currencyPair: 'GBP/INR',
      amount: 750000,
      contractType: 'forward',
      budgetedForwardRate: 102.75, // Fixed at inception
      currentForwardRate: 103.45, // Final settlement rate
      spotRate: 103.40,
      pnl: (103.45 - 102.75) * 750000, // Final realized PnL
      status: 'matured',
      description: 'Strategic forward position - Matured',
      
      // HEDGE MANAGEMENT FIELDS
      hedgeStatus: 'fully_utilized',
      totalAmount: 750000,
      availableAmount: 0,
      utilizedAmount: 750000,
      utilizationHistory: [
        {
          id: 'util-2',
          utilizationDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
          amount: 750000,
          utilizationRate: 103.45,
          utilizationType: 'settlement',
          description: 'Contract maturity settlement',
          realizationPnL: (103.45 - 102.75) * 750000,
          documentsRequired: ['Settlement Confirmation'],
          complianceStatus: 'approved'
        }
      ],
      
      inceptionSpotRate: 102.50,
      inceptionDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
      lastUpdateDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      riskMetrics: {
        volatility: 9.1,
        maxDrawdown: -35000,
        maxProfit: 52500,
        valueAtRisk: 45000,
        riskRating: 'Medium'
      }
    }
  ]
  
  return demoContracts
}

function currencyReducer(state: CurrencyState, action: CurrencyAction): CurrencyState {
  switch (action.type) {
    case 'SET_CONTRACTS':
      saveContractsToStorage(action.payload)
      return { ...state, contracts: action.payload }
    case 'ADD_CONTRACT':
      const newContracts = [...state.contracts, action.payload]
      saveContractsToStorage(newContracts)
      return { ...state, contracts: newContracts }
    case 'UPDATE_CONTRACT':
      const updatedContracts = state.contracts.map(contract =>
        contract.id === action.payload.id ? action.payload : contract
      )
      saveContractsToStorage(updatedContracts)
      return { ...state, contracts: updatedContracts }
    case 'DELETE_CONTRACT':
      const filteredContracts = state.contracts.filter(contract => contract.id !== action.payload)
      saveContractsToStorage(filteredContracts)
      return { ...state, contracts: filteredContracts }
    case 'CLEAR_CONTRACTS':
      saveContractsToStorage([])
      return { ...state, contracts: [] }
    case 'SET_CURRENCY_RATES':
      return { ...state, currencyRates: action.payload }
    case 'SET_INTEREST_RATES':
      return { ...state, interestRates: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload }
    
    // HEDGE MANAGEMENT ACTIONS
    case 'UTILIZE_HEDGE':
      const utilizedContracts = state.contracts.map(contract => {
        if (contract.id === action.payload.contractId) {
          const newUtilization = action.payload.utilization
          const newUtilizedAmount = contract.utilizedAmount + newUtilization.amount
          const newAvailableAmount = contract.totalAmount - newUtilizedAmount
          
          let newHedgeStatus: Contract['hedgeStatus'] = 'available'
          if (newAvailableAmount === 0) {
            newHedgeStatus = 'fully_utilized'
          } else if (newUtilizedAmount > 0) {
            newHedgeStatus = 'partially_utilized'
          }
          
          return {
            ...contract,
            utilizedAmount: newUtilizedAmount,
            availableAmount: newAvailableAmount,
            hedgeStatus: newHedgeStatus,
            utilizationHistory: [...contract.utilizationHistory, newUtilization],
            status: newHedgeStatus === 'fully_utilized' ? 'closed' as const : contract.status
          }
        }
        return contract
      })
      saveContractsToStorage(utilizedContracts)
      return { ...state, contracts: utilizedContracts }
      
    case 'CANCEL_HEDGE':
      const cancelledContracts = state.contracts.map(contract => {
        if (contract.id === action.payload.contractId) {
          return {
            ...contract,
            hedgeStatus: 'cancelled' as const,
            status: 'closed' as const,
            cancellationReason: action.payload.reason,
            cancellationDate: new Date(),
            cancellationPnL: action.payload.cancellationPnL
          }
        }
        return contract
      })
      saveContractsToStorage(cancelledContracts)
      return { ...state, contracts: cancelledContracts }
      
    case 'ROLLOVER_HEDGE':
      const rolloverContracts = state.contracts.map(contract => {
        if (contract.id === action.payload.contractId) {
          return {
            ...contract,
            maturityDate: action.payload.newMaturityDate,
            lastUpdateDate: new Date()
          }
        }
        return contract
      })
      saveContractsToStorage(rolloverContracts)
      return { ...state, contracts: rolloverContracts }
      
    default:
      return state
  }
}

interface CurrencyContextType {
  state: CurrencyState
  addContract: (contract: Omit<Contract, 'id'>) => void
  updateContract: (contract: Contract) => void
  deleteContract: (id: string) => void
  clearAllContracts: () => void
  loadDemoContracts: () => void
  refreshRates: (showToast?: boolean) => Promise<void>
  initializeContractWithLiveRate: (contractData: Omit<Contract, 'id' | 'currentForwardRate' | 'spotRate' | 'pnl'>) => Promise<void>
  recalculateContractPnL: (contractId: string) => Promise<void>
  recalculateAllContractsPnL: () => Promise<void>
  
  // HEDGE MANAGEMENT FUNCTIONS
  utilizeHedge: (contractId: string, utilization: Omit<HedgeUtilization, 'id' | 'realizationPnL'>) => void
  cancelHedge: (contractId: string, reason: string) => void
  rolloverHedge: (contractId: string, newMaturityDate: Date) => void
  getHedgeUtilization: (contractId: string) => { utilized: number; available: number; percentage: number }
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(currencyReducer, getInitialState())

  // Mark as loaded on first render
  useEffect(() => {
    if (isFirstLoad()) {
      console.log('✅ First load detected - ready for demo contracts or user input')
    } else {
      console.log('🔄 Loading existing contracts from localStorage...')
      const savedContracts = loadContractsFromStorage()
      if (savedContracts.length > 0) {
        // Migrate existing contracts to include hedge management fields
        const migratedContracts = migrateContractsToHedgeManagement(savedContracts)
        
        dispatch({ type: 'SET_CONTRACTS', payload: migratedContracts })
        console.log(`✅ Loaded ${migratedContracts.length} contracts from localStorage`)
      }
    }
  }, [])

  const addContract = useCallback((contractData: Omit<Contract, 'id'>) => {
    const newContract: Contract = {
      ...contractData,
      id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    dispatch({ type: 'ADD_CONTRACT', payload: newContract })
    toast.success('✅ Contract added successfully!')
  }, [])

  const updateContract = useCallback((contract: Contract) => {
    dispatch({ type: 'UPDATE_CONTRACT', payload: contract })
    toast.success('✅ Contract updated successfully!')
  }, [])

  const deleteContract = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CONTRACT', payload: id })
    toast.success('🗑️ Contract deleted successfully!')
  }, [])

  const clearAllContracts = useCallback(() => {
    dispatch({ type: 'CLEAR_CONTRACTS' })
    toast.success('🧹 All contracts cleared!')
  }, [])

  const loadDemoContracts = useCallback(() => {
    const demoContracts = generateDemoContracts()
    dispatch({ type: 'SET_CONTRACTS', payload: demoContracts })
    toast.success('📊 Demo contracts loaded! Live rates will be fetched automatically.')
  }, [])

  // Enhanced Rate Fetching with Live API Integration
  const refreshRates = useCallback(async (showToast: boolean = true) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      console.log('🔄 Starting live currency data fetch...')
      
      // Fetch currency rates from API route
      const currencyResponse = await fetch('/api/currency-rates')
      const currencyData = await currencyResponse.json()
      
      if (currencyResponse.ok && currencyData.success && currencyData.rates) {
        dispatch({ type: 'SET_CURRENCY_RATES', payload: currencyData.rates })
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() })
        console.log('✅ Live currency rates updated:', currencyData.rates.length, 'pairs')
      } else {
        console.warn('⚠️ Currency rates API response invalid:', currencyData)
        // Don't throw error, just log it and continue
        console.log('📊 Using existing rates if available, or showing empty state')
      }
      
      // Fetch interest rates from API route
      const interestResponse = await fetch('/api/interest-rates')
      const interestData = await interestResponse.json()
      
      if (interestResponse.ok && interestData.success && interestData.rates) {
        dispatch({ type: 'SET_INTEREST_RATES', payload: interestData.rates })
        console.log('✅ Live interest rates updated:', interestData.rates.length, 'currencies')
      } else {
        console.warn('⚠️ Interest rates API response invalid:', interestData)
        // Don't throw error, just log it and continue
        console.log('📊 Using existing interest rates if available')
      }
      
      if (showToast) {
        toast.success('💱 Live rates updated successfully!')
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch live currency data:', error)
      if (showToast) {
        toast.error('Failed to update rates. Using existing data.')
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Initialize Contract with Live Rate (used during contract creation)
  const initializeContractWithLiveRate = useCallback(async (contractData: Omit<Contract, 'id' | 'currentForwardRate' | 'spotRate' | 'pnl'>) => {
    try {
      // Ensure we have fresh rates
      await refreshRates(false)
      
      // Find the currency rate for this pair
      const rateInfo = state.currencyRates.find(r => r.pair === contractData.currencyPair)
      if (!rateInfo) {
        throw new Error(`Rate not found for ${contractData.currencyPair}`)
      }
      
      // Calculate appropriate forward rate based on maturity
      const daysToMaturity = Math.ceil((contractData.maturityDate.getTime() - contractData.contractDate.getTime()) / (1000 * 60 * 60 * 24))
      let forwardRate = rateInfo.spotRate
      
      if (daysToMaturity <= 30) {
        forwardRate = rateInfo.forwardRate30D
      } else if (daysToMaturity <= 90) {
        forwardRate = rateInfo.forwardRate90D
      } else if (daysToMaturity <= 180) {
        forwardRate = rateInfo.forwardRate180D
      } else {
        forwardRate = rateInfo.forwardRate365D
      }
      
      // Calculate initial PnL (should be 0 at inception)
      const initialPnL = (forwardRate - contractData.budgetedForwardRate) * contractData.amount
      
      const enhancedContract: Contract = {
        ...contractData,
        id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        currentForwardRate: forwardRate,
        spotRate: rateInfo.spotRate,
        pnl: initialPnL,
        
        // HEDGE MANAGEMENT FIELDS - Initialize as new available hedge
        hedgeStatus: 'available',
        totalAmount: contractData.amount,
        availableAmount: contractData.amount,
        utilizedAmount: 0,
        utilizationHistory: [],
        
        inceptionSpotRate: rateInfo.spotRate,
        inceptionDate: new Date(),
        lastUpdateDate: new Date(),
      }
      
      dispatch({ type: 'ADD_CONTRACT', payload: enhancedContract })
      toast.success('✅ Contract created with live rates!')
      
    } catch (error) {
      console.error('❌ Failed to initialize contract with live rate:', error)
      toast.error('Failed to create contract with live rates')
      throw error
    }
  }, [state.currencyRates, refreshRates])

  // Recalculate PnL for a specific contract
  const recalculateContractPnL = useCallback(async (contractId: string) => {
    const contract = state.contracts.find(c => c.id === contractId)
    if (!contract) return
    
    try {
      // Get fresh rates
      const rateInfo = state.currencyRates.find(r => r.pair === contract.currencyPair)
      if (!rateInfo) {
        console.warn(`No rate found for ${contract.currencyPair}`)
        return
      }
      
      // Calculate days to maturity and appropriate forward rate
      const daysToMaturity = Math.ceil((contract.maturityDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      let forwardRate = rateInfo.spotRate
      
      if (daysToMaturity <= 30) {
        forwardRate = rateInfo.forwardRate30D
      } else if (daysToMaturity <= 90) {
        forwardRate = rateInfo.forwardRate90D
      } else if (daysToMaturity <= 180) {
        forwardRate = rateInfo.forwardRate180D
      } else {
        forwardRate = rateInfo.forwardRate365D
      }
      
      // Calculate PnL based on contract type
      let pnl = 0
      if (contract.contractType === 'export') {
        // For exports, benefit when forward rate increases
        pnl = (forwardRate - contract.budgetedForwardRate) * contract.amount
      } else if (contract.contractType === 'import') {
        // For imports, benefit when forward rate decreases
        pnl = (contract.budgetedForwardRate - forwardRate) * contract.amount
      } else {
        // For forwards, PnL depends on position
        pnl = (forwardRate - contract.budgetedForwardRate) * contract.amount
      }
      
      const updatedContract: Contract = {
        ...contract,
        currentForwardRate: forwardRate,
        spotRate: rateInfo.spotRate,
        pnl,
        lastUpdateDate: new Date(),
      }
      
      dispatch({ type: 'UPDATE_CONTRACT', payload: updatedContract })
      
    } catch (error) {
      console.error('❌ Failed to recalculate contract PnL:', error)
    }
  }, [state.contracts, state.currencyRates])

  // Recalculate PnL for all contracts
  const recalculateAllContractsPnL = useCallback(async () => {
    console.log('🔄 Recalculating PnL for all contracts...')
    for (const contract of state.contracts) {
      await recalculateContractPnL(contract.id)
    }
    console.log('✅ All contract PnL recalculated')
  }, [state.contracts, recalculateContractPnL])

  useEffect(() => {
    // Initial data load using the same refreshRates function
    const loadInitialData = async () => {
      console.log('🔄 Loading initial currency data...')
      await refreshRates(false) // Don't show toast for initial load
    }

    // Load data immediately
    loadInitialData()
    
    // Set up periodic refresh every 2 minutes (not too frequent for free APIs)
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing currency rates...')
      refreshRates(false) // Don't show toast for auto-refresh
    }, 120000) // 2 minutes
    
    return () => {
      clearInterval(interval)
      console.log('✅ Currency data refresh interval cleared')
    }
  }, [refreshRates]) // Only depend on the memoized refreshRates function

  // HEDGE MANAGEMENT FUNCTIONS
  
  const utilizeHedge = useCallback((contractId: string, utilizationData: Omit<HedgeUtilization, 'id' | 'realizationPnL'>) => {
    const contract = state.contracts.find(c => c.id === contractId)
    if (!contract) {
      toast.error('Contract not found')
      return
    }
    
    if (utilizationData.amount > contract.availableAmount) {
      toast.error(`Utilization amount (${utilizationData.amount}) exceeds available amount (${contract.availableAmount})`)
      return
    }
    
    // Calculate realization P&L
    const realizationPnL = (utilizationData.utilizationRate - contract.budgetedForwardRate) * utilizationData.amount
    
    const utilization: HedgeUtilization = {
      ...utilizationData,
      id: `util-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      realizationPnL
    }
    
    dispatch({ type: 'UTILIZE_HEDGE', payload: { contractId, utilization } })
    
    toast.success(`Hedge utilized: ${utilizationData.amount.toLocaleString()} at rate ${utilizationData.utilizationRate}`)
  }, [state.contracts])
  
  const cancelHedge = useCallback((contractId: string, reason: string) => {
    const contract = state.contracts.find(c => c.id === contractId)
    if (!contract) {
      toast.error('Contract not found')
      return
    }
    
    // Calculate cancellation P&L (mark-to-market at cancellation)
    const cancellationPnL = (contract.currentForwardRate - contract.budgetedForwardRate) * contract.availableAmount
    
    dispatch({ type: 'CANCEL_HEDGE', payload: { contractId, reason, cancellationPnL } })
    
    toast.success(`Hedge cancelled. P&L: ₹${cancellationPnL.toLocaleString()}`)
  }, [state.contracts])
  
  const rolloverHedge = useCallback((contractId: string, newMaturityDate: Date) => {
    const contract = state.contracts.find(c => c.id === contractId)
    if (!contract) {
      toast.error('Contract not found')
      return
    }
    
    dispatch({ type: 'ROLLOVER_HEDGE', payload: { contractId, newMaturityDate } })
    
    toast.success(`Hedge rolled over to ${newMaturityDate.toDateString()}`)
  }, [state.contracts])
  
  const getHedgeUtilization = useCallback((contractId: string) => {
    const contract = state.contracts.find(c => c.id === contractId)
    if (!contract) {
      return { utilized: 0, available: 0, percentage: 0 }
    }
    
    // Handle contracts without hedge management fields (fallback to original amount)
    const totalAmount = contract.totalAmount ?? contract.amount
    const utilizedAmount = contract.utilizedAmount ?? 0
    const availableAmount = contract.availableAmount ?? contract.amount
    
    return {
      utilized: utilizedAmount,
      available: availableAmount,
      percentage: totalAmount > 0 ? (utilizedAmount / totalAmount) * 100 : 0
    }
  }, [state.contracts])

  return (
    <CurrencyContext.Provider
      value={{
        state,
        addContract,
        updateContract,
        deleteContract,
        clearAllContracts,
        loadDemoContracts,
        refreshRates,
        initializeContractWithLiveRate,
        recalculateContractPnL,
        recalculateAllContractsPnL,
        utilizeHedge,
        cancelHedge,
        rolloverHedge,
        getHedgeUtilization,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
