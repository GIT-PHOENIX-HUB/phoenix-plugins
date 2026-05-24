/**
 * OAuth Protected Resource Metadata (RFC 9728)
 * 
 * Provides the /.well-known/oauth-protected-resource endpoint
 * for OAuth 2.1 discovery by ChatGPT Apps SDK.
 */

class ProtectedResourceMetadata {
    constructor(config = {}) {
        this.config = {
            resourceIdentifier: config.resourceIdentifier || process.env.MCP_RESOURCE_ID || 'phoenix-mcp',
            authorizationServers: config.authorizationServers || [],
            baseUrl: config.baseUrl || process.env.MCP_BASE_URL || 'http://localhost:3000',
            ...config
        };

        // Define supported scopes
        this.scopes = {
            // ServiceTitan scopes
            'st.read': {
                description: 'Read ServiceTitan data (jobs, customers, technicians)',
                category: 'servicetitan'
            },
            'st.write': {
                description: 'Write ServiceTitan data (requires approval)',
                category: 'servicetitan',
                requiresApproval: true
            },
            
            // Microsoft Graph scopes
            'graph.mail.read': {
                description: 'Read emails from monitored mailboxes',
                category: 'graph'
            },
            'graph.mail.draft': {
                description: 'Create email drafts (does not send)',
                category: 'graph'
            },
            'graph.mail.send': {
                description: 'Send emails (requires approval for external)',
                category: 'graph',
                requiresApproval: true
            },
            'graph.calendars.read': {
                description: 'Read calendar events',
                category: 'graph'
            },
            'graph.calendars.write': {
                description: 'Create and modify calendar events',
                category: 'graph'
            },
            'graph.teams.post': {
                description: 'Post messages to Teams channels',
                category: 'graph'
            },
            'graph.files.read': {
                description: 'Read files from SharePoint/OneDrive',
                category: 'graph'
            },
            'graph.files.write': {
                description: 'Write files to SharePoint/OneDrive',
                category: 'graph'
            },

            // Courier scopes
            'courier.run': {
                description: 'Run email triage process',
                category: 'courier'
            },
            'courier.read': {
                description: 'Read triage results and logs',
                category: 'courier'
            },

            // Builder scopes
            'builder.users.read': {
                description: 'Read user directory information',
                category: 'builder'
            },
            'builder.users.write': {
                description: 'Provision and modify user accounts (requires approval)',
                category: 'builder',
                requiresApproval: true
            },
            'builder.audit.read': {
                description: 'Run and read permission audits',
                category: 'builder'
            },
            'builder.workflow.run': {
                description: 'Execute governance workflows',
                category: 'builder'
            },

            // Finance scopes
            'finance.read': {
                description: 'Read financial data (AP, AR, invoices)',
                category: 'finance'
            },
            'finance.write': {
                description: 'Create financial entries (requires approval)',
                category: 'finance',
                requiresApproval: true
            }
        };
    }

    /**
     * Get protected resource metadata (RFC 9728 format)
     */
    getMetadata() {
        return {
            resource: this.config.resourceIdentifier,
            authorization_servers: this._getAuthorizationServers(),
            scopes_supported: Object.keys(this.scopes),
            bearer_methods_supported: ['header'],
            resource_documentation: `${this.config.baseUrl}/docs`,
            
            // Custom extensions for Phoenix MCP
            'phoenix:scope_details': this.scopes,
            'phoenix:approval_required_scopes': this._getApprovalRequiredScopes(),
            'phoenix:categories': this._getScopeCategories()
        };
    }

    /**
     * Get authorization server URLs
     */
    _getAuthorizationServers() {
        if (this.config.authorizationServers.length > 0) {
            return this.config.authorizationServers;
        }

        // Default authorization servers based on IDP configuration
        const idpType = process.env.MCP_IDP_TYPE || 'auth0';
        const issuer = process.env.MCP_OAUTH_ISSUER;

        if (issuer) {
            return [issuer];
        }

        // Fallback for development
        return ['https://auth.phoenix.local'];
    }

    /**
     * Get scopes that require approval
     */
    _getApprovalRequiredScopes() {
        return Object.entries(this.scopes)
            .filter(([_, config]) => config.requiresApproval)
            .map(([scope, _]) => scope);
    }

    /**
     * Get scopes grouped by category
     */
    _getScopeCategories() {
        const categories = {};
        
        for (const [scope, config] of Object.entries(this.scopes)) {
            if (!categories[config.category]) {
                categories[config.category] = [];
            }
            categories[config.category].push(scope);
        }

        return categories;
    }

    /**
     * Get detailed scope information
     */
    getScopeInfo(scopeName) {
        return this.scopes[scopeName] || null;
    }

    /**
     * Check if scope requires approval
     */
    scopeRequiresApproval(scopeName) {
        return this.scopes[scopeName]?.requiresApproval === true;
    }

    /**
     * Get all scopes for a category
     */
    getScopesByCategory(category) {
        return Object.entries(this.scopes)
            .filter(([_, config]) => config.category === category)
            .map(([scope, config]) => ({ scope, ...config }));
    }

    /**
     * Validate that requested scopes are all valid
     */
    validateScopes(requestedScopes) {
        const invalid = requestedScopes.filter(scope => !this.scopes[scope]);
        return {
            valid: invalid.length === 0,
            invalidScopes: invalid,
            validScopes: requestedScopes.filter(scope => this.scopes[scope])
        };
    }

    /**
     * Generate consent screen data for a set of scopes
     */
    generateConsentData(requestedScopes) {
        const scopeDetails = requestedScopes
            .filter(scope => this.scopes[scope])
            .map(scope => ({
                scope,
                description: this.scopes[scope].description,
                category: this.scopes[scope].category,
                requiresApproval: this.scopes[scope].requiresApproval || false
            }));

        const hasApprovalRequired = scopeDetails.some(s => s.requiresApproval);

        return {
            scopes: scopeDetails,
            hasApprovalRequired,
            warning: hasApprovalRequired 
                ? 'Some requested permissions require additional approval for each use.'
                : null,
            categories: [...new Set(scopeDetails.map(s => s.category))]
        };
    }
}

module.exports = { ProtectedResourceMetadata };
