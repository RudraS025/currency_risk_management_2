import { NextResponse } from 'next/server'

// Interest rate sources - in production, these would come from actual APIs
const interestRateSources = [
  {
    country: 'India',
    currency: 'INR',
    rate: 6.50,
    source: 'Reserve Bank of India',
    instrumentName: 'Repo Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'United States',
    currency: 'USD',
    rate: 5.25,
    source: 'Federal Reserve',
    instrumentName: 'Federal Funds Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'European Union',
    currency: 'EUR',
    rate: 4.00,
    source: 'European Central Bank',
    instrumentName: 'Main Refinancing Operations Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'United Kingdom',
    currency: 'GBP',
    rate: 5.25,
    source: 'Bank of England',
    instrumentName: 'Bank Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'Japan',
    currency: 'JPY',
    rate: -0.10,
    source: 'Bank of Japan',
    instrumentName: 'Policy Balance Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'Australia',
    currency: 'AUD',
    rate: 4.35,
    source: 'Reserve Bank of Australia',
    instrumentName: 'Cash Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'Canada',
    currency: 'CAD',
    rate: 4.75,
    source: 'Bank of Canada',
    instrumentName: 'Overnight Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'Switzerland',
    currency: 'CHF',
    rate: 1.75,
    source: 'Swiss National Bank',
    instrumentName: 'SNB Policy Rate',
    lastUpdated: new Date().toISOString(),
  },
  {
    country: 'China',
    currency: 'CNY',
    rate: 3.45,
    source: 'People\'s Bank of China',
    instrumentName: 'Loan Prime Rate (1Y)',
    lastUpdated: new Date().toISOString(),
  },
]

export async function GET() {
  try {
    // In production, you would fetch from multiple central bank APIs
    // For now, we'll return our curated list with small random variations
    // to simulate live updates
    
    const liveRates = interestRateSources.map(rate => ({
      ...rate,
      // Add small random variation (±0.05%) to simulate intraday changes
      rate: parseFloat((rate.rate + (Math.random() * 0.1 - 0.05)).toFixed(2)),
      lastUpdated: new Date().toISOString(),
    }))

    return NextResponse.json(liveRates)

  } catch (error) {
    console.error('Error fetching interest rates:', error)
    
    // Return static data if any error occurs
    return NextResponse.json(interestRateSources)
  }
}

// Additional endpoint for fetching historical interest rates
export async function POST(request: Request) {
  try {
    const { currency, startDate, endDate } = await request.json()
    
    // Mock historical data generation
    const days = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    const baseRate = interestRateSources.find(r => r.currency === currency)?.rate || 5.0
    
    const historicalData = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      return {
        date: date.toISOString().split('T')[0],
        rate: parseFloat((baseRate + Math.sin(i * 0.1) * 0.25 + (Math.random() * 0.1 - 0.05)).toFixed(2)),
      }
    })

    return NextResponse.json(historicalData)

  } catch (error) {
    console.error('Error fetching historical interest rates:', error)
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
