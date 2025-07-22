# 🏢 Multi-Tenant Architecture Implementation Plan
# Currency Risk Management Platform

## 📋 **IMPLEMENTATION STRATEGY**

### **Phase 1: Database Multi-Tenancy (Recommended)**
- **Approach**: Shared database with tenant ID filtering
- **Benefits**: Cost-effective, easier to manage, good performance
- **Timeline**: 2-3 weeks

### **Phase 2: Application Multi-Tenancy**
- **Tenant Context**: Add tenant awareness to all components
- **Authentication**: Tenant-scoped user authentication
- **Data Isolation**: Ensure all queries are tenant-filtered

### **Phase 3: UI Customization**
- **White Labeling**: Custom branding per tenant
- **Feature Toggles**: Different features per subscription tier
- **Custom Dashboards**: Tenant-specific dashboard layouts

## 🗄️ **DATABASE SCHEMA CHANGES**

### **New Tables**
```sql
-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255),
  base_currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active',
  subscription_plan VARCHAR(50) DEFAULT 'standard',
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant users
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Modified contracts table
ALTER TABLE contracts ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);

-- Add tenant_id to all existing tables
ALTER TABLE portfolio_data ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE risk_metrics ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE pnl_history ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
```

## 🔧 **APPLICATION CHANGES**

### **1. Tenant Context Provider**
```typescript
// src/contexts/TenantContext.tsx
interface TenantContextType {
  tenant: Tenant | null;
  switchTenant: (tenantId: string) => void;
  isTenantLoading: boolean;
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  // Auto-detect tenant from subdomain or path
  useEffect(() => {
    const detectTenant = async () => {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      if (subdomain && subdomain !== 'www') {
        const tenantData = await fetchTenantBySubdomain(subdomain);
        setTenant(tenantData);
      }
    };
    
    detectTenant();
  }, []);
  
  return (
    <TenantContext.Provider value={{ tenant, switchTenant, isTenantLoading }}>
      {children}
    </TenantContext.Provider>
  );
};
```

### **2. Tenant-Aware API Routes**
```typescript
// src/app/api/contracts/route.ts
export async function GET(request: Request) {
  const tenantId = await getTenantIdFromRequest(request);
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
  }
  
  const contracts = await db.query(`
    SELECT * FROM contracts 
    WHERE tenant_id = $1 
    ORDER BY created_at DESC
  `, [tenantId]);
  
  return NextResponse.json(contracts);
}

async function getTenantIdFromRequest(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Look up tenant by subdomain
  const tenant = await fetchTenantBySubdomain(subdomain);
  return tenant?.id || null;
}
```

### **3. Multi-Tenant Database Utilities**
```typescript
// src/lib/tenant-db.ts
export class TenantAwareDB {
  constructor(private tenantId: string) {}
  
  async getContracts() {
    return db.query(`
      SELECT * FROM contracts 
      WHERE tenant_id = $1
    `, [this.tenantId]);
  }
  
  async createContract(contractData: ContractData) {
    return db.query(`
      INSERT INTO contracts (tenant_id, contract_type, base_currency, ...)
      VALUES ($1, $2, $3, ...)
    `, [this.tenantId, ...Object.values(contractData)]);
  }
  
  async getPnLData() {
    return db.query(`
      SELECT * FROM pnl_history 
      WHERE tenant_id = $1
      ORDER BY date DESC
    `, [this.tenantId]);
  }
}
```

## 🎨 **UI CUSTOMIZATION FEATURES**

### **White Label Capabilities**
```typescript
interface TenantBranding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  customCSS?: string;
  favicon: string;
}

// Dynamic branding component
const BrandedHeader: React.FC = () => {
  const { tenant } = useTenant();
  
  return (
    <header style={{ backgroundColor: tenant?.branding.primaryColor }}>
      <img src={tenant?.branding.logo} alt={tenant?.name} />
      <h1>{tenant?.branding.companyName} Risk Management</h1>
    </header>
  );
};
```

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Single Heroku App - Multi Tenant**
```
https://currency-risk-mgmt.herokuapp.com/
├── microsoft.currency-risk-mgmt.herokuapp.com
├── google.currency-risk-mgmt.herokuapp.com
├── apple.currency-risk-mgmt.herokuapp.com
└── startup-client.currency-risk-mgmt.herokuapp.com
```

### **Benefits of This Approach**
1. **Cost Effective**: One Heroku dyno serves all tenants
2. **Easy Management**: Single deployment and monitoring
3. **Scalable**: Add new tenants without infrastructure changes
4. **Centralized Updates**: All tenants get updates simultaneously

## 💰 **BUSINESS MODEL IMPLICATIONS**

### **Subscription Tiers**
```typescript
enum SubscriptionPlan {
  STARTER = 'starter',     // $99/month - Basic features
  PROFESSIONAL = 'professional', // $299/month - Advanced analytics
  ENTERPRISE = 'enterprise'      // $999/month - Full features + custom
}

interface TenantLimits {
  maxContracts: number;
  maxUsers: number;
  apiCallsPerMonth: number;
  customBranding: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}
```

## 📊 **MIGRATION STRATEGY**

### **Current State → Multi-Tenant**
1. **Add tenant infrastructure** (database tables, context)
2. **Create default tenant** for existing data
3. **Update all APIs** to be tenant-aware
4. **Add tenant detection** from URL
5. **Implement tenant onboarding** flow
6. **Add billing integration** (Stripe)

### **Timeline: 3-4 Weeks**
- Week 1: Database schema + basic tenant context
- Week 2: API updates + tenant detection
- Week 3: UI customization + branding
- Week 4: Testing + deployment

## 🎯 **IMMEDIATE BENEFITS**

1. **Revenue Scale**: Serve multiple corporate clients from one platform
2. **Market Expansion**: Target different industries with customized branding
3. **Operational Efficiency**: Manage all clients from single dashboard
4. **Data Insights**: Aggregate insights across tenants (anonymized)
5. **Competitive Advantage**: Enterprise-grade multi-tenancy

Would you like me to implement the multi-tenant architecture for your platform?
