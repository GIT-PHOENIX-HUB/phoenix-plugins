/**
 * Phoenix Builder Space - Workflow Orchestrator
 * 
 * Manages and executes automation workflows.
 * Integrates with GitHub Actions and Azure resources.
 */

const { createGovernanceEngine } = require('./governance');
const { builderConfig } = require('./config');

class WorkflowOrchestrator {
    constructor() {
        this.governance = createGovernanceEngine();
        this.workflowRegistry = new Map();
        this.executionHistory = [];
        
        // Register built-in workflows
        this.registerBuiltInWorkflows();
    }

    /**
     * Register built-in workflows
     */
    registerBuiltInWorkflows() {
        // User onboarding workflow
        this.registerWorkflow({
            id: 'user_onboard',
            name: 'User Onboarding',
            description: 'Complete onboarding for a new employee',
            category: 'identity',
            triggers: ['manual', 'webhook'],
            requiredParams: ['displayName', 'email', 'department'],
            optionalParams: ['manager', 'licenses', 'groups'],
            steps: [
                'create_account',
                'assign_licenses',
                'add_to_groups',
                'setup_mailbox',
                'send_welcome_email'
            ],
            approvalRequired: false,
            estimatedDuration: '5 minutes'
        });

        // User offboarding workflow
        this.registerWorkflow({
            id: 'user_offboard',
            name: 'User Offboarding',
            description: 'Complete offboarding for a departing employee',
            category: 'identity',
            triggers: ['manual'],
            requiredParams: ['userId'],
            optionalParams: ['managerEmail', 'archiveOneDrive'],
            steps: [
                'disable_account',
                'remove_licenses',
                'remove_from_groups',
                'convert_mailbox',
                'archive_data',
                'notify_manager'
            ],
            approvalRequired: true,
            estimatedDuration: '10 minutes'
        });

        // Permission audit workflow
        this.registerWorkflow({
            id: 'permission_audit',
            name: 'Permission Audit',
            description: 'Run comprehensive permission audit',
            category: 'security',
            triggers: ['manual', 'scheduled'],
            requiredParams: [],
            optionalParams: ['scopes', 'reportFormat'],
            steps: [
                'audit_admin_roles',
                'audit_pim',
                'audit_app_permissions',
                'detect_anomalies',
                'generate_report',
                'notify_admins'
            ],
            approvalRequired: false,
            estimatedDuration: '15 minutes'
        });

        // License audit workflow
        this.registerWorkflow({
            id: 'license_audit',
            name: 'License Audit',
            description: 'Audit license usage and availability',
            category: 'operations',
            triggers: ['manual', 'scheduled'],
            requiredParams: [],
            optionalParams: [],
            steps: [
                'get_license_inventory',
                'check_unused_licenses',
                'identify_optimization',
                'generate_report'
            ],
            approvalRequired: false,
            estimatedDuration: '5 minutes'
        });

        // Email triage workflow
        this.registerWorkflow({
            id: 'email_triage',
            name: 'Email Triage',
            description: 'Process incoming emails in configured mailboxes',
            category: 'operations',
            triggers: ['manual', 'scheduled'],
            requiredParams: [],
            optionalParams: ['mailboxes', 'filterRules'],
            steps: [
                'fetch_unread_emails',
                'filter_spam',
                'save_attachments',
                'generate_draft_replies',
                'flag_urgent',
                'mark_processed'
            ],
            approvalRequired: false,
            estimatedDuration: '10 minutes'
        });

        // Knowledge sync workflow
        this.registerWorkflow({
            id: 'knowledge_sync',
            name: 'Knowledge Base Sync',
            description: 'Sync knowledge base to SharePoint',
            category: 'documentation',
            triggers: ['manual', 'scheduled'],
            requiredParams: [],
            optionalParams: ['categories'],
            steps: [
                'scan_repository',
                'update_index',
                'sync_to_sharepoint',
                'update_search'
            ],
            approvalRequired: false,
            estimatedDuration: '5 minutes'
        });
    }

    /**
     * Register a new workflow
     */
    registerWorkflow(workflow) {
        const workflowWithDefaults = {
            ...workflow,
            createdAt: new Date().toISOString(),
            enabled: true,
            executionCount: 0,
            lastExecution: null
        };

        this.workflowRegistry.set(workflow.id, workflowWithDefaults);
        return workflowWithDefaults;
    }

    /**
     * Get all available workflows
     */
    getAvailableWorkflows() {
        const workflows = [];

        for (const [id, workflow] of this.workflowRegistry) {
            if (workflow.enabled) {
                workflows.push({
                    id,
                    name: workflow.name,
                    description: workflow.description,
                    category: workflow.category,
                    triggers: workflow.triggers,
                    requiredParams: workflow.requiredParams,
                    optionalParams: workflow.optionalParams,
                    approvalRequired: workflow.approvalRequired,
                    estimatedDuration: workflow.estimatedDuration,
                    lastExecution: workflow.lastExecution
                });
            }
        }

        return workflows;
    }

    /**
     * Execute a workflow
     */
    async execute(workflowId, params = {}) {
        const workflow = this.workflowRegistry.get(workflowId);

        if (!workflow) {
            return {
                success: false,
                error: `Workflow not found: ${workflowId}`
            };
        }

        if (!workflow.enabled) {
            return {
                success: false,
                error: `Workflow is disabled: ${workflowId}`
            };
        }

        // Validate required parameters
        const missingParams = workflow.requiredParams.filter(p => !params[p]);
        if (missingParams.length > 0) {
            return {
                success: false,
                error: `Missing required parameters: ${missingParams.join(', ')}`
            };
        }

        // Create execution record
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const execution = {
            executionId,
            workflowId,
            workflowName: workflow.name,
            params,
            startedAt: new Date().toISOString(),
            status: 'running',
            steps: [],
            result: null
        };

        this.executionHistory.push(execution);

        try {
            // Log start
            await this.governance.logEvent('workflow_started', {
                executionId,
                workflowId,
                workflowName: workflow.name
            });

            // Execute steps
            for (const step of workflow.steps) {
                const stepStart = Date.now();
                
                execution.steps.push({
                    name: step,
                    status: 'running',
                    startedAt: new Date().toISOString()
                });

                try {
                    // Execute step (placeholder - actual implementation would call specific handlers)
                    await this.executeStep(workflowId, step, params);
                    
                    const stepRecord = execution.steps.find(s => s.name === step);
                    stepRecord.status = 'completed';
                    stepRecord.completedAt = new Date().toISOString();
                    stepRecord.duration = Date.now() - stepStart;
                } catch (stepError) {
                    const stepRecord = execution.steps.find(s => s.name === step);
                    stepRecord.status = 'failed';
                    stepRecord.error = stepError.message;
                    throw stepError;
                }
            }

            // Mark complete
            execution.status = 'completed';
            execution.completedAt = new Date().toISOString();
            execution.result = { success: true };

            // Update workflow stats
            workflow.executionCount++;
            workflow.lastExecution = execution.completedAt;

            // Log completion
            await this.governance.logEvent('workflow_completed', {
                executionId,
                workflowId,
                duration: Date.now() - new Date(execution.startedAt).getTime()
            });

            return {
                success: true,
                executionId,
                status: 'completed',
                steps: execution.steps
            };

        } catch (error) {
            execution.status = 'failed';
            execution.completedAt = new Date().toISOString();
            execution.result = { success: false, error: error.message };

            await this.governance.logEvent('workflow_failed', {
                executionId,
                workflowId,
                error: error.message
            });

            return {
                success: false,
                executionId,
                status: 'failed',
                error: error.message,
                steps: execution.steps
            };
        }
    }

    /**
     * Execute a single workflow step
     */
    async executeStep(workflowId, step, params) {
        // This would dispatch to specific step handlers
        // For now, simulate step execution
        console.log(`Executing step: ${step} for workflow: ${workflowId}`);
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));

        return { step, status: 'completed' };
    }

    /**
     * Get workflow execution history
     */
    async getHistory(workflowId = null, limit = 50) {
        let history = [...this.executionHistory];

        if (workflowId) {
            history = history.filter(e => e.workflowId === workflowId);
        }

        // Sort by start time descending
        history.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

        return history.slice(0, limit);
    }

    /**
     * Get execution details
     */
    getExecution(executionId) {
        return this.executionHistory.find(e => e.executionId === executionId);
    }

    /**
     * Cancel a running workflow
     */
    async cancelExecution(executionId) {
        const execution = this.executionHistory.find(e => e.executionId === executionId);

        if (!execution) {
            return { success: false, error: 'Execution not found' };
        }

        if (execution.status !== 'running') {
            return { success: false, error: `Cannot cancel execution with status: ${execution.status}` };
        }

        execution.status = 'cancelled';
        execution.completedAt = new Date().toISOString();

        await this.governance.logEvent('workflow_cancelled', {
            executionId,
            workflowId: execution.workflowId
        });

        return { success: true, executionId, status: 'cancelled' };
    }

    /**
     * Enable/disable a workflow
     */
    setWorkflowEnabled(workflowId, enabled) {
        const workflow = this.workflowRegistry.get(workflowId);

        if (!workflow) {
            return { success: false, error: 'Workflow not found' };
        }

        workflow.enabled = enabled;
        return { success: true, workflowId, enabled };
    }

    /**
     * Get workflow statistics
     */
    getStatistics() {
        const stats = {
            totalWorkflows: this.workflowRegistry.size,
            enabledWorkflows: 0,
            totalExecutions: this.executionHistory.length,
            successfulExecutions: 0,
            failedExecutions: 0,
            byCategory: {},
            recentExecutions: []
        };

        // Count enabled workflows and categorize
        for (const [id, workflow] of this.workflowRegistry) {
            if (workflow.enabled) stats.enabledWorkflows++;
            
            if (!stats.byCategory[workflow.category]) {
                stats.byCategory[workflow.category] = 0;
            }
            stats.byCategory[workflow.category]++;
        }

        // Count execution outcomes
        for (const execution of this.executionHistory) {
            if (execution.status === 'completed') stats.successfulExecutions++;
            if (execution.status === 'failed') stats.failedExecutions++;
        }

        // Get recent executions
        stats.recentExecutions = this.executionHistory
            .slice(-10)
            .reverse()
            .map(e => ({
                executionId: e.executionId,
                workflowId: e.workflowId,
                workflowName: e.workflowName,
                status: e.status,
                startedAt: e.startedAt
            }));

        return stats;
    }

    /**
     * Create GitHub Actions workflow YAML
     */
    generateGitHubActionsYAML(workflowId) {
        const workflow = this.workflowRegistry.get(workflowId);

        if (!workflow) {
            return null;
        }

        const yaml = `
name: ${workflow.name}

on:
  workflow_dispatch:
    inputs:
${workflow.requiredParams.map(p => `      ${p}:
        description: '${p}'
        required: true`).join('\n')}
${workflow.optionalParams.map(p => `      ${p}:
        description: '${p}'
        required: false`).join('\n')}
${workflow.triggers.includes('scheduled') ? `  schedule:
    - cron: '0 0 * * *'  # Daily at midnight` : ''}

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Execute workflow
        env:
          AZURE_TENANT_ID: \${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: \${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: \${{ secrets.AZURE_CLIENT_SECRET }}
        run: |
          node -e "
            const { getPhoenixBuilderSpace } = require('./src/builder');
            const builder = getPhoenixBuilderSpace();
            builder.executeWorkflow('${workflowId}', {
${workflow.requiredParams.map(p => `              ${p}: '\${{ github.event.inputs.${p} }}'`).join(',\n')}
            }).then(console.log);
          "
`.trim();

        return yaml;
    }
}

// Factory function
function createWorkflowOrchestrator() {
    return new WorkflowOrchestrator();
}

module.exports = { WorkflowOrchestrator, createWorkflowOrchestrator };
