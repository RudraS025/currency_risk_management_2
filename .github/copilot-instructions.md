# Currency Risk Management Application - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a world-class currency risk management software application built with Next.js, TypeScript, and Tailwind CSS. The application provides sophisticated financial risk management capabilities including:

- Real-time currency data integration
- Advanced cubic spline interpolation for forward rate calculations
- Contract management with P&L tracking
- Professional-grade financial reporting
- Modern, institutional-quality user interface

## Technical Stack
- **Frontend**: Next.js 15 with App Router, React, TypeScript, Tailwind CSS
- **State Management**: React Context + Zustand for complex state
- **Charts**: Chart.js/Recharts for financial visualizations
- **Data**: Real-time currency APIs (ExchangeRate-API, Yahoo Finance)
- **Mathematical**: Custom cubic spline implementation for forward curves
- **UI Components**: shadcn/ui for professional components

## Key Features to Implement
1. **Live Currency Dashboard** - Real-time rates with professional trading interface
2. **Contract Management** - Create, edit, monitor forward contracts
3. **Cubic Spline Engine** - Mathematical forward rate curve generation
4. **P&L Analytics** - Daily profit/loss tracking and reporting
5. **Risk Reporting** - Comprehensive tabular reports
6. **Professional UI** - Bank-grade interface design

## Code Standards
- Use TypeScript for all components with proper type definitions
- Follow financial industry naming conventions
- Implement proper error handling for API calls
- Use React Server Components where appropriate
- Maintain separation between business logic and UI components
- Include comprehensive JSDoc comments for financial calculations

## Financial Calculations
- Forward Rate = Spot Rate × (1 + Home Rate × Days/365) ÷ (1 + Foreign Rate × Days/365)
- Use Interest Rate Parity for theoretical pricing
- Implement cubic spline interpolation for smooth rate curves
- Calculate daily P&L against budgeted forward rates

## API Integration
- Use ExchangeRate-API for real-time spot rates
- Integrate with central bank APIs for interest rates
- Handle rate limiting and error scenarios gracefully
- Cache data appropriately for performance

When generating code, prioritize:
- Mathematical accuracy in financial calculations
- Professional, institutional-grade user interface
- Robust error handling and data validation
- Performance optimization for real-time data
- Accessibility and responsive design
