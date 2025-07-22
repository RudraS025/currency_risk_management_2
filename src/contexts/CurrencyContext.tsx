'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

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
  status: 'active' | 'closed' | 'matured'
  description: string
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
  interestRateDifferential: number
  bid: number
  ask: number
  timestamp: string
}

export interface InterestRate {
  country: string
  currency: string
  rate: number
  source: string
  lastUpdated: Date
}

interface CurrencyState {
  contracts: Contract[]
  currencyRates: CurrencyRate[]
  interestRates: InterestRate[]
  isLoading: boolean
  lastUpdated: Date | null
}

type CurrencyAction =
  | { type: 'SET_CONTRACTS'; payload: Contract[] }
  | { type: 'ADD_CONTRACT'; payload: Contract }
  | { type: 'UPDATE_CONTRACT'; payload: Contract }
  | { type: 'DELETE_CONTRACT'; payload: string }
  | { type: 'SET_CURRENCY_RATES'; payload: CurrencyRate[] }
  | { type: 'SET_INTEREST_RATES'; payload: InterestRate[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LAST_UPDATED'; payload: Date }

// Storage keys
const STORAGE_KEYS = {
  CONTRACTS: 'currency_risk_contracts',
  RATES: 'currency_risk_rates',
  INTEREST_RATES: 'currency_risk_interest_rates',
  LAST_UPDATED: 'currency_risk_last_updated',
  FIRST_LOAD: 'currency_risk_first_load'
}

// Demo contracts - only loaded on first visit
const DEMO_CONTRACTS: Contract[] = [
  {
    id: 'demo-1',
    contractDate: new Date('2024-12-01'),
    maturityDate: new Date('2025-03-15'),
    currencyPair: 'USD/INR',
    amount: 100000,
    contractType: 'export',
    budgetedForwardRate: 85.20,
    currentForwardRate: 85.45,
    spotRate: 85.45,
    pnl: 2500,
    status: 'active',
    description: 'Export Contract - Technology Services (Demo)',
    inceptionDate: new Date('2024-12-01'),
    inceptionSpotRate: 85.15
  },
  {
    id: 'demo-2',
    contractDate: new Date('2024-11-15'),
    maturityDate: new Date('2025-02-28'),
    currencyPair: 'EUR/INR',
    amount: 75000,
    contractType: 'import',
    budgetedForwardRate: 98.50,
    currentForwardRate: 100.75,
    spotRate: 100.75,
    pnl: -1687.50,
    status: 'active',
    description: 'Import Contract - Machinery Purchase (Demo)',
    inceptionDate: new Date('2024-11-15'),
    inceptionSpotRate: 98.30
  },
  {
    id: 'demo-3',
    contractDate: new Date('2024-10-20'),
    maturityDate: new Date('2025-04-30'),
    currencyPair: 'GBP/INR',
    amount: 50000,
    contractType: 'forward',
    budgetedForwardRate: 112.30,
    currentForwardRate: 116.55,
    spotRate: 116.55,
    pnl: 2125,
    status: 'active',
    description: 'Forward Hedge - Consultancy Income (Demo)',
    inceptionDate: new Date('2024-10-20'),
    inceptionSpotRate: 112.10
  }
]

// Load data from localStorage
const loadFromStorage = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue
  
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue
    
    const parsed = JSON.parse(stored)
    
    // Handle Date objects in contracts
    if (key === STORAGE_KEYS.CONTRACTS && Array.isArray(parsed)) {
      return parsed.map((contract: any) => ({
        ...contract,
        contractDate: new Date(contract.contractDate),
        maturityDate: new Date(contract.maturityDate),
        inceptionDate: contract.inceptionDate ? new Date(contract.inceptionDate) : undefined,
        lastUpdateDate: contract.lastUpdateDate ? new Date(contract.lastUpdateDate) : undefined
      }))
    }
    
    // Handle Date objects in interest rates
    if (key === STORAGE_KEYS.INTEREST_RATES && Array.isArray(parsed)) {
      return parsed.map((rate: any) => ({
        ...rate,
        lastUpdated: new Date(rate.lastUpdated)
      }))
    }
    
    // Handle last updated date
    if (key === STORAGE_KEYS.LAST_UPDATED && parsed) {
      return new Date(parsed)
    }
    
    return parsed
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error)
    return defaultValue
  }
}

// Save data to localStorage
const saveToStorage = (key: string, data: any) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

// Check if this is the first load
const isFirstLoad = () => {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(STORAGE_KEYS.FIRST_LOAD)
}

// Mark as not first load
const markAsLoaded = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.FIRST_LOAD, 'true')
}

const getInitialState = (): CurrencyState => {
  // Load saved contracts or use demo contracts on first load
  const savedContracts = loadFromStorage(STORAGE_KEYS.CONTRACTS, [])
  const contracts = savedContracts.length > 0 ? savedContracts : (isFirstLoad() ? DEMO_CONTRACTS : [])
  
  return {
    contracts,
    currencyRates: loadFromStorage(STORAGE_KEYS.RATES, []),
    interestRates: loadFromStorage(STORAGE_KEYS.INTEREST_RATES, []),
    isLoading: false,
    lastUpdated: loadFromStorage(STORAGE_KEYS.LAST_UPDATED, null),
  }
}

function currencyReducer(state: CurrencyState, action: CurrencyAction): CurrencyState {
  let newState: CurrencyState
  
  switch (action.type) {
    case 'SET_CONTRACTS':
      newState = { ...state, contracts: action.payload }
      saveToStorage(STORAGE_KEYS.CONTRACTS, action.payload)
      break
    case 'ADD_CONTRACT':
      newState = { ...state, contracts: [...state.contracts, action.payload] }
      saveToStorage(STORAGE_KEYS.CONTRACTS, newState.contracts)
      break
    case 'UPDATE_CONTRACT':
      newState = {
        ...state,
        contracts: state.contracts.map(contract =>
          contract.id === action.payload.id ? action.payload : contract
        ),
      }
      saveToStorage(STORAGE_KEYS.CONTRACTS, newState.contracts)
      break
    case 'DELETE_CONTRACT':
      newState = {
        ...state,
        contracts: state.contracts.filter(contract => contract.id !== action.payload),
      }
      saveToStorage(STORAGE_KEYS.CONTRACTS, newState.contracts)
      break
    case 'SET_CURRENCY_RATES':
      newState = { ...state, currencyRates: action.payload }
      saveToStorage(STORAGE_KEYS.RATES, action.payload)
      break
    case 'SET_INTEREST_RATES':
      newState = { ...state, interestRates: action.payload }
      saveToStorage(STORAGE_KEYS.INTEREST_RATES, action.payload)
      break
    case 'SET_LOADING':
      newState = { ...state, isLoading: action.payload }
      break
    case 'SET_LAST_UPDATED':
      newState = { ...state, lastUpdated: action.payload }
      saveToStorage(STORAGE_KEYS.LAST_UPDATED, action.payload)
      break
    default:
      return state
  }
  
  return newState
}

interface CurrencyContextType {
  state: CurrencyState
  addContract: (contract: Omit<Contract, 'id'>) => void
  updateContract: (contract: Contract) => void
  deleteContract: (id: string) => void
  refreshRates: (showToast?: boolean) => Promise<void>
  clearAllContracts: () => void
  loadDemoContracts: () => void
  // New world-class functions
  initializeContractWithLiveRate: (contractData: Omit<Contract, 'id' | 'budgetedForwardRate' | 'inceptionSpotRate' | 'inceptionDate'>) => Promise<void>
  recalculateContractPnL: (contractId: string) => Promise<void>
  recalculateAllContractsPnL: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(currencyReducer, getInitialState())

  // Mark as loaded on first render
  useEffect(() => {
    if (isFirstLoad()) {
      markAsLoaded()
    }
  }, [])

  const addContract = (contractData: Omit<Contract, 'id'>) => {
    const contract: Contract = {
      ...contractData,
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    dispatch({ type: 'ADD_CONTRACT', payload: contract })
    toast.success('Contract created successfully and saved!')
  }

  const updateContract = (contract: Contract) => {
    dispatch({ type: 'UPDATE_CONTRACT', payload: contract })
    toast.success('Contract updated successfully')
  }

  const deleteContract = (id: string) => {
    dispatch({ type: 'DELETE_CONTRACT', payload: id })
    toast.success('Contract deleted successfully')
  }

  const clearAllContracts = () => {
    dispatch({ type: 'SET_CONTRACTS', payload: [] })
    toast.success('All contracts cleared!')
  }

  const loadDemoContracts = () => {
    dispatch({ type: 'SET_CONTRACTS', payload: DEMO_CONTRACTS })
    toast.success('Demo contracts loaded!')
  }

  const refreshRates = useCallback(async (showToast: boolean = false) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // Fetch live currency rates
      const currencyResponse = await fetch('/api/currency-rates', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store' // Force fresh data
      })
      
      if (!currencyResponse.ok) {
        throw new Error(`API request failed with status ${currencyResponse.status}`)
      }
      
      const currencyData = await currencyResponse.json()
      
      // Check if the API returned an error instead of data
      if (currencyData.error) {
        throw new Error(currencyData.message || currencyData.error)
      }
      
      // Extract the rates array from the API response
      const rates = currencyData.rates || []
      
      if (rates.length === 0) {
        throw new Error('No currency rates received from API')
      }

      dispatch({ type: 'SET_CURRENCY_RATES', payload: rates })
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() })
      
      // Auto-recalculate all contracts P&L when rates update
      await recalculateAllContractsPnL()
      
      // Only show toast message when manually triggered, not during automatic updates
      if (showToast) {
        toast.success(`✅ Live rates updated successfully (${rates.length} pairs)`)
      }
      
      console.log('✅ Currency rates updated:', rates.length, 'pairs')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Only show error toast when manually triggered
      if (showToast) {
        toast.error(`❌ Failed to get live rates: ${errorMessage}`)
      }
      
      console.error('CRITICAL - Error fetching live rates:', error)
      
      // Set empty array to show error state in UI instead of stale data
      dispatch({ type: 'SET_CURRENCY_RATES', payload: [] })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, []) // Empty dependency array - function never changes

  // WORLD-CLASS: Initialize contract with live rate for budgeted forward
  const initializeContractWithLiveRate = useCallback(async (contractData: Omit<Contract, 'id' | 'budgetedForwardRate' | 'inceptionSpotRate' | 'inceptionDate'>) => {
    try {
      // Ensure we have fresh rates
      if (state.currencyRates.length === 0) {
        await refreshRates(false)
      }
      
      // Get current live spot rate
      const rateInfo = state.currencyRates.find(r => r.pair === contractData.currencyPair)
      if (!rateInfo) {
        throw new Error(`Live rate not found for ${contractData.currencyPair}`)
      }
      
      const currentSpotRate = rateInfo.spotRate
      const contractMaturityDays = Math.ceil((contractData.maturityDate.getTime() - contractData.contractDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // CORRECTED: Calculate budgeted forward rate using current spot rate
      // This forward rate becomes the budgeted rate for the entire contract life
      const { calculateForwardRate } = await import('@/lib/enhanced-financial-utils')
      const [baseCurrency, quoteCurrency] = contractData.currencyPair.split('/')
      
      const budgetedForwardRate = calculateForwardRate(
        currentSpotRate,
        baseCurrency,
        quoteCurrency,
        contractMaturityDays
      )
      
      const contract: Contract = {
        ...contractData,
        id: Date.now().toString(),
        budgetedForwardRate, // This is calculated from current spot rate
        currentForwardRate: budgetedForwardRate, // Initially same as budgeted
        spotRate: currentSpotRate,
        pnl: 0, // Initially zero
        inceptionSpotRate: currentSpotRate,
        inceptionDate: new Date(),
        lastUpdateDate: new Date(),
        riskMetrics: {
          volatility: 0,
          maxDrawdown: 0,
          maxProfit: 0,
          valueAtRisk: 0,
          riskRating: 'Low'
        }
      }
      
      dispatch({ type: 'ADD_CONTRACT', payload: contract })
      toast.success(`✅ Contract created with budgeted forward rate: ${budgetedForwardRate.toFixed(4)}`)
      
      console.log(`✅ Contract initialized with CORRECTED logic:`, {
        id: contract.id,
        currencyPair: contract.currencyPair,
        inceptionSpotRate: currentSpotRate,
        budgetedForwardRate: budgetedForwardRate,
        maturityDays: contractMaturityDays,
        formula: `F = ${currentSpotRate} × e^((r_foreign - r_domestic) × ${contractMaturityDays/365})`
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`❌ Failed to create contract: ${errorMessage}`)
      console.error('Error creating contract:', error)
    }
  }, [state.currencyRates, refreshRates])

  // WORLD-CLASS: Recalculate P&L for specific contract
  const recalculateContractPnL = useCallback(async (contractId: string) => {
    try {
      const contract = state.contracts.find(c => c.id === contractId)
      if (!contract) {
        throw new Error(`Contract ${contractId} not found`)
      }
      
      const rateInfo = state.currencyRates.find(r => r.pair === contract.currencyPair)
      if (!rateInfo) {
        console.warn(`No live rate found for ${contract.currencyPair}`)
        return
      }
      
      const currentSpotRate = rateInfo.spotRate
      const remainingDays = Math.ceil((contract.maturityDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate current forward rate
      const currentForwardRate = currentSpotRate * Math.exp((0.045 - 0.065) * (remainingDays / 365))
      
      // Calculate P&L vs budgeted forward (which never changes)
      const pnl = (currentForwardRate - contract.budgetedForwardRate) * contract.amount
      
      // Update contract
      const updatedContract: Contract = {
        ...contract,
        currentForwardRate,
        spotRate: currentSpotRate,
        pnl,
        lastUpdateDate: new Date(),
        riskMetrics: {
          volatility: Math.abs(currentForwardRate - contract.budgetedForwardRate) / contract.budgetedForwardRate * 100,
          maxDrawdown: contract.riskMetrics?.maxDrawdown || 0,
          maxProfit: contract.riskMetrics?.maxProfit || 0,
          valueAtRisk: contract.riskMetrics?.valueAtRisk || 0,
          riskRating: contract.riskMetrics?.riskRating || 'Low'
        }
      }
      
      dispatch({ type: 'UPDATE_CONTRACT', payload: updatedContract })
      
    } catch (error) {
      console.error(`Error recalculating P&L for contract ${contractId}:`, error)
    }
  }, [state.contracts, state.currencyRates])

  // WORLD-CLASS: Recalculate P&L for all contracts
  const recalculateAllContractsPnL = useCallback(async () => {
    try {
      const activeContracts = state.contracts.filter(c => c.status === 'active')
      
      for (const contract of activeContracts) {
        await recalculateContractPnL(contract.id)
      }
      
      console.log(`✅ Recalculated P&L for ${activeContracts.length} active contracts`)
      
    } catch (error) {
      console.error('Error recalculating all contracts P&L:', error)
    }
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
