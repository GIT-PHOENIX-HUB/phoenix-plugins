/**
 * MCP Approval Widgets
 * 
 * Generates approval UI widgets for ChatGPT Apps SDK.
 * Two-step approval: diff display + confirm button.
 */

class ApprovalWidgets {
    constructor(config = {}) {
        this.config = {
            sharePointLogPath: config.sharePointLogPath || '/Shared Documents/99_Logs',
            ...config
        };

        // Pending approvals cache
        this.pendingApprovals = new Map();
    }

    /**
     * Create a new approval request
     */
    createApprovalRequest(tool, parameters, userId, correlationId) {
        const approvalId = `approval_${correlationId}_${Date.now()}`;
        
        const approval = {
            id: approvalId,
            tool: tool.name,
            toolDescription: tool.description,
            category: tool.category,
            parameters,
            requestedBy: userId,
            requestedAt: new Date().toISOString(),
            correlationId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        this.pendingApprovals.set(approvalId, approval);

        return {
            approvalId,
            approval,
            widget: this.generateApprovalWidget(approval)
        };
    }

    /**
     * Generate the approval widget HTML/JSON for ChatGPT Apps SDK
     */
    generateApprovalWidget(approval) {
        return {
            type: 'phoenix_approval',
            version: '1.0',
            approvalId: approval.id,
            
            // Header
            header: {
                title: `Approval Required: ${approval.tool}`,
                subtitle: approval.toolDescription,
                icon: this._getCategoryIcon(approval.category),
                timestamp: approval.requestedAt
            },

            // Diff/Preview section
            preview: {
                type: 'diff',
                title: 'Proposed Changes',
                sections: this._generatePreviewSections(approval)
            },

            // Parameters display
            parameters: {
                title: 'Parameters',
                items: Object.entries(approval.parameters || {}).map(([key, value]) => ({
                    key,
                    value: this._formatParameterValue(value),
                    type: typeof value
                }))
            },

            // Risk assessment
            risk: this._assessRisk(approval),

            // Actions
            actions: [
                {
                    id: 'approve',
                    type: 'primary',
                    label: 'Approve',
                    icon: '✓',
                    confirmationRequired: true,
                    confirmationMessage: 'Are you sure you want to approve this action?'
                },
                {
                    id: 'reject',
                    type: 'danger',
                    label: 'Reject',
                    icon: '✗',
                    requiresReason: true
                },
                {
                    id: 'modify',
                    type: 'secondary',
                    label: 'Modify',
                    icon: '✎',
                    opensEditor: true
                },
                {
                    id: 'defer',
                    type: 'secondary',
                    label: 'Decide Later',
                    icon: '⏰'
                }
            ],

            // Metadata
            metadata: {
                expiresAt: approval.expiresAt,
                correlationId: approval.correlationId,
                requestedBy: approval.requestedBy
            }
        };
    }

    /**
     * Generate preview sections for the diff view
     */
    _generatePreviewSections(approval) {
        const sections = [];

        switch (approval.tool) {
            case 'assignNearestTechnician':
                sections.push({
                    title: 'Job Assignment',
                    before: {
                        label: 'Current State',
                        content: 'Job unassigned or assigned to different technician'
                    },
                    after: {
                        label: 'After Approval',
                        content: `Job ${approval.parameters.jobId} will be assigned to nearest available technician`
                    }
                });
                break;

            case 'createQuoteDraft':
                sections.push({
                    title: 'Quote Creation',
                    items: approval.parameters.items?.map(item => ({
                        name: item.name || item.description,
                        quantity: item.quantity || 1,
                        price: item.price
                    })) || []
                });
                break;

            case 'bookJob':
                sections.push({
                    title: 'New Job',
                    details: [
                        { label: 'Customer', value: approval.parameters.customerId },
                        { label: 'Location', value: approval.parameters.locationId },
                        { label: 'Job Type', value: approval.parameters.jobTypeId },
                        { label: 'Scheduled', value: approval.parameters.scheduledDate }
                    ]
                });
                break;

            case 'provisionUser':
                sections.push({
                    title: 'New User Account',
                    details: [
                        { label: 'Display Name', value: approval.parameters.displayName },
                        { label: 'Email', value: approval.parameters.email },
                        { label: 'Department', value: approval.parameters.department || 'Not specified' },
                        { label: 'Job Title', value: approval.parameters.jobTitle || 'Not specified' }
                    ]
                });
                break;

            default:
                sections.push({
                    title: 'Action Details',
                    content: JSON.stringify(approval.parameters, null, 2)
                });
        }

        return sections;
    }

    /**
     * Assess risk level of the approval
     */
    _assessRisk(approval) {
        let level = 'low';
        const factors = [];

        // Check for high-risk tools
        const highRiskTools = ['provisionUser', 'bookJob', 'createQuoteDraft'];
        if (highRiskTools.includes(approval.tool)) {
            level = 'medium';
            factors.push(`${approval.tool} modifies important business data`);
        }

        // Check for external communication
        if (approval.tool.includes('mail') || approval.tool.includes('email')) {
            if (approval.parameters.to?.some(email => !email.endsWith('@phoenixelectric.life'))) {
                level = 'high';
                factors.push('Action involves external email recipients');
            }
        }

        // Check for financial impact
        if (approval.parameters.price || approval.parameters.amount || approval.parameters.total) {
            const amount = approval.parameters.price || approval.parameters.amount || approval.parameters.total;
            if (amount > 1000) {
                level = 'medium';
                factors.push(`Financial impact: $${amount}`);
            }
            if (amount > 10000) {
                level = 'high';
            }
        }

        return {
            level,
            color: level === 'high' ? 'red' : level === 'medium' ? 'yellow' : 'green',
            factors,
            recommendation: level === 'high' 
                ? 'Review carefully before approving'
                : level === 'medium'
                    ? 'Standard approval recommended'
                    : 'Safe to approve'
        };
    }

    /**
     * Get icon for category
     */
    _getCategoryIcon(category) {
        const icons = {
            servicetitan: '🔧',
            graph: '📧',
            courier: '📬',
            builder: '🏗️',
            finance: '💰'
        };
        return icons[category] || '⚡';
    }

    /**
     * Format parameter value for display
     */
    _formatParameterValue(value) {
        if (value === null || value === undefined) return 'Not specified';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Process an approval action
     */
    async processApprovalAction(approvalId, action, userId, reason = null) {
        const approval = this.pendingApprovals.get(approvalId);
        
        if (!approval) {
            return {
                success: false,
                error: 'Approval not found or expired'
            };
        }

        if (approval.status !== 'pending') {
            return {
                success: false,
                error: `Approval already ${approval.status}`
            };
        }

        // Update approval status
        approval.status = action; // 'approved', 'rejected', 'deferred'
        approval.processedBy = userId;
        approval.processedAt = new Date().toISOString();
        approval.reason = reason;

        // Generate audit log entry
        const auditEntry = this._generateAuditEntry(approval);

        return {
            success: true,
            approval,
            auditEntry,
            shouldExecute: action === 'approved'
        };
    }

    /**
     * Generate audit log entry for SharePoint
     */
    _generateAuditEntry(approval) {
        return {
            timestamp: new Date().toISOString(),
            type: 'approval_decision',
            approvalId: approval.id,
            tool: approval.tool,
            action: approval.status,
            requestedBy: approval.requestedBy,
            processedBy: approval.processedBy,
            reason: approval.reason,
            correlationId: approval.correlationId,
            parameters: approval.parameters
        };
    }

    /**
     * Get pending approvals for a user
     */
    getPendingApprovals(userId = null) {
        const pending = [];
        
        for (const [id, approval] of this.pendingApprovals) {
            if (approval.status === 'pending') {
                if (!userId || approval.requestedBy === userId) {
                    pending.push(approval);
                }
            }
        }

        return pending.sort((a, b) => 
            new Date(b.requestedAt) - new Date(a.requestedAt)
        );
    }

    /**
     * Clean up expired approvals
     */
    cleanupExpired() {
        const now = new Date();
        let cleaned = 0;

        for (const [id, approval] of this.pendingApprovals) {
            if (new Date(approval.expiresAt) < now) {
                approval.status = 'expired';
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Generate confirmation widget after approval
     */
    generateConfirmationWidget(approval, result) {
        return {
            type: 'phoenix_confirmation',
            status: approval.status,
            title: approval.status === 'approved' 
                ? `✓ ${approval.tool} Approved`
                : `✗ ${approval.tool} ${approval.status}`,
            details: {
                tool: approval.tool,
                processedAt: approval.processedAt,
                processedBy: approval.processedBy,
                result: result?.success ? 'Executed successfully' : result?.error || 'Not executed'
            },
            auditLink: `${this.config.sharePointLogPath}/approvals/${approval.id}.json`
        };
    }
}

module.exports = { ApprovalWidgets };
