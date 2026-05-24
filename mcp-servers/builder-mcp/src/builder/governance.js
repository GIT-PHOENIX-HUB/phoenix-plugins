/**
 * Phoenix Builder Space - Governance Engine
 * 
 * Enforces governance rules, manages approvals, and maintains
 * audit trails for all automation actions.
 */

const { builderConfig, requiresApproval, getApprovers } = require('./config');

class GovernanceEngine {
    constructor() {
        this.pendingApprovals = new Map();
        this.auditLog = [];
    }

    /**
     * Validate all governance rules are properly configured
     */
    async validateRules() {
        const issues = [];

        // Check master control owner is defined
        if (!builderConfig.governance.masterControlOwner.email) {
            issues.push('Master control owner email not configured');
        }

        // Check Key Vault is configured
        if (!builderConfig.azure.keyVault.name && !builderConfig.azure.keyVault.uri) {
            issues.push('Azure Key Vault not configured - secrets cannot be stored securely');
        }

        // Validate golden rules are enabled
        if (!builderConfig.goldenRules.noAutoExternalEmail) {
            issues.push('WARNING: External email auto-send prevention is disabled');
        }

        if (!builderConfig.goldenRules.noSecretsInCode) {
            issues.push('WARNING: Secret protection rule is disabled');
        }

        if (issues.length > 0) {
            console.warn('Governance validation issues:', issues);
        }

        return {
            valid: issues.filter(i => !i.startsWith('WARNING')).length === 0,
            issues
        };
    }

    /**
     * Check if an action is approved
     */
    async checkApproval(actionType, details) {
        // Check if action requires approval
        if (!requiresApproval(actionType)) {
            return { approved: true, reason: 'No approval required' };
        }

        // Check for existing approval
        const approvalKey = this.generateApprovalKey(actionType, details);
        const existingApproval = this.pendingApprovals.get(approvalKey);

        if (existingApproval && existingApproval.status === 'approved') {
            // Check if approval is still valid (within 24 hours)
            const approvalAge = Date.now() - existingApproval.approvedAt;
            if (approvalAge < 24 * 60 * 60 * 1000) {
                return { 
                    approved: true, 
                    approvalId: existingApproval.id,
                    approvedBy: existingApproval.approvedBy 
                };
            }
        }

        // No valid approval found
        return {
            approved: false,
            reason: 'Approval required',
            requiredApprovers: getApprovers(actionType),
            id: existingApproval?.id || null
        };
    }

    /**
     * Check workflow-specific approval
     */
    async checkWorkflowApproval(workflowId, params) {
        // High-risk workflows always need approval
        const highRiskWorkflows = ['delete_users', 'modify_governance', 'bulk_license_change'];
        
        if (highRiskWorkflows.includes(workflowId)) {
            return this.checkApproval('workflow_high_risk', { workflowId, params });
        }

        return { approved: true };
    }

    /**
     * Request approval for an action
     */
    async requestApproval(actionType, details) {
        const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const approvers = getApprovers(actionType);

        const approval = {
            id: approvalId,
            actionType,
            details,
            requestedAt: new Date().toISOString(),
            requestedBy: details.requestedBy || 'system',
            status: 'pending',
            requiredApprovers: approvers,
            approvals: [],
            rejections: []
        };

        const approvalKey = this.generateApprovalKey(actionType, details);
        this.pendingApprovals.set(approvalKey, approval);

        // Log the request
        await this.logEvent('approval_requested', {
            approvalId,
            actionType,
            approvers
        });

        // In production, this would send notifications to approvers
        console.log(`Approval requested: ${approvalId} for ${actionType}`);
        console.log(`Required approvers: ${approvers.join(', ')}`);

        return {
            approvalId,
            status: 'pending',
            requiredApprovers: approvers,
            message: 'Approval request submitted'
        };
    }

    /**
     * Process an approval decision
     */
    async processApproval(approvalId, decision, approverNotes = '') {
        // Find the approval
        let approval = null;
        let approvalKey = null;

        for (const [key, value] of this.pendingApprovals) {
            if (value.id === approvalId) {
                approval = value;
                approvalKey = key;
                break;
            }
        }

        if (!approval) {
            return { success: false, error: 'Approval not found' };
        }

        if (approval.status !== 'pending') {
            return { success: false, error: `Approval already ${approval.status}` };
        }

        const decisionRecord = {
            decision,
            approver: approverNotes.approver || builderConfig.governance.masterControlOwner.email,
            timestamp: new Date().toISOString(),
            notes: approverNotes
        };

        if (decision === 'approve') {
            approval.approvals.push(decisionRecord);
            approval.status = 'approved';
            approval.approvedAt = Date.now();
            approval.approvedBy = decisionRecord.approver;
        } else {
            approval.rejections.push(decisionRecord);
            approval.status = 'rejected';
            approval.rejectedAt = Date.now();
            approval.rejectedBy = decisionRecord.approver;
        }

        this.pendingApprovals.set(approvalKey, approval);

        // Log the decision
        await this.logEvent(`approval_${decision}d`, {
            approvalId,
            actionType: approval.actionType,
            approver: decisionRecord.approver
        });

        return {
            success: true,
            approvalId,
            status: approval.status,
            message: `Approval ${decision}d`
        };
    }

    /**
     * Log an audit event
     */
    async logEvent(eventType, details) {
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            eventType,
            details,
            source: 'PhoenixBuilderSpace'
        };

        this.auditLog.push(event);

        // In production, also write to SharePoint list
        if (builderConfig.governance.auditLog.logToSharePoint) {
            try {
                await this.writeToSharePointAuditLog(event);
            } catch (error) {
                console.error('Failed to write to SharePoint audit log:', error.message);
            }
        }

        // Console log for visibility
        console.log(`[AUDIT] ${eventType}: ${JSON.stringify(details)}`);

        return event;
    }

    /**
     * Write event to SharePoint audit list
     */
    async writeToSharePointAuditLog(event) {
        // This would use Graph API to write to SharePoint list
        // For now, just structure the data
        const listItem = {
            Title: event.eventType,
            EventId: event.id,
            Timestamp: event.timestamp,
            Details: JSON.stringify(event.details),
            Source: event.source
        };

        // Would call: await graph.addListItem(siteId, 'GovernanceAuditLog', listItem);
        return listItem;
    }

    /**
     * Get current governance status
     */
    async getStatus() {
        const pendingApprovalsList = Array.from(this.pendingApprovals.values())
            .filter(a => a.status === 'pending');

        return {
            rulesValidation: await this.validateRules(),
            pendingApprovals: pendingApprovalsList.length,
            pendingApprovalDetails: pendingApprovalsList.map(a => ({
                id: a.id,
                actionType: a.actionType,
                requestedAt: a.requestedAt,
                requiredApprovers: a.requiredApprovers
            })),
            recentAuditEvents: this.auditLog.slice(-20),
            goldenRulesStatus: {
                noAutoExternalEmail: builderConfig.goldenRules.noAutoExternalEmail,
                noSecretsInCode: builderConfig.goldenRules.noSecretsInCode,
                noAutoDelete: builderConfig.goldenRules.noAutoDelete
            },
            masterControlOwner: builderConfig.governance.masterControlOwner.email,
            pimEnabled: builderConfig.governance.pim.enabled
        };
    }

    /**
     * Test Key Vault connection
     */
    async testKeyVaultConnection() {
        // In production, this would use Azure SDK to test Key Vault access
        const keyVaultName = builderConfig.azure.keyVault.name;
        
        if (!keyVaultName) {
            throw new Error('Key Vault not configured');
        }

        // Placeholder for actual Key Vault test
        console.log(`Key Vault configured: ${keyVaultName}`);
        return { connected: true, vaultName: keyVaultName };
    }

    /**
     * Generate a unique key for an approval request
     */
    generateApprovalKey(actionType, details) {
        const detailsHash = JSON.stringify(details);
        return `${actionType}_${Buffer.from(detailsHash).toString('base64').substr(0, 20)}`;
    }

    /**
     * Check golden rule compliance
     */
    checkGoldenRuleCompliance(action) {
        const violations = [];

        // Check external email rule
        if (action.type === 'send_email' && action.isExternal) {
            if (builderConfig.goldenRules.noAutoExternalEmail) {
                violations.push({
                    rule: 'noAutoExternalEmail',
                    message: 'Automated external emails are not allowed without approval'
                });
            }
        }

        // Check delete rule
        if (action.type === 'delete' && builderConfig.goldenRules.noAutoDelete) {
            violations.push({
                rule: 'noAutoDelete',
                message: 'Automated deletions require explicit approval'
            });
        }

        return {
            compliant: violations.length === 0,
            violations
        };
    }

    /**
     * Get audit events for a specific date range
     */
    getAuditEvents(startDate, endDate, eventType = null) {
        let events = this.auditLog.filter(e => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });

        if (eventType) {
            events = events.filter(e => e.eventType === eventType);
        }

        return events;
    }

    /**
     * Generate governance compliance report
     */
    generateComplianceReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            goldenRules: builderConfig.goldenRules,
            pimConfiguration: {
                enabled: builderConfig.governance.pim.enabled,
                requiredForRoles: builderConfig.governance.pim.requiredForRoles,
                maxActivationDuration: builderConfig.governance.pim.maxActivationDurationHours
            },
            approvalRequirements: builderConfig.governance.approvalRequirements,
            recentActivity: {
                totalEvents: this.auditLog.length,
                last24Hours: this.auditLog.filter(e => 
                    Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
                ).length,
                pendingApprovals: Array.from(this.pendingApprovals.values())
                    .filter(a => a.status === 'pending').length
            }
        };

        return report;
    }
}

// Factory function
function createGovernanceEngine() {
    return new GovernanceEngine();
}

module.exports = { GovernanceEngine, createGovernanceEngine };
