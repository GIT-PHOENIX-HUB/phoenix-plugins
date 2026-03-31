/**
 * ServiceTitan API Client
 * Handles authentication and API calls to ServiceTitan
 * 
 * Configuration:
 * - Tenant/Network ID: <SERVICETITAN_TENANT_ID>
 * - External Data Application GUID: <SERVICETITAN_EXTERNAL_DATA_APP_GUID>
 * 
 * Key Vault Secret Names:
 * - ServiceTitan-AppKey
 * - ServiceTitan-ClientId
 * - ServiceTitan-ClientSecret-2025-11
 * - ServiceTitan-TenantId
 */

const axios = require('axios');

// ServiceTitan Configuration Constants
const SERVICETITAN_CONFIG = {
    // Public IDs (safe to include)
    TENANT_ID: '<SERVICETITAN_TENANT_ID>',
    NETWORK_ID: '<SERVICETITAN_TENANT_ID>', // Same as Tenant ID
    EXTERNAL_DATA_APP_GUID: '<SERVICETITAN_EXTERNAL_DATA_APP_GUID>',
    
    // Key Vault Secret Names (for reference - actual secrets in Key Vault)
    KEY_VAULT_SECRETS: {
        APP_KEY: 'ServiceTitan-AppKey',
        CLIENT_ID: 'ServiceTitan-ClientId',
        CLIENT_SECRET: 'ServiceTitan-ClientSecret-2025-11',
        TENANT_ID: 'ServiceTitan-TenantId'
    },
    
    // API Endpoints
    AUTH_URL: 'https://auth.servicetitan.io/connect/token',
    API_BASE_URL: 'https://api.servicetitan.io'
};

class ServiceTitanClient {
    constructor(config) {
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.tenantId = config.tenantId || SERVICETITAN_CONFIG.TENANT_ID;
        this.appKey = config.appKey;
        
        this.authUrl = SERVICETITAN_CONFIG.AUTH_URL;
        this.apiBaseUrl = `${SERVICETITAN_CONFIG.API_BASE_URL}/v2/tenant/${this.tenantId}`;
        
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get OAuth access token from ServiceTitan
     */
    async authenticate() {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(this.authUrl, 
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry 5 minutes before actual expiry for safety
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
            
            return this.accessToken;
        } catch (error) {
            console.error('ServiceTitan authentication failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with ServiceTitan');
        }
    }

    /**
     * Make an authenticated API request
     */
    async request(method, endpoint, data = null, params = null) {
        await this.authenticate();

        try {
            const response = await axios({
                method,
                url: `${this.apiBaseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'ST-App-Key': this.appKey,
                    'Content-Type': 'application/json'
                },
                data,
                params
            });

            return response.data;
        } catch (error) {
            console.error(`ServiceTitan API error (${endpoint}):`, error.response?.data || error.message);
            throw error;
        }
    }

    // ==================== JOB OPERATIONS ====================

    /**
     * Get jobs by date range
     */
    async getJobsByDate(startDate, endDate = null) {
        const params = {
            createdOnOrAfter: startDate,
            pageSize: 100
        };
        
        if (endDate) {
            params.createdBefore = endDate;
        }

        return this.request('GET', '/jpm/v2/jobs', null, params);
    }

    /**
     * Get jobs scheduled for a specific date
     */
    async getScheduledJobs(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.request('GET', '/jpm/v2/jobs', null, {
            scheduledOnOrAfter: startOfDay.toISOString(),
            scheduledBefore: endOfDay.toISOString(),
            pageSize: 100
        });
    }

    /**
     * Get job details by ID
     */
    async getJobDetails(jobId) {
        return this.request('GET', `/jpm/v2/jobs/${jobId}`);
    }

    /**
     * Get completed jobs for a date range
     */
    async getCompletedJobs(startDate, endDate) {
        return this.request('GET', '/jpm/v2/jobs', null, {
            completedOnOrAfter: startDate,
            completedBefore: endDate,
            jobStatus: 'Completed',
            pageSize: 100
        });
    }

    /**
     * Add a note to a job
     */
    async addJobNote(jobId, noteText) {
        return this.request('POST', `/jpm/v2/jobs/${jobId}/notes`, {
            text: noteText
        });
    }

    /**
     * Update job status
     */
    async updateJobStatus(jobId, status) {
        return this.request('PATCH', `/jpm/v2/jobs/${jobId}`, {
            jobStatus: status
        });
    }

    // ==================== CUSTOMER OPERATIONS ====================

    /**
     * Get customer by ID
     */
    async getCustomer(customerId) {
        return this.request('GET', `/crm/v2/customers/${customerId}`);
    }

    /**
     * Search customers by name or phone
     */
    async searchCustomers(query) {
        return this.request('GET', '/crm/v2/customers', null, {
            name: query,
            pageSize: 50
        });
    }

    /**
     * Get customer locations
     */
    async getCustomerLocations(customerId) {
        return this.request('GET', `/crm/v2/customers/${customerId}/locations`);
    }

    // ==================== TECHNICIAN OPERATIONS ====================

    /**
     * Get all technicians
     */
    async getTechnicians() {
        return this.request('GET', '/settings/v2/technicians', null, {
            active: true,
            pageSize: 100
        });
    }

    /**
     * Get technician schedule for a date
     */
    async getTechnicianSchedule(technicianId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.request('GET', '/dispatch/v2/appointments', null, {
            technicianId,
            startsOnOrAfter: startOfDay.toISOString(),
            startsBefore: endOfDay.toISOString()
        });
    }

    // ==================== INVOICE OPERATIONS ====================

    /**
     * Get invoices by date range
     */
    async getInvoices(startDate, endDate) {
        return this.request('GET', '/accounting/v2/invoices', null, {
            createdOnOrAfter: startDate,
            createdBefore: endDate,
            pageSize: 100
        });
    }

    /**
     * Get invoice details
     */
    async getInvoiceDetails(invoiceId) {
        return this.request('GET', `/accounting/v2/invoices/${invoiceId}`);
    }

    // ==================== TIMESHEET OPERATIONS ====================

    /**
     * Get timesheets for a date range
     */
    async getTimesheets(startDate, endDate) {
        return this.request('GET', '/payroll/v2/timesheets', null, {
            startsOnOrAfter: startDate,
            startsBefore: endDate,
            pageSize: 100
        });
    }

    /**
     * Get today's timesheets
     */
    async getTodayTimesheets() {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        return this.getTimesheets(startOfDay, endOfDay);
    }

    // ==================== ESTIMATES OPERATIONS ====================

    /**
     * Get open estimates
     */
    async getOpenEstimates() {
        return this.request('GET', '/sales/v2/estimates', null, {
            status: 'Open',
            pageSize: 100
        });
    }

    /**
     * Get estimate details
     */
    async getEstimateDetails(estimateId) {
        return this.request('GET', `/sales/v2/estimates/${estimateId}`);
    }

    // ==================== SUMMARY/REPORTING ====================

    /**
     * Get daily job summary
     */
    async getDailyJobSummary(date = new Date().toISOString().split('T')[0]) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [scheduledJobs, completedJobs, invoices] = await Promise.all([
            this.getScheduledJobs(date),
            this.request('GET', '/jpm/v2/jobs', null, {
                completedOnOrAfter: startOfDay.toISOString(),
                completedBefore: endOfDay.toISOString(),
                pageSize: 100
            }),
            this.request('GET', '/accounting/v2/invoices', null, {
                createdOnOrAfter: startOfDay.toISOString(),
                createdBefore: endOfDay.toISOString(),
                pageSize: 100
            })
        ]);

        const totalRevenue = invoices.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

        return {
            date,
            scheduledJobsCount: scheduledJobs.data?.length || 0,
            completedJobsCount: completedJobs.data?.length || 0,
            invoicesCreated: invoices.data?.length || 0,
            totalRevenue,
            scheduledJobs: scheduledJobs.data || [],
            completedJobs: completedJobs.data || [],
            invoices: invoices.data || []
        };
    }

    /**
     * Test connection to ServiceTitan API
     */
    async testConnection() {
        try {
            await this.authenticate();
            // Try to get business unit to verify full API access
            const businessUnits = await this.request('GET', '/settings/v2/business-units');
            return {
                connected: true,
                tenantId: this.tenantId,
                businessUnits: businessUnits.data?.length || 0
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
let instance = null;

/**
 * Get ServiceTitan client instance
 * Credentials should be loaded from Key Vault in production:
 * - ServiceTitan-AppKey
 * - ServiceTitan-ClientId  
 * - ServiceTitan-ClientSecret-2025-11
 * - ServiceTitan-TenantId
 */
function getServiceTitanClient() {
    if (!instance) {
        instance = new ServiceTitanClient({
            clientId: process.env.SERVICETITAN_CLIENT_ID,
            clientSecret: process.env.SERVICETITAN_CLIENT_SECRET,
            tenantId: process.env.SERVICETITAN_TENANT_ID || SERVICETITAN_CONFIG.TENANT_ID,
            appKey: process.env.SERVICETITAN_APP_KEY
        });
    }
    return instance;
}

/**
 * Get ServiceTitan configuration (public IDs only)
 */
function getServiceTitanConfig() {
    return {
        tenantId: SERVICETITAN_CONFIG.TENANT_ID,
        networkId: SERVICETITAN_CONFIG.NETWORK_ID,
        externalDataAppGuid: SERVICETITAN_CONFIG.EXTERNAL_DATA_APP_GUID,
        keyVaultSecrets: SERVICETITAN_CONFIG.KEY_VAULT_SECRETS,
        apiBaseUrl: SERVICETITAN_CONFIG.API_BASE_URL
    };
}

module.exports = { 
    ServiceTitanClient, 
    getServiceTitanClient,
    getServiceTitanConfig,
    SERVICETITAN_CONFIG
};
