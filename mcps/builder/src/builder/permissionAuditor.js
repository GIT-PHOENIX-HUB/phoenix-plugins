/**
 * Phoenix Builder Space - Permission Auditor
 * 
 * Audits permissions across Azure AD, Microsoft 365, and SharePoint.
 * Tracks admin roles, PIM activations, and identifies anomalies.
 */

const { createGraphAutomation } = require('./graphAutomation');
const { createGovernanceEngine } = require('./governance');
const { builderConfig } = require('./config');

class PermissionAuditor {
    constructor() {
        this.graph = createGraphAutomation();
        this.governance = createGovernanceEngine();
    }

    /**
     * Run a full permission audit across all scopes
     */
    async runFullAudit() {
        const auditId = `audit_${Date.now()}`;
        const results = {
            auditId,
            timestamp: new Date().toISOString(),
            scopes: {},
            anomalies: [],
            summary: {}
        };

        console.log(`Starting permission audit: ${auditId}`);

        const scopes = builderConfig.modules.permissionAuditing.auditScopes;

        // Audit admin roles
        if (scopes.includes('admin_roles')) {
            results.scopes.adminRoles = await this.auditAdminRoles();
        }

        // Audit PIM assignments
        if (scopes.includes('pim_assignments')) {
            results.scopes.pimAssignments = await this.auditPIMAssignments();
        }

        // Audit app permissions
        if (scopes.includes('app_permissions')) {
            results.scopes.appPermissions = await this.auditAppPermissions();
        }

        // Check for anomalies
        results.anomalies = await this.detectAnomalies(results.scopes);

        // Generate summary
        results.summary = this.generateAuditSummary(results);

        // Log the audit
        await this.governance.logEvent('permission_audit_completed', {
            auditId,
            scopesAudited: Object.keys(results.scopes).length,
            anomaliesFound: results.anomalies.length
        });

        // Save audit report
        await this.saveAuditReport(results);

        return results;
    }

    /**
     * Audit all admin role assignments
     */
    async auditAdminRoles() {
        const result = {
            roles: [],
            totalAdmins: 0,
            roleBreakdown: {}
        };

        try {
            // Get all directory roles
            const rolesResponse = await this.graph.getDirectoryRoles();
            const roles = rolesResponse.value || [];

            for (const role of roles) {
                // Get members of each role
                const membersResponse = await this.graph.getDirectoryRoleMembers(role.id);
                const members = membersResponse.value || [];

                if (members.length > 0) {
                    const roleData = {
                        roleId: role.id,
                        roleName: role.displayName,
                        roleDescription: role.description,
                        memberCount: members.length,
                        members: members.map(m => ({
                            id: m.id,
                            displayName: m.displayName,
                            userPrincipalName: m.userPrincipalName
                        }))
                    };

                    result.roles.push(roleData);
                    result.roleBreakdown[role.displayName] = members.length;
                }
            }

            // Calculate total unique admins
            const uniqueAdmins = new Set();
            result.roles.forEach(role => {
                role.members.forEach(member => uniqueAdmins.add(member.id));
            });
            result.totalAdmins = uniqueAdmins.size;

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    /**
     * Audit PIM role assignments
     */
    async auditPIMAssignments() {
        const result = {
            eligibleAssignments: [],
            activeAssignments: [],
            recentActivations: []
        };

        try {
            const client = await this.graph.getClient();

            // Get eligible role assignments (PIM)
            // Note: This requires the beta API
            const eligibleResponse = await client
                .api('/roleManagement/directory/roleEligibilityScheduleInstances')
                .version('beta')
                .get();

            result.eligibleAssignments = (eligibleResponse.value || []).map(assignment => ({
                principalId: assignment.principalId,
                roleDefinitionId: assignment.roleDefinitionId,
                startDateTime: assignment.startDateTime,
                endDateTime: assignment.endDateTime
            }));

            // Get active role assignments
            const activeResponse = await client
                .api('/roleManagement/directory/roleAssignmentScheduleInstances')
                .version('beta')
                .get();

            result.activeAssignments = (activeResponse.value || []).map(assignment => ({
                principalId: assignment.principalId,
                roleDefinitionId: assignment.roleDefinitionId,
                assignmentType: assignment.assignmentType,
                startDateTime: assignment.startDateTime,
                endDateTime: assignment.endDateTime
            }));

        } catch (error) {
            result.error = error.message;
            result.note = 'PIM auditing requires Azure AD Premium P2 and appropriate permissions';
        }

        return result;
    }

    /**
     * Audit application permissions
     */
    async auditAppPermissions() {
        const result = {
            applications: [],
            highPrivilegeApps: []
        };

        const highPrivilegePermissions = [
            'Directory.ReadWrite.All',
            'Mail.ReadWrite',
            'Mail.Send',
            'Sites.ReadWrite.All',
            'User.ReadWrite.All',
            'RoleManagement.ReadWrite.Directory'
        ];

        try {
            const client = await this.graph.getClient();

            // Get all application registrations
            const appsResponse = await client
                .api('/applications')
                .select('id,displayName,appId,requiredResourceAccess,createdDateTime')
                .get();

            const apps = appsResponse.value || [];

            for (const app of apps) {
                const appData = {
                    id: app.id,
                    appId: app.appId,
                    displayName: app.displayName,
                    createdDateTime: app.createdDateTime,
                    permissions: []
                };

                // Extract permissions
                if (app.requiredResourceAccess) {
                    for (const resource of app.requiredResourceAccess) {
                        for (const access of resource.resourceAccess || []) {
                            appData.permissions.push({
                                resourceAppId: resource.resourceAppId,
                                type: access.type,
                                id: access.id
                            });
                        }
                    }
                }

                result.applications.push(appData);

                // Check for high privilege permissions
                // Note: Would need to map permission IDs to names in production
                if (appData.permissions.some(p => p.type === 'Role')) {
                    result.highPrivilegeApps.push({
                        appId: app.appId,
                        displayName: app.displayName,
                        permissionCount: appData.permissions.filter(p => p.type === 'Role').length
                    });
                }
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    /**
     * Get all users with admin roles
     */
    async getAdminRoleMembers() {
        const adminRoles = await this.auditAdminRoles();
        
        // Flatten to unique users with their roles
        const userRoles = new Map();

        for (const role of adminRoles.roles) {
            for (const member of role.members) {
                if (!userRoles.has(member.id)) {
                    userRoles.set(member.id, {
                        ...member,
                        roles: []
                    });
                }
                userRoles.get(member.id).roles.push(role.roleName);
            }
        }

        return Array.from(userRoles.values());
    }

    /**
     * Get PIM activation history
     */
    async getPIMActivations(days = 30) {
        try {
            const client = await this.graph.getClient();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Get audit logs for PIM activations
            const auditResponse = await client
                .api('/auditLogs/directoryAudits')
                .filter(`activityDateTime ge ${startDate.toISOString()} and category eq 'RoleManagement'`)
                .top(100)
                .orderby('activityDateTime desc')
                .get();

            return (auditResponse.value || []).map(log => ({
                id: log.id,
                activityDateTime: log.activityDateTime,
                activityDisplayName: log.activityDisplayName,
                initiatedBy: log.initiatedBy?.user?.displayName || 'Unknown',
                targetResources: log.targetResources?.map(r => r.displayName) || []
            }));

        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Check for stale admin accounts
     */
    async checkStaleAccounts(inactiveDays = 90) {
        const staleAccounts = [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

        try {
            const adminUsers = await this.getAdminRoleMembers();
            const client = await this.graph.getClient();

            for (const admin of adminUsers) {
                // Get sign-in activity
                const userResponse = await client
                    .api(`/users/${admin.id}`)
                    .select('signInActivity')
                    .get();

                const lastSignIn = userResponse.signInActivity?.lastSignInDateTime;
                
                if (!lastSignIn || new Date(lastSignIn) < cutoffDate) {
                    staleAccounts.push({
                        userId: admin.id,
                        displayName: admin.displayName,
                        userPrincipalName: admin.userPrincipalName,
                        roles: admin.roles,
                        lastSignIn: lastSignIn || 'Never',
                        daysSinceSignIn: lastSignIn 
                            ? Math.floor((Date.now() - new Date(lastSignIn)) / (1000 * 60 * 60 * 24))
                            : 'N/A'
                    });
                }
            }

        } catch (error) {
            return { error: error.message, staleAccounts: [] };
        }

        return staleAccounts;
    }

    /**
     * Detect anomalies in the audit results
     */
    async detectAnomalies(scopes) {
        const anomalies = [];
        const thresholds = builderConfig.modules.permissionAuditing.anomalyThresholds;

        // Check for too many global admins
        if (scopes.adminRoles) {
            const globalAdmins = scopes.adminRoles.roles.find(r => 
                r.roleName === 'Global Administrator'
            );
            
            if (globalAdmins && globalAdmins.memberCount > 5) {
                anomalies.push({
                    type: 'excessive_global_admins',
                    severity: 'high',
                    message: `Found ${globalAdmins.memberCount} Global Administrators (recommended: 2-4)`,
                    data: globalAdmins.members.map(m => m.displayName)
                });
            }
        }

        // Check for high privilege apps
        if (scopes.appPermissions) {
            const highPrivApps = scopes.appPermissions.highPrivilegeApps || [];
            
            if (highPrivApps.length > thresholds.excessivePermissionCount) {
                anomalies.push({
                    type: 'many_high_privilege_apps',
                    severity: 'medium',
                    message: `Found ${highPrivApps.length} applications with high-privilege permissions`,
                    data: highPrivApps.map(a => a.displayName)
                });
            }
        }

        // Check for stale admin accounts
        const staleAdmins = await this.checkStaleAccounts(thresholds.staleAdminDays);
        if (staleAdmins.length > 0) {
            anomalies.push({
                type: 'stale_admin_accounts',
                severity: 'medium',
                message: `Found ${staleAdmins.length} admin accounts inactive for ${thresholds.staleAdminDays}+ days`,
                data: staleAdmins.map(a => ({
                    name: a.displayName,
                    roles: a.roles,
                    lastSignIn: a.lastSignIn
                }))
            });
        }

        return anomalies;
    }

    /**
     * Generate audit summary
     */
    generateAuditSummary(results) {
        return {
            timestamp: results.timestamp,
            auditId: results.auditId,
            scopesAudited: Object.keys(results.scopes).length,
            totalAdminUsers: results.scopes.adminRoles?.totalAdmins || 0,
            totalAdminRoles: results.scopes.adminRoles?.roles?.length || 0,
            totalApplications: results.scopes.appPermissions?.applications?.length || 0,
            highPrivilegeApps: results.scopes.appPermissions?.highPrivilegeApps?.length || 0,
            anomaliesFound: results.anomalies.length,
            highSeverityAnomalies: results.anomalies.filter(a => a.severity === 'high').length,
            status: results.anomalies.length === 0 ? 'healthy' : 
                    results.anomalies.some(a => a.severity === 'high') ? 'critical' : 'warning'
        };
    }

    /**
     * Save audit report to SharePoint
     */
    async saveAuditReport(results) {
        try {
            const reportContent = JSON.stringify(results, null, 2);
            const fileName = `audit_report_${results.auditId}.json`;
            const folderPath = builderConfig.sharePoint.libraries.reports;

            await this.graph.uploadFile(
                builderConfig.sharePoint.siteId,
                builderConfig.sharePoint.driveId,
                folderPath,
                fileName,
                reportContent
            );

            console.log(`Audit report saved: ${folderPath}/${fileName}`);
        } catch (error) {
            console.error('Failed to save audit report:', error.message);
        }
    }

    /**
     * Generate markdown audit report
     */
    generateMarkdownReport(results) {
        const lines = [
            `# Permission Audit Report`,
            ``,
            `**Audit ID:** ${results.auditId}`,
            `**Date:** ${results.timestamp}`,
            `**Status:** ${results.summary.status.toUpperCase()}`,
            ``,
            `## Summary`,
            ``,
            `| Metric | Value |`,
            `|--------|-------|`,
            `| Total Admin Users | ${results.summary.totalAdminUsers} |`,
            `| Admin Roles in Use | ${results.summary.totalAdminRoles} |`,
            `| Applications Registered | ${results.summary.totalApplications} |`,
            `| High Privilege Apps | ${results.summary.highPrivilegeApps} |`,
            `| Anomalies Found | ${results.summary.anomaliesFound} |`,
            ``
        ];

        if (results.anomalies.length > 0) {
            lines.push(`## Anomalies Detected`, ``);
            
            for (const anomaly of results.anomalies) {
                lines.push(`### ${anomaly.type.replace(/_/g, ' ').toUpperCase()}`);
                lines.push(`**Severity:** ${anomaly.severity}`);
                lines.push(`**Details:** ${anomaly.message}`);
                lines.push(``);
            }
        }

        if (results.scopes.adminRoles) {
            lines.push(`## Admin Role Assignments`, ``);
            lines.push(`| Role | Members |`);
            lines.push(`|------|---------|`);
            
            for (const role of results.scopes.adminRoles.roles) {
                lines.push(`| ${role.roleName} | ${role.memberCount} |`);
            }
            lines.push(``);
        }

        lines.push(`---`);
        lines.push(`*Generated by Phoenix Builder Space Permission Auditor*`);

        return lines.join('\n');
    }
}

// Factory function
function createPermissionAuditor() {
    return new PermissionAuditor();
}

module.exports = { PermissionAuditor, createPermissionAuditor };
