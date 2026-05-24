/**
 * Phoenix Builder Space - Main Entry Point
 * 
 * Unified platform for AI-assisted automation and knowledge management.
 * Integrates GitHub Copilot patterns, Azure MCP, Microsoft Graph, and
 * governance controls into a cohesive builder environment.
 */

const { GraphAutomation, createGraphAutomation } = require('./graphAutomation');
const { AccountProvisioner, createAccountProvisioner } = require('./accountProvisioner');
const { PermissionAuditor, createPermissionAuditor } = require('./permissionAuditor');
const { GovernanceEngine, createGovernanceEngine } = require('./governance');
const { KnowledgeManager, createKnowledgeManager } = require('./knowledgeManager');
const { WorkflowOrchestrator, createWorkflowOrchestrator } = require('./workflowOrchestrator');
const { builderConfig, getEnabledModules } = require('./config');

/**
 * Main Phoenix Builder Space class
 * Orchestrates all automation and knowledge management operations
 */
class PhoenixBuilderSpace {
    constructor() {
        this.graphAutomation = createGraphAutomation();
        this.accountProvisioner = createAccountProvisioner();
        this.permissionAuditor = createPermissionAuditor();
        this.governance = createGovernanceEngine();
        this.knowledgeManager = createKnowledgeManager();
        this.workflowOrchestrator = createWorkflowOrchestrator();
        this.isInitialized = false;
    }

    /**
     * Initialize the Builder Space
     */
    async initialize() {
        console.log('═'.repeat(60));
        console.log('PHOENIX BUILDER SPACE - Initializing');
        console.log('═'.repeat(60));

        try {
            // Validate governance rules first
            await this.governance.validateRules();
            
            // Test connections
            const connectionStatus = await this.testConnections();
            
            this.isInitialized = true;
            
            return {
                success: true,
                connectionStatus,
                enabledModules: getEnabledModules()
            };
        } catch (error) {
            console.error('Builder Space initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test all service connections
     */
    async testConnections() {
        const results = {
            graph: false,
            keyVault: false,
            sharePoint: false,
            azureAD: false
        };

        // Test Graph API
        try {
            await this.graphAutomation.testConnection();
            results.graph = true;
        } catch (e) {
            console.error('Graph connection failed:', e.message);
        }

        // Test Azure Key Vault
        try {
            await this.governance.testKeyVaultConnection();
            results.keyVault = true;
        } catch (e) {
            console.error('Key Vault connection failed:', e.message);
        }

        return results;
    }

    // ==================== ACCOUNT MANAGEMENT ====================

    /**
     * Onboard a new user account
     * Creates user, assigns licenses, adds to groups
     */
    async onboardUser(userDetails) {
        // Governance check
        const approval = await this.governance.checkApproval('user_onboard', userDetails);
        if (!approval.approved) {
            return { success: false, error: 'Approval required', approvalId: approval.id };
        }

        return await this.accountProvisioner.onboardUser(userDetails);
    }

    /**
     * Offboard a user account
     * Disables account, removes licenses, archives data
     */
    async offboardUser(userId, options = {}) {
        const approval = await this.governance.checkApproval('user_offboard', { userId, options });
        if (!approval.approved) {
            return { success: false, error: 'Approval required', approvalId: approval.id };
        }

        return await this.accountProvisioner.offboardUser(userId, options);
    }

    /**
     * Assign licenses to a user
     */
    async assignLicenses(userId, licenseSkus) {
        return await this.accountProvisioner.assignLicenses(userId, licenseSkus);
    }

    // ==================== PERMISSION AUDITING ====================

    /**
     * Run a full permission audit
     */
    async runPermissionAudit() {
        return await this.permissionAuditor.runFullAudit();
    }

    /**
     * Get all users with admin roles
     */
    async getAdminRoleMembers() {
        return await this.permissionAuditor.getAdminRoleMembers();
    }

    /**
     * Get PIM activation history
     */
    async getPIMActivations(days = 30) {
        return await this.permissionAuditor.getPIMActivations(days);
    }

    /**
     * Check for stale admin accounts
     */
    async checkStaleAdminAccounts(inactiveDays = 90) {
        return await this.permissionAuditor.checkStaleAccounts(inactiveDays);
    }

    // ==================== KNOWLEDGE MANAGEMENT ====================

    /**
     * Get knowledge base status
     */
    async getKnowledgeStatus() {
        return await this.knowledgeManager.getStatus();
    }

    /**
     * Search the knowledge base
     */
    async searchKnowledge(query) {
        return await this.knowledgeManager.search(query);
    }

    /**
     * Add or update a knowledge entry
     */
    async updateKnowledge(category, entry) {
        return await this.knowledgeManager.updateEntry(category, entry);
    }

    /**
     * Generate documentation from code/config
     */
    async generateDocs(sourceType, sourcePath) {
        return await this.knowledgeManager.generateDocs(sourceType, sourcePath);
    }

    // ==================== WORKFLOW ORCHESTRATION ====================

    /**
     * Execute a predefined workflow
     */
    async executeWorkflow(workflowId, params = {}) {
        const approval = await this.governance.checkWorkflowApproval(workflowId, params);
        if (!approval.approved) {
            return { success: false, error: 'Workflow approval required', approvalId: approval.id };
        }

        return await this.workflowOrchestrator.execute(workflowId, params);
    }

    /**
     * Get available workflows
     */
    getAvailableWorkflows() {
        return this.workflowOrchestrator.getAvailableWorkflows();
    }

    /**
     * Get workflow execution history
     */
    async getWorkflowHistory(workflowId = null, limit = 50) {
        return await this.workflowOrchestrator.getHistory(workflowId, limit);
    }

    // ==================== GOVERNANCE ====================

    /**
     * Get current governance status
     */
    async getGovernanceStatus() {
        return await this.governance.getStatus();
    }

    /**
     * Log an audit event
     */
    async logAuditEvent(eventType, details) {
        return await this.governance.logEvent(eventType, details);
    }

    /**
     * Request approval for an action
     */
    async requestApproval(actionType, details) {
        return await this.governance.requestApproval(actionType, details);
    }

    /**
     * Process a pending approval
     */
    async processApproval(approvalId, decision, approverNotes = '') {
        return await this.governance.processApproval(approvalId, decision, approverNotes);
    }
}

// Singleton instance
let builderInstance = null;

function getPhoenixBuilderSpace() {
    if (!builderInstance) {
        builderInstance = new PhoenixBuilderSpace();
    }
    return builderInstance;
}

module.exports = {
    PhoenixBuilderSpace,
    getPhoenixBuilderSpace,
    
    // Individual components
    GraphAutomation,
    createGraphAutomation,
    AccountProvisioner,
    createAccountProvisioner,
    PermissionAuditor,
    createPermissionAuditor,
    GovernanceEngine,
    createGovernanceEngine,
    KnowledgeManager,
    createKnowledgeManager,
    WorkflowOrchestrator,
    createWorkflowOrchestrator,
    
    // Configuration
    builderConfig,
    getEnabledModules
};
