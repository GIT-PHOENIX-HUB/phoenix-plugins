# Phoenix Builder - Governance & Permissions

Governance module for managing permissions, auditing access, and provisioning users.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GovernanceEngine                              │
│                   (Policy Enforcement)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Permission    │  │    Account      │  │    License      │  │
│  │    Auditor      │  │  Provisioner    │  │    Monitor      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Microsoft 365  │
                    │    Admin APIs   │
                    └─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `governance.js` | Main governance engine and policy enforcement |
| `permissionAuditor.js` | Permission auditing and compliance checks |
| `accountProvisioner.js` | User onboarding and offboarding workflows |
| `licenseMonitor.js` | License tracking and optimization |
| `policyEngine.js` | Policy definition and evaluation |
| `accessReviewer.js` | Periodic access review automation |
| `complianceReporter.js` | Compliance reporting and dashboards |

## Quick Start

```javascript
const { GovernanceEngine } = require('./builder/governance');

const governance = new GovernanceEngine({
  keyVaultName: '<KEY_VAULT_NAME>'
});

await governance.initialize();

// Check if action is allowed
const allowed = await governance.checkPermission({
  user: 'shane@phoenixelectric.life',
  action: 'servicetitan:job:create',
  resource: 'job:12345'
});

// Audit user permissions
const audit = await governance.auditUserPermissions('shane@phoenixelectric.life');

// Provision new user
await governance.provisionUser({
  email: 'newuser@phoenixelectric.life',
  displayName: 'New User',
  role: 'technician',
  department: 'Operations'
});
```

## Permission Auditor

### Audit User Access

```javascript
const { PermissionAuditor } = require('./permissionAuditor');

const auditor = new PermissionAuditor();

// Full permission audit
const audit = await auditor.auditUser('shane@phoenixelectric.life');
// {
//   user: 'shane@phoenixelectric.life',
//   m365Permissions: [...],
//   serviceTitanRoles: [...],
//   keyVaultAccess: [...],
//   sharePointSites: [...],
//   findings: [
//     { severity: 'warning', message: 'User has owner access to 5+ sites' }
//   ]
// }

// Check specific permission
const hasAccess = await auditor.checkAccess({
  user: 'shane@phoenixelectric.life',
  resource: 'sharepoint:site:phoenix-automation-hub',
  permission: 'write'
});

// Audit all users
const orgAudit = await auditor.auditOrganization();
```

### Compliance Checks

```javascript
// Check against compliance policies
const compliance = await auditor.checkCompliance('shane@phoenixelectric.life', {
  policies: ['least-privilege', 'mfa-required', 'no-shared-accounts']
});

// {
//   compliant: false,
//   violations: [
//     {
//       policy: 'least-privilege',
//       details: 'User has Global Admin role but only needs User Admin',
//       recommendation: 'Remove Global Admin, assign User Administrator'
//     }
//   ]
// }
```

## Account Provisioner

### User Onboarding

```javascript
const { AccountProvisioner } = require('./accountProvisioner');

const provisioner = new AccountProvisioner();

// Provision new employee
const result = await provisioner.provisionUser({
  email: 'john.doe@phoenixelectric.life',
  displayName: 'John Doe',
  role: 'technician',
  department: 'Field Operations',
  manager: 'shane@phoenixelectric.life',
  startDate: '2025-02-01',
  
  // Auto-assign based on role
  autoAssign: {
    m365License: true,
    serviceTitanRole: true,
    sharePointGroups: true,
    teamsChannels: true
  }
});

// {
//   success: true,
//   userId: 'abc123',
//   provisioned: {
//     m365Account: true,
//     license: 'Microsoft 365 Business Basic',
//     serviceTitanTechnician: true,
//     sharePointGroups: ['Phoenix Operations', 'Field Team'],
//     teamsChannels: ['General', 'Field Operations']
//   },
//   pendingApprovals: [
//     { item: 'Key Vault access', approver: 'shane@...' }
//   ]
// }
```

### User Offboarding

```javascript
// Offboard departing employee
const offboardResult = await provisioner.offboardUser({
  email: 'departing@phoenixelectric.life',
  effectiveDate: '2025-01-31',
  
  actions: {
    disableAccount: true,
    revokeServiceTitan: true,
    removeFromGroups: true,
    forwardEmail: 'manager@phoenixelectric.life',
    preserveOneDrive: true, // For legal hold
    transferOwnership: {
      files: 'manager@phoenixelectric.life',
      groups: 'manager@phoenixelectric.life'
    }
  }
});
```

### Role Templates

```javascript
// Pre-defined role templates
const roles = {
  technician: {
    m365License: 'Business Basic',
    serviceTitanRole: 'Technician',
    sharePointGroups: ['Phoenix Operations'],
    teamsChannels: ['Field Operations'],
    keyVaultAccess: false
  },
  officeAdmin: {
    m365License: 'Business Standard',
    serviceTitanRole: 'Office Staff',
    sharePointGroups: ['Phoenix Operations', 'Admin Team'],
    teamsChannels: ['General', 'Admin'],
    keyVaultAccess: false
  },
  developer: {
    m365License: 'Business Basic',
    serviceTitanRole: 'API User',
    sharePointGroups: ['Phoenix Operations', 'Development'],
    teamsChannels: ['Development'],
    keyVaultAccess: true,
    keyVaultRole: 'Key Vault Secrets User'
  }
};
```

## License Monitor

### Track License Usage

```javascript
const { LicenseMonitor } = require('./licenseMonitor');

const monitor = new LicenseMonitor();

// Get license summary
const summary = await monitor.getLicenseSummary();
// {
//   licenses: [
//     {
//       name: 'Microsoft 365 Business Basic',
//       total: 25,
//       assigned: 18,
//       available: 7,
//       cost: 6.00 // per user/month
//     },
//     {
//       name: 'Microsoft 365 Business Standard',
//       total: 10,
//       assigned: 5,
//       available: 5,
//       cost: 12.50
//     }
//   ],
//   totalMonthlyCost: 170.50,
//   recommendations: [
//     'Consider downgrading 3 inactive Business Standard users to Basic'
//   ]
// }

// Find inactive licenses
const inactive = await monitor.findInactiveLicenses({
  inactiveDays: 30
});
```

### License Optimization

```javascript
// Get optimization recommendations
const recommendations = await monitor.getOptimizationRecommendations();
// [
//   {
//     type: 'downgrade',
//     user: 'user1@...',
//     current: 'Business Standard',
//     recommended: 'Business Basic',
//     reason: 'No desktop app usage in 90 days',
//     monthlySavings: 6.50
//   },
//   {
//     type: 'remove',
//     user: 'user2@...',
//     license: 'Power BI Pro',
//     reason: 'No logins in 60 days',
//     monthlySavings: 9.99
//   }
// ]
```

## Policy Engine

### Define Policies

```javascript
const { PolicyEngine } = require('./policyEngine');

const policyEngine = new PolicyEngine();

// Register policy
policyEngine.registerPolicy({
  id: 'no-external-sharing',
  name: 'No External SharePoint Sharing',
  description: 'Prevent sharing files with external users',
  scope: 'sharepoint',
  condition: (context) => {
    return context.action === 'share' && context.target.isExternal;
  },
  action: 'deny',
  notification: {
    user: true,
    admin: true
  }
});

// Evaluate action against policies
const evaluation = await policyEngine.evaluate({
  user: 'shane@phoenixelectric.life',
  action: 'share',
  resource: 'document.pdf',
  target: { email: 'external@gmail.com', isExternal: true }
});

// {
//   allowed: false,
//   deniedBy: 'no-external-sharing',
//   message: 'Sharing with external users is not permitted'
// }
```

### Built-in Policies

| Policy | Description | Default |
|--------|-------------|---------|
| `mfa-required` | Require MFA for all users | Enabled |
| `least-privilege` | Flag excessive permissions | Enabled |
| `no-shared-accounts` | Prevent shared credential usage | Enabled |
| `password-expiry` | Enforce password rotation | 90 days |
| `conditional-access` | Location/device-based access | Enabled |
| `no-external-email-auto-send` | Block auto-sending external emails | Enabled |

## Access Reviews

### Schedule Reviews

```javascript
const { AccessReviewer } = require('./accessReviewer');

const reviewer = new AccessReviewer();

// Create access review campaign
const campaign = await reviewer.createCampaign({
  name: 'Q1 2025 Access Review',
  scope: {
    type: 'all-users',
    excludeGroups: ['Service Accounts']
  },
  reviewers: {
    type: 'manager', // Each user's manager reviews
    fallback: 'shane@phoenixelectric.life'
  },
  schedule: {
    startDate: '2025-01-15',
    durationDays: 14,
    reminderDays: [7, 3, 1]
  },
  autoActions: {
    onNoResponse: 'revoke', // or 'keep'
    onDeny: 'revoke'
  }
});

// Get review status
const status = await reviewer.getCampaignStatus(campaign.id);
```

## Compliance Reporting

### Generate Reports

```javascript
const { ComplianceReporter } = require('./complianceReporter');

const reporter = new ComplianceReporter();

// Generate compliance report
const report = await reporter.generateReport({
  type: 'monthly-compliance',
  period: '2025-01',
  sections: [
    'permission-summary',
    'policy-violations',
    'access-reviews',
    'license-utilization',
    'security-incidents'
  ]
});

// Export to SharePoint
await reporter.exportToSharePoint(report, {
  path: 'Phoenix Electric/99_Logs/Compliance',
  filename: 'Compliance_Report_2025-01.pdf'
});
```

## HTTP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/governance/audit/user/{email}` | GET | Audit user permissions |
| `/governance/audit/organization` | GET | Full org audit |
| `/governance/compliance/{email}` | GET | Check user compliance |
| `/governance/provision` | POST | Provision new user |
| `/governance/offboard` | POST | Offboard user |
| `/governance/licenses` | GET | License summary |
| `/governance/policies` | GET | List active policies |
| `/governance/access-review` | POST | Create access review |
| `/governance/reports` | GET | List available reports |

## Configuration

### Key Vault Secrets

| Secret | Purpose |
|--------|---------|
| `Graph-ClientId` | Microsoft Graph API client |
| `Graph-ClientSecret` | Microsoft Graph API secret |
| `ServiceTitan-ClientId` | ServiceTitan API credentials |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `KEY_VAULT_NAME` | Azure Key Vault name |
| `AZURE_TENANT_ID` | Azure AD tenant |
| `GOVERNANCE_ADMIN_EMAIL` | Default admin for notifications |

## Golden Rules Enforcement

This module enforces Phoenix governance rules:

1. **Least Privilege** - Users get minimum required permissions
2. **Separation of Duties** - Critical actions require multiple approvers
3. **Audit Trail** - All permission changes are logged
4. **Regular Reviews** - Automated access review campaigns
5. **No Shared Accounts** - Each user has individual credentials
