/**
 * Phoenix Builder Space - Graph Automation
 * 
 * Core Microsoft Graph API integration for automating
 * Microsoft 365 operations (users, mail, SharePoint, etc.)
 */

const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { builderConfig } = require('./config');

class GraphAutomation {
    constructor() {
        this.client = null;
        this.credential = null;
        this.tokenCache = {
            token: null,
            expiresAt: null
        };
    }

    /**
     * Get authenticated Graph client
     */
    async getClient() {
        if (this.client) {
            return this.client;
        }

        // Initialize credential
        this.credential = new ClientSecretCredential(
            builderConfig.azure.tenantId,
            builderConfig.azure.automationApp.clientId,
            process.env.GRAPH_CLIENT_SECRET // From Key Vault in production
        );

        // Create Graph client with token provider
        this.client = Client.initWithMiddleware({
            authProvider: {
                getAccessToken: async () => {
                    // Check cache first
                    if (this.tokenCache.token && this.tokenCache.expiresAt > Date.now()) {
                        return this.tokenCache.token;
                    }

                    const tokenResponse = await this.credential.getToken([
                        'https://graph.microsoft.com/.default'
                    ]);
                    
                    this.tokenCache = {
                        token: tokenResponse.token,
                        expiresAt: Date.now() + (tokenResponse.expiresOnTimestamp - 60000)
                    };
                    
                    return tokenResponse.token;
                }
            }
        });

        return this.client;
    }

    /**
     * Test Graph API connection
     */
    async testConnection() {
        const client = await this.getClient();
        const org = await client.api('/organization').get();
        return {
            connected: true,
            tenantId: org.value[0]?.id,
            displayName: org.value[0]?.displayName
        };
    }

    // ==================== USER OPERATIONS ====================

    /**
     * Create a new user in Azure AD
     */
    async createUser(userDetails) {
        const client = await this.getClient();

        const userPayload = {
            accountEnabled: true,
            displayName: userDetails.displayName,
            mailNickname: userDetails.mailNickname || userDetails.displayName.replace(/\s/g, ''),
            userPrincipalName: userDetails.email,
            passwordProfile: {
                forceChangePasswordNextSignIn: true,
                password: userDetails.temporaryPassword || this.generateTempPassword()
            },
            givenName: userDetails.firstName,
            surname: userDetails.lastName,
            jobTitle: userDetails.jobTitle,
            department: userDetails.department,
            officeLocation: userDetails.office,
            mobilePhone: userDetails.mobilePhone,
            usageLocation: userDetails.usageLocation || 'US'
        };

        const user = await client.api('/users').post(userPayload);
        
        return {
            success: true,
            userId: user.id,
            userPrincipalName: user.userPrincipalName,
            temporaryPassword: userPayload.passwordProfile.password
        };
    }

    /**
     * Update user properties
     */
    async updateUser(userId, updates) {
        const client = await this.getClient();
        await client.api(`/users/${userId}`).patch(updates);
        return { success: true, userId };
    }

    /**
     * Disable a user account
     */
    async disableUser(userId) {
        const client = await this.getClient();
        await client.api(`/users/${userId}`).patch({
            accountEnabled: false
        });
        return { success: true, userId, disabled: true };
    }

    /**
     * Get user by ID or UPN
     */
    async getUser(userIdOrUpn) {
        const client = await this.getClient();
        return await client
            .api(`/users/${userIdOrUpn}`)
            .select('id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses,memberOf')
            .expand('memberOf')
            .get();
    }

    /**
     * List all users (with pagination)
     */
    async listUsers(filter = null, top = 100) {
        const client = await this.getClient();
        let request = client
            .api('/users')
            .top(top)
            .select('id,displayName,userPrincipalName,mail,accountEnabled,createdDateTime');

        if (filter) {
            request = request.filter(filter);
        }

        return await request.get();
    }

    // ==================== LICENSE OPERATIONS ====================

    /**
     * Assign licenses to a user
     */
    async assignLicenses(userId, skuIds) {
        const client = await this.getClient();

        const licensePayload = {
            addLicenses: skuIds.map(sku => ({
                skuId: sku,
                disabledPlans: []
            })),
            removeLicenses: []
        };

        await client
            .api(`/users/${userId}/assignLicense`)
            .post(licensePayload);

        return { success: true, userId, licensesAssigned: skuIds };
    }

    /**
     * Remove licenses from a user
     */
    async removeLicenses(userId, skuIds) {
        const client = await this.getClient();

        await client
            .api(`/users/${userId}/assignLicense`)
            .post({
                addLicenses: [],
                removeLicenses: skuIds
            });

        return { success: true, userId, licensesRemoved: skuIds };
    }

    /**
     * Get available licenses in tenant
     */
    async getAvailableLicenses() {
        const client = await this.getClient();
        const result = await client.api('/subscribedSkus').get();
        
        return result.value.map(sku => ({
            skuId: sku.skuId,
            skuPartNumber: sku.skuPartNumber,
            available: sku.prepaidUnits.enabled - sku.consumedUnits,
            total: sku.prepaidUnits.enabled,
            consumed: sku.consumedUnits
        }));
    }

    // ==================== GROUP OPERATIONS ====================

    /**
     * Add user to a group
     */
    async addUserToGroup(userId, groupId) {
        const client = await this.getClient();

        await client
            .api(`/groups/${groupId}/members/$ref`)
            .post({
                '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
            });

        return { success: true, userId, groupId };
    }

    /**
     * Remove user from a group
     */
    async removeUserFromGroup(userId, groupId) {
        const client = await this.getClient();

        await client
            .api(`/groups/${groupId}/members/${userId}/$ref`)
            .delete();

        return { success: true, userId, groupId, removed: true };
    }

    /**
     * Get group members
     */
    async getGroupMembers(groupId) {
        const client = await this.getClient();
        return await client
            .api(`/groups/${groupId}/members`)
            .select('id,displayName,userPrincipalName,mail')
            .get();
    }

    /**
     * List all groups
     */
    async listGroups(filter = null) {
        const client = await this.getClient();
        let request = client
            .api('/groups')
            .select('id,displayName,description,groupTypes,mailEnabled,securityEnabled');

        if (filter) {
            request = request.filter(filter);
        }

        return await request.get();
    }

    // ==================== DIRECTORY ROLES ====================

    /**
     * Get all directory roles
     */
    async getDirectoryRoles() {
        const client = await this.getClient();
        return await client.api('/directoryRoles').get();
    }

    /**
     * Get members of a directory role
     */
    async getDirectoryRoleMembers(roleId) {
        const client = await this.getClient();
        return await client
            .api(`/directoryRoles/${roleId}/members`)
            .select('id,displayName,userPrincipalName')
            .get();
    }

    /**
     * Get all role assignments (for auditing)
     */
    async getRoleAssignments() {
        const client = await this.getClient();
        return await client
            .api('/roleManagement/directory/roleAssignments')
            .expand('principal')
            .get();
    }

    // ==================== MAIL OPERATIONS ====================

    /**
     * Get messages from a mailbox (requires Mail.Read permission + access policy)
     */
    async getMessages(mailbox, filter = null, top = 50) {
        const client = await this.getClient();
        let request = client
            .api(`/users/${mailbox}/messages`)
            .top(top)
            .select('id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments');

        if (filter) {
            request = request.filter(filter);
        }

        return await request.orderby('receivedDateTime desc').get();
    }

    /**
     * Create a draft email (does NOT send - Courier golden rule)
     */
    async createDraft(mailbox, emailDetails) {
        // GOLDEN RULE: Never auto-send external emails
        if (builderConfig.goldenRules.noAutoExternalEmail) {
            console.log('Creating draft only - external email requires approval');
        }

        const client = await this.getClient();

        const message = {
            subject: emailDetails.subject,
            body: {
                contentType: emailDetails.contentType || 'HTML',
                content: emailDetails.body
            },
            toRecipients: emailDetails.to.map(addr => ({
                emailAddress: { address: addr }
            }))
        };

        // Create as draft, NOT send
        return await client
            .api(`/users/${mailbox}/messages`)
            .post(message);
    }

    // ==================== SHAREPOINT OPERATIONS ====================

    /**
     * Get SharePoint site info
     */
    async getSite(siteIdOrUrl) {
        const client = await this.getClient();
        return await client.api(`/sites/${siteIdOrUrl}`).get();
    }

    /**
     * List items in a SharePoint list
     */
    async getListItems(siteId, listName, filter = null) {
        const client = await this.getClient();
        let request = client
            .api(`/sites/${siteId}/lists/${listName}/items`)
            .expand('fields');

        if (filter) {
            request = request.filter(filter);
        }

        return await request.get();
    }

    /**
     * Add item to a SharePoint list
     */
    async addListItem(siteId, listName, fields) {
        const client = await this.getClient();
        return await client
            .api(`/sites/${siteId}/lists/${listName}/items`)
            .post({ fields });
    }

    /**
     * Upload file to SharePoint
     */
    async uploadFile(siteId, driveId, folderPath, fileName, content) {
        const client = await this.getClient();
        const uploadPath = driveId
            ? `/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${fileName}:/content`
            : `/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/content`;

        return await client.api(uploadPath).put(content);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Generate a temporary password
     */
    generateTempPassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Execute a batch of Graph requests
     */
    async executeBatch(requests) {
        const client = await this.getClient();
        
        const batchContent = {
            requests: requests.map((req, index) => ({
                id: String(index + 1),
                method: req.method,
                url: req.url,
                body: req.body,
                headers: req.headers || { 'Content-Type': 'application/json' }
            }))
        };

        return await client.api('/$batch').post(batchContent);
    }
}

// Factory function
function createGraphAutomation() {
    return new GraphAutomation();
}

module.exports = { GraphAutomation, createGraphAutomation };
