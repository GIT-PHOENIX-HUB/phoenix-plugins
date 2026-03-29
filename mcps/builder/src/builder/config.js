/**
 * Phoenix Builder Space - Configuration
 * 
 * Central configuration for all Builder Space components.
 * Includes governance rules, module settings, and integration configs.
 */

const builderConfig = {
    // ==================== GOVERNANCE RULES ====================
    governance: {
        // The canonical owner/final approver
        masterControlOwner: {
            name: process.env.MASTER_CONTROL_OWNER || 'Shane',
            email: process.env.MASTER_CONTROL_EMAIL || 'shane@phoenixelectric.com',
            userId: process.env.MASTER_CONTROL_USER_ID || null
        },

        // Breakglass account (emergency access)
        breakglassAccount: {
            enabled: true,
            accountName: process.env.BREAKGLASS_ACCOUNT || 'breakglass@phoenixelectric.com',
            // Credentials stored in Key Vault, not here
            keyVaultSecretName: 'breakglass-credentials',
            mfaMethod: 'FIDO2',
            usageRequiresLogging: true
        },

        // PIM (Privileged Identity Management) settings
        pim: {
            enabled: true,
            requiredForRoles: [
                'Global Administrator',
                'Exchange Administrator',
                'SharePoint Administrator',
                'Security Administrator',
                'Privileged Role Administrator'
            ],
            maxActivationDurationHours: 8,
            requireJustification: true,
            requireApproval: true,
            approvers: [] // Populated from Azure AD
        },

        // Approval requirements by action type
        approvalRequirements: {
            'user_onboard': { required: false, approvers: ['hr_manager', 'it_admin'] },
            'user_offboard': { required: true, approvers: ['hr_manager', 'master_control'] },
            'license_assign': { required: false, approvers: ['it_admin'] },
            'admin_role_assign': { required: true, approvers: ['master_control'] },
            'external_email': { required: true, approvers: ['master_control'] }, // Courier golden rule
            'sharepoint_permission': { required: false, approvers: ['it_admin'] },
            'workflow_create': { required: true, approvers: ['master_control'] },
            'governance_change': { required: true, approvers: ['master_control'] }
        },

        // Audit logging
        auditLog: {
            enabled: true,
            logToSharePoint: true,
            sharePointSiteId: process.env.SHAREPOINT_SITE_ID,
            logListName: 'GovernanceAuditLog',
            logFilePath: 'Logs/governance_audit.md',
            retentionDays: 365
        }
    },

    // ==================== GOLDEN RULES ====================
    goldenRules: {
        // Courier rule: No autonomous external emails
        noAutoExternalEmail: true,
        externalEmailRequiresApproval: true,
        
        // No plaintext secrets in code
        noSecretsInCode: true,
        secretsVault: 'AzureKeyVault',
        
        // No autonomous destructive actions
        noAutoDelete: true,
        deleteRequiresApproval: true,
        
        // Least privilege principle
        enforceLeasePrivilege: true,
        preferSitesSelected: true, // Use Sites.Selected over Sites.ReadWrite.All
        
        // Human in the loop for critical actions
        humanApprovalRequired: [
            'tenant_config_change',
            'conditional_access_change',
            'admin_consent',
            'external_communication'
        ]
    },

    // ==================== MODULE SETTINGS ====================
    modules: {
        accountProvisioning: {
            enabled: true,
            autoLicenseAssignment: true,
            defaultLicenses: [], // SKU IDs populated from config
            welcomeEmailTemplate: 'welcome_new_user',
            onboardingChecklist: [
                'create_account',
                'assign_licenses',
                'add_to_groups',
                'setup_mailbox',
                'send_welcome_email'
            ],
            offboardingChecklist: [
                'disable_account',
                'remove_licenses',
                'remove_from_groups',
                'convert_to_shared_mailbox',
                'archive_onedrive',
                'notify_manager'
            ]
        },

        permissionAuditing: {
            enabled: true,
            scheduleEnabled: true,
            scheduleCron: '0 0 1 * * 1', // Weekly on Monday at 1am
            auditScopes: [
                'admin_roles',
                'pim_assignments',
                'app_permissions',
                'sharepoint_permissions',
                'mailbox_delegations'
            ],
            alertOnAnomalies: true,
            anomalyThresholds: {
                staleAdminDays: 90,
                unusedAppPermissionDays: 180,
                excessivePermissionCount: 10
            }
        },

        knowledgeManagement: {
            enabled: true,
            sourceRepository: process.env.KNOWLEDGE_REPO || 'phoenix-ai-assistant',
            basePath: 'docs/',
            categories: [
                'runbooks',
                'policies',
                'architecture',
                'troubleshooting',
                'onboarding'
            ],
            autoGenerateDocs: true,
            syncToSharePoint: true,
            sharePointLibrary: 'Phoenix Knowledge Base'
        },

        workflowOrchestration: {
            enabled: true,
            workflowsPath: '.github/workflows/',
            allowedTriggers: ['manual', 'scheduled', 'webhook'],
            maxConcurrentWorkflows: 5,
            timeoutMinutes: 60,
            notifyOnCompletion: true,
            notifyOnFailure: true
        }
    },

    // ==================== AZURE INTEGRATION ====================
    azure: {
        tenantId: process.env.AZURE_TENANT_ID,
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
        
        keyVault: {
            name: process.env.KEY_VAULT_NAME || 'PhoenixKeyVault',
            uri: process.env.KEY_VAULT_URI,
            useManagedIdentity: true
        },

        // App registration for automation
        automationApp: {
            clientId: process.env.AUTOMATION_APP_CLIENT_ID,
            // Client secret stored in Key Vault
            clientSecretKeyVaultName: 'automation-app-secret',
            permissions: {
                graph: [
                    'User.ReadWrite.All',
                    'Directory.ReadWrite.All',
                    'Mail.ReadWrite', // Specific mailboxes only via policy
                    'Sites.Selected', // Specific sites only
                    'RoleManagement.Read.Directory'
                ]
            }
        }
    },

    // ==================== MICROSOFT GRAPH ====================
    graph: {
        baseUrl: 'https://graph.microsoft.com/v1.0',
        betaUrl: 'https://graph.microsoft.com/beta',
        
        // Rate limiting
        maxRequestsPerSecond: 10,
        retryAttempts: 3,
        retryDelayMs: 1000,

        // Batch settings
        maxBatchSize: 20,
        useBatching: true
    },

    // ==================== SHAREPOINT ====================
    sharePoint: {
        siteId: process.env.SHAREPOINT_SITE_ID,
        siteName: process.env.SHAREPOINT_SITE_NAME || 'Phoenix Builder Space',
        driveId: process.env.SHAREPOINT_DRIVE_ID,
        
        libraries: {
            knowledge: 'Phoenix Knowledge Base',
            logs: 'Automation Logs',
            attachments: 'Email Attachments',
            reports: 'Audit Reports'
        },

        lists: {
            auditLog: 'GovernanceAuditLog',
            approvals: 'PendingApprovals',
            workflows: 'WorkflowRegistry'
        }
    },

    // ==================== NOTIFICATIONS ====================
    notifications: {
        teamsEnabled: true,
        teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
        
        emailEnabled: false, // Use Teams primarily
        emailRecipients: [],
        
        notifyOn: {
            workflowComplete: true,
            workflowFailed: true,
            approvalRequired: true,
            auditAnomaly: true,
            governanceViolation: true
        }
    },

    // ==================== RATE LIMITS ====================
    limits: {
        maxUsersPerBatch: 50,
        maxLicenseOperationsPerHour: 100,
        maxAuditQueriesPerMinute: 30,
        maxWorkflowsPerDay: 100
    }
};

/**
 * Get list of enabled modules
 */
function getEnabledModules() {
    return Object.entries(builderConfig.modules)
        .filter(([_, config]) => config.enabled)
        .map(([name, _]) => name);
}

/**
 * Check if an action requires approval
 */
function requiresApproval(actionType) {
    const requirement = builderConfig.governance.approvalRequirements[actionType];
    return requirement?.required || false;
}

/**
 * Get approvers for an action type
 */
function getApprovers(actionType) {
    const requirement = builderConfig.governance.approvalRequirements[actionType];
    return requirement?.approvers || [builderConfig.governance.masterControlOwner.email];
}

/**
 * Check if a golden rule allows an action
 */
function checkGoldenRule(ruleName) {
    return !builderConfig.goldenRules[ruleName];
}

/**
 * Get Key Vault secret name for a credential
 */
function getSecretName(credentialType) {
    const secretMap = {
        'automation_app': builderConfig.azure.automationApp.clientSecretKeyVaultName,
        'breakglass': builderConfig.governance.breakglassAccount.keyVaultSecretName
    };
    return secretMap[credentialType] || credentialType;
}

module.exports = {
    builderConfig,
    getEnabledModules,
    requiresApproval,
    getApprovers,
    checkGoldenRule,
    getSecretName
};
