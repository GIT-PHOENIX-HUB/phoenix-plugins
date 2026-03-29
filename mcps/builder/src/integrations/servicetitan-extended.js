/**
 * ServiceTitan Extended API Client
 * 
 * Full API coverage based on ServiceTitan API runbook documentation.
 * Extends base client with complete endpoint coverage for:
 * - CRM (Customers, Locations, Leads, Bookings)
 * - Jobs & Appointments
 * - Dispatch (Capacity, Shifts, Non-Job Events, GPS)
 * - Accounting (Invoices, Payments, Bills, Tax Zones)
 * - Sales & Estimates
 * - Memberships & Recurring Services
 * - Inventory (Vendors, Purchase Orders)
 * - Payroll
 * - Marketing (Campaigns)
 * - Settings (Employees, Technicians, Business Units, Tags)
 * - Task Management
 * - Telecom (Calls)
 * - Equipment Systems
 * - Service Agreements
 * - Scheduling Pro
 */

const { ServiceTitanClient, SERVICETITAN_CONFIG } = require('./servicetitan');

class ServiceTitanExtendedClient extends ServiceTitanClient {
    constructor(config) {
        super(config);
    }

    // ============================================================
    // CRM APIs - Customers, Locations, Leads, Bookings
    // ============================================================

    /**
     * Create a new customer
     */
    async createCustomer(customerData) {
        return this.request('POST', '/crm/v2/customers', {
            name: customerData.name,
            type: customerData.type || 'Residential',
            address: customerData.address,
            email: customerData.email,
            phoneNumbers: customerData.phoneNumbers,
            customFields: customerData.customFields
        });
    }

    /**
     * Update customer details
     */
    async updateCustomer(customerId, updates) {
        return this.request('PATCH', `/crm/v2/customers/${customerId}`, updates);
    }

    /**
     * Get customer contacts
     */
    async getCustomerContacts(customerId) {
        return this.request('GET', `/crm/v2/customers/${customerId}/contacts`);
    }

    /**
     * Update customer contact
     */
    async updateCustomerContact(customerId, contactId, contactData) {
        return this.request('PATCH', `/crm/v2/customers/${customerId}/contacts/${contactId}`, contactData);
    }

    /**
     * Get location by ID
     */
    async getLocation(locationId) {
        return this.request('GET', `/crm/v2/locations/${locationId}`);
    }

    /**
     * Search locations
     */
    async searchLocations(params) {
        return this.request('GET', '/crm/v2/locations', null, {
            address: params.address,
            city: params.city,
            state: params.state,
            zip: params.zip,
            pageSize: params.pageSize || 50
        });
    }

    /**
     * Create a new location for a customer
     */
    async createLocation(customerId, locationData) {
        return this.request('POST', `/crm/v2/customers/${customerId}/locations`, {
            name: locationData.name,
            address: locationData.address,
            contacts: locationData.contacts,
            customFields: locationData.customFields
        });
    }

    /**
     * Update location details
     */
    async updateLocation(locationId, updates) {
        return this.request('PATCH', `/crm/v2/locations/${locationId}`, updates);
    }

    /**
     * Get location contacts
     */
    async getLocationContacts(locationId) {
        return this.request('GET', `/crm/v2/locations/${locationId}/contacts`);
    }

    /**
     * Validate location address
     */
    async validateLocationAddress(address) {
        return this.request('POST', '/crm/v2/locations/validate-address', {
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country || 'US'
        });
    }

    // -------------------- Leads --------------------

    /**
     * Get all leads
     */
    async getLeads(params = {}) {
        return this.request('GET', '/crm/v2/leads', null, {
            status: params.status, // Open, Won, Dismissed
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            followUpBefore: params.followUpBefore,
            pageSize: params.pageSize || 50
        });
    }

    /**
     * Get lead by ID
     */
    async getLead(leadId) {
        return this.request('GET', `/crm/v2/leads/${leadId}`);
    }

    /**
     * Create a new lead
     */
    async createLead(leadData) {
        return this.request('POST', '/crm/v2/leads', {
            customerId: leadData.customerId,
            locationId: leadData.locationId,
            callReasonId: leadData.callReasonId,
            priority: leadData.priority,
            summary: leadData.summary,
            nextFollowUpDate: leadData.nextFollowUpDate
        });
    }

    /**
     * Update lead status
     */
    async updateLead(leadId, updates) {
        return this.request('PATCH', `/crm/v2/leads/${leadId}`, updates);
    }

    /**
     * Dismiss a lead
     */
    async dismissLead(leadId, reason) {
        return this.request('POST', `/crm/v2/leads/${leadId}/dismiss`, {
            reason
        });
    }

    // -------------------- Bookings --------------------

    /**
     * Get bookings
     */
    async getBookings(params = {}) {
        return this.request('GET', '/crm/v2/bookings', null, {
            status: params.status,
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            pageSize: params.pageSize || 50
        });
    }

    /**
     * Get booking by ID
     */
    async getBooking(bookingId) {
        return this.request('GET', `/crm/v2/bookings/${bookingId}`);
    }

    /**
     * Create a booking (for booking provider integration)
     */
    async createBooking(bookingProviderTag, bookingData) {
        return this.request('POST', `/crm/v2/${bookingProviderTag}/bookings`, {
            name: bookingData.name,
            address: bookingData.address,
            phoneNumber: bookingData.phoneNumber,
            email: bookingData.email,
            source: bookingData.source,
            summary: bookingData.summary,
            businessUnitId: bookingData.businessUnitId,
            jobTypeId: bookingData.jobTypeId,
            campaignId: bookingData.campaignId,
            sendConfirmation: bookingData.sendConfirmation || false
        });
    }

    /**
     * Update a booking
     */
    async updateBooking(bookingProviderTag, bookingId, updates) {
        return this.request('PATCH', `/crm/v2/${bookingProviderTag}/bookings/${bookingId}`, updates);
    }

    // ============================================================
    // Jobs & Appointments APIs
    // ============================================================

    /**
     * Book a new job
     */
    async bookJob(jobData) {
        return this.request('POST', '/jpm/v2/jobs', {
            customerId: jobData.customerId,
            locationId: jobData.locationId,
            businessUnitId: jobData.businessUnitId,
            jobTypeId: jobData.jobTypeId,
            priority: jobData.priority || 'Normal',
            campaignId: jobData.campaignId,
            summary: jobData.summary,
            appointments: jobData.appointments || [{
                start: jobData.scheduledStart,
                end: jobData.scheduledEnd,
                arrivalWindowStart: jobData.arrivalWindowStart,
                arrivalWindowEnd: jobData.arrivalWindowEnd
            }]
        });
    }

    /**
     * Update job details
     */
    async updateJob(jobId, updates) {
        return this.request('PATCH', `/jpm/v2/jobs/${jobId}`, updates);
    }

    /**
     * Cancel a job
     */
    async cancelJob(jobId, cancelReasonId, memo = null) {
        return this.request('POST', `/jpm/v2/jobs/${jobId}/cancel`, {
            cancelReasonId,
            memo
        });
    }

    /**
     * Put job on hold
     */
    async holdJob(jobId, holdReasonId, memo = null) {
        return this.request('POST', `/jpm/v2/jobs/${jobId}/hold`, {
            holdReasonId,
            memo
        });
    }

    /**
     * Get job notes
     */
    async getJobNotes(jobId) {
        return this.request('GET', `/jpm/v2/jobs/${jobId}/notes`);
    }

    /**
     * Get jobs by project
     */
    async getJobsByProject(projectId) {
        return this.request('GET', '/jpm/v2/jobs', null, {
            projectId,
            pageSize: 100
        });
    }

    /**
     * Get job history
     */
    async getJobHistory(jobId) {
        return this.request('GET', `/jpm/v2/jobs/${jobId}/history`);
    }

    // -------------------- Appointments --------------------

    /**
     * Get appointments
     */
    async getAppointments(params = {}) {
        return this.request('GET', '/jpm/v2/appointments', null, {
            startsOnOrAfter: params.startDate,
            startsBefore: params.endDate,
            jobId: params.jobId,
            technicianId: params.technicianId,
            status: params.status,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get appointment by ID
     */
    async getAppointment(appointmentId) {
        return this.request('GET', `/jpm/v2/appointments/${appointmentId}`);
    }

    /**
     * Add appointment to job
     */
    async addAppointment(jobId, appointmentData) {
        return this.request('POST', `/jpm/v2/jobs/${jobId}/appointments`, {
            start: appointmentData.start,
            end: appointmentData.end,
            arrivalWindowStart: appointmentData.arrivalWindowStart,
            arrivalWindowEnd: appointmentData.arrivalWindowEnd,
            technicianIds: appointmentData.technicianIds,
            specialInstructions: appointmentData.specialInstructions
        });
    }

    /**
     * Reschedule appointment
     */
    async rescheduleAppointment(appointmentId, newSchedule) {
        return this.request('PATCH', `/jpm/v2/appointments/${appointmentId}`, {
            start: newSchedule.start,
            end: newSchedule.end,
            arrivalWindowStart: newSchedule.arrivalWindowStart,
            arrivalWindowEnd: newSchedule.arrivalWindowEnd
        });
    }

    /**
     * Assign technicians to appointment
     */
    async assignTechnicians(appointmentId, technicianIds) {
        return this.request('PUT', `/jpm/v2/appointments/${appointmentId}/technicians`, {
            technicianIds
        });
    }

    /**
     * Remove technician from appointment
     */
    async removeTechnician(appointmentId, technicianId) {
        return this.request('DELETE', `/jpm/v2/appointments/${appointmentId}/technicians/${technicianId}`);
    }

    /**
     * Delete appointment (if conditions allow)
     */
    async deleteAppointment(appointmentId) {
        return this.request('DELETE', `/jpm/v2/appointments/${appointmentId}`);
    }

    /**
     * Put appointment on hold
     */
    async holdAppointment(appointmentId, holdReasonId) {
        return this.request('POST', `/jpm/v2/appointments/${appointmentId}/hold`, {
            holdReasonId
        });
    }

    // -------------------- Projects --------------------

    /**
     * Get projects
     */
    async getProjects(params = {}) {
        return this.request('GET', '/jpm/v2/projects', null, {
            status: params.status,
            startsOnOrAfter: params.startDate,
            startsBefore: params.endDate,
            completedOnOrAfter: params.completedAfter,
            completedBefore: params.completedBefore,
            pageSize: params.pageSize || 50
        });
    }

    /**
     * Get project by ID
     */
    async getProject(projectId) {
        return this.request('GET', `/jpm/v2/projects/${projectId}`);
    }

    /**
     * Get project appointments
     */
    async getProjectAppointments(projectId) {
        return this.request('GET', `/jpm/v2/projects/${projectId}/appointments`);
    }

    // ============================================================
    // Dispatch APIs - Capacity, Shifts, Non-Job Events, GPS
    // ============================================================

    /**
     * Get capacity/availability
     */
    async getCapacity(params) {
        return this.request('GET', '/dispatch/v2/capacity', null, {
            startsOnOrAfter: params.startDate,
            startsBefore: params.endDate,
            businessUnitId: params.businessUnitId,
            jobTypeId: params.jobTypeId
        });
    }

    /**
     * Get real-time availability for scheduling
     */
    async getAvailability(params) {
        return this.request('GET', '/dispatch/v2/availability', null, {
            date: params.date,
            businessUnitId: params.businessUnitId,
            jobTypeId: params.jobTypeId,
            duration: params.duration
        });
    }

    // -------------------- Technician Shifts --------------------

    /**
     * Get technician shifts
     */
    async getTechnicianShifts(params = {}) {
        return this.request('GET', '/dispatch/v2/technician-shifts', null, {
            technicianId: params.technicianId,
            startsOnOrAfter: params.startDate,
            startsBefore: params.endDate,
            shiftType: params.shiftType, // Available, OnCall, TimeOff
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Create technician shift
     */
    async createTechnicianShift(shiftData) {
        return this.request('POST', '/dispatch/v2/technician-shifts', {
            technicianId: shiftData.technicianId,
            start: shiftData.start,
            end: shiftData.end,
            shiftType: shiftData.shiftType
        });
    }

    /**
     * Update technician shift
     */
    async updateTechnicianShift(shiftId, updates) {
        return this.request('PATCH', `/dispatch/v2/technician-shifts/${shiftId}`, updates);
    }

    /**
     * Delete technician shift
     */
    async deleteTechnicianShift(shiftId) {
        return this.request('DELETE', `/dispatch/v2/technician-shifts/${shiftId}`);
    }

    // -------------------- Non-Job Events --------------------

    /**
     * Get non-job events
     */
    async getNonJobEvents(params = {}) {
        return this.request('GET', '/dispatch/v2/non-job-events', null, {
            technicianId: params.technicianId,
            startsOnOrAfter: params.startDate,
            startsBefore: params.endDate,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Create non-job event (meetings, training, etc.)
     */
    async createNonJobEvent(eventData) {
        return this.request('POST', '/dispatch/v2/non-job-events', {
            technicianId: eventData.technicianId,
            timesheetCodeId: eventData.timesheetCodeId,
            start: eventData.start,
            end: eventData.end,
            name: eventData.name,
            memo: eventData.memo
        });
    }

    /**
     * Update non-job event
     */
    async updateNonJobEvent(eventId, updates) {
        return this.request('PATCH', `/dispatch/v2/non-job-events/${eventId}`, updates);
    }

    /**
     * Delete non-job event
     */
    async deleteNonJobEvent(eventId) {
        return this.request('DELETE', `/dispatch/v2/non-job-events/${eventId}`);
    }

    // -------------------- GPS --------------------

    /**
     * Update technician GPS location
     */
    async updateTechnicianGPS(gpsProviderTag, technicianId, coordinates) {
        return this.request('POST', `/dispatch/v2/${gpsProviderTag}/gps`, {
            technicianId,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            timestamp: coordinates.timestamp || new Date().toISOString()
        });
    }

    // ============================================================
    // Accounting APIs - Invoices, Payments, Bills, Tax Zones
    // ============================================================

    /**
     * Get invoices with filters
     */
    async getInvoicesFiltered(params = {}) {
        return this.request('GET', '/accounting/v2/invoices', null, {
            invoiceType: params.type, // Job, Membership, POS, Project, etc.
            status: params.status,
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            customerId: params.customerId,
            jobId: params.jobId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Create invoice
     */
    async createInvoice(invoiceData) {
        return this.request('POST', '/accounting/v2/invoices', {
            jobId: invoiceData.jobId,
            customerId: invoiceData.customerId,
            items: invoiceData.items,
            taxZoneId: invoiceData.taxZoneId,
            summary: invoiceData.summary
        });
    }

    /**
     * Update invoice
     */
    async updateInvoice(invoiceId, updates) {
        return this.request('PATCH', `/accounting/v2/invoices/${invoiceId}`, updates);
    }

    /**
     * Get invoice items
     */
    async getInvoiceItems(invoiceId) {
        return this.request('GET', `/accounting/v2/invoices/${invoiceId}/items`);
    }

    /**
     * Add item to invoice
     */
    async addInvoiceItem(invoiceId, itemData) {
        return this.request('POST', `/accounting/v2/invoices/${invoiceId}/items`, itemData);
    }

    /**
     * Delete invoice item
     */
    async deleteInvoiceItem(invoiceId, itemId) {
        return this.request('DELETE', `/accounting/v2/invoices/${invoiceId}/items/${itemId}`);
    }

    // -------------------- Payments --------------------

    /**
     * Get payments
     */
    async getPayments(params = {}) {
        return this.request('GET', '/accounting/v2/payments', null, {
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            invoiceId: params.invoiceId,
            customerId: params.customerId,
            paymentType: params.type,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get payment by ID
     */
    async getPayment(paymentId) {
        return this.request('GET', `/accounting/v2/payments/${paymentId}`);
    }

    /**
     * Create payment
     */
    async createPayment(paymentData) {
        return this.request('POST', '/accounting/v2/payments', {
            invoiceId: paymentData.invoiceId,
            amount: paymentData.amount,
            paymentMethodId: paymentData.paymentMethodId,
            memo: paymentData.memo
        });
    }

    /**
     * Update payment
     */
    async updatePayment(paymentId, updates) {
        return this.request('PATCH', `/accounting/v2/payments/${paymentId}`, updates);
    }

    // -------------------- Payment Terms --------------------

    /**
     * Get payment terms
     */
    async getPaymentTerms() {
        return this.request('GET', '/accounting/v2/payment-terms');
    }

    // -------------------- Bills --------------------

    /**
     * Get bills (vendor invoices)
     */
    async getBills(params = {}) {
        return this.request('GET', '/accounting/v2/bills', null, {
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            vendorId: params.vendorId,
            purchaseOrderId: params.purchaseOrderId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get bill by ID
     */
    async getBill(billId) {
        return this.request('GET', `/accounting/v2/bills/${billId}`);
    }

    // -------------------- Tax Zones --------------------

    /**
     * Get tax zones
     */
    async getTaxZones() {
        return this.request('GET', '/accounting/v2/tax-zones');
    }

    /**
     * Get tax zone by ID
     */
    async getTaxZone(taxZoneId) {
        return this.request('GET', `/accounting/v2/tax-zones/${taxZoneId}`);
    }

    // ============================================================
    // Sales & Estimates APIs
    // ============================================================

    /**
     * Get estimates with filters
     */
    async getEstimates(params = {}) {
        return this.request('GET', '/sales/v2/estimates', null, {
            jobId: params.jobId,
            status: params.status, // Open, Sold, Dismissed
            soldById: params.soldById,
            soldOnOrAfter: params.soldAfter,
            soldBefore: params.soldBefore,
            totalMin: params.totalMin,
            totalMax: params.totalMax,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Create estimate
     */
    async createEstimate(jobId, estimateData) {
        return this.request('POST', `/sales/v2/jobs/${jobId}/estimates`, {
            name: estimateData.name,
            summary: estimateData.summary,
            items: estimateData.items
        });
    }

    /**
     * Add items to estimate
     */
    async addEstimateItems(estimateId, items) {
        return this.request('POST', `/sales/v2/estimates/${estimateId}/items`, { items });
    }

    /**
     * Mark estimate as sold
     */
    async sellEstimate(estimateId, soldById) {
        return this.request('POST', `/sales/v2/estimates/${estimateId}/sell`, {
            soldById
        });
    }

    /**
     * Dismiss estimate
     */
    async dismissEstimate(estimateId, reason) {
        return this.request('POST', `/sales/v2/estimates/${estimateId}/dismiss`, {
            reason
        });
    }

    /**
     * Unsell estimate (if conditions allow)
     */
    async unsellEstimate(estimateId) {
        return this.request('POST', `/sales/v2/estimates/${estimateId}/unsell`);
    }

    // ============================================================
    // Memberships APIs
    // ============================================================

    /**
     * Get membership types
     */
    async getMembershipTypes() {
        return this.request('GET', '/memberships/v2/membership-types');
    }

    /**
     * Get membership type by ID
     */
    async getMembershipType(typeId) {
        return this.request('GET', `/memberships/v2/membership-types/${typeId}`);
    }

    /**
     * Get customer memberships
     */
    async getCustomerMemberships(params = {}) {
        return this.request('GET', '/memberships/v2/customer-memberships', null, {
            customerId: params.customerId,
            status: params.status, // Active, Expired, Canceled
            activatedOnOrAfter: params.activatedAfter,
            activatedBefore: params.activatedBefore,
            expiresOnOrAfter: params.expiresAfter,
            expiresBefore: params.expiresBefore,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get customer membership by ID
     */
    async getCustomerMembership(membershipId) {
        return this.request('GET', `/memberships/v2/customer-memberships/${membershipId}`);
    }

    /**
     * Create membership sale invoice
     */
    async createMembershipSaleInvoice(membershipData) {
        return this.request('POST', '/memberships/v2/membership-invoices', {
            customerId: membershipData.customerId,
            locationId: membershipData.locationId,
            membershipTypeId: membershipData.membershipTypeId
        });
    }

    /**
     * Update customer membership
     */
    async updateCustomerMembership(membershipId, updates) {
        return this.request('PATCH', `/memberships/v2/customer-memberships/${membershipId}`, updates);
    }

    // -------------------- Recurring Services --------------------

    /**
     * Get recurring service types
     */
    async getRecurringServiceTypes() {
        return this.request('GET', '/memberships/v2/recurring-service-types');
    }

    /**
     * Get location recurring services
     */
    async getLocationRecurringServices(params = {}) {
        return this.request('GET', '/memberships/v2/location-recurring-services', null, {
            locationId: params.locationId,
            status: params.status,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get recurring service events
     */
    async getRecurringServiceEvents(params = {}) {
        return this.request('GET', '/memberships/v2/recurring-service-events', null, {
            status: params.status,
            dueDateOnOrAfter: params.dueAfter,
            dueDateBefore: params.dueBefore,
            pageSize: params.pageSize || 100
        });
    }

    // ============================================================
    // Inventory APIs - Vendors, Purchase Orders
    // ============================================================

    /**
     * Get vendors
     */
    async getVendors(params = {}) {
        return this.request('GET', '/inventory/v2/vendors', null, {
            active: params.active,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get vendor by ID
     */
    async getVendor(vendorId) {
        return this.request('GET', `/inventory/v2/vendors/${vendorId}`);
    }

    /**
     * Create vendor
     */
    async createVendor(vendorData) {
        return this.request('POST', '/inventory/v2/vendors', {
            name: vendorData.name,
            address: vendorData.address,
            primaryContact: vendorData.primaryContact,
            defaultTaxRateId: vendorData.defaultTaxRateId
        });
    }

    /**
     * Get purchase orders
     */
    async getPurchaseOrders(params = {}) {
        return this.request('GET', '/inventory/v2/purchase-orders', null, {
            vendorId: params.vendorId,
            status: params.status,
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            jobId: params.jobId,
            projectId: params.projectId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get purchase order by ID
     */
    async getPurchaseOrder(poId) {
        return this.request('GET', `/inventory/v2/purchase-orders/${poId}`);
    }

    /**
     * Create purchase order
     */
    async createPurchaseOrder(poData) {
        return this.request('POST', '/inventory/v2/purchase-orders', {
            vendorId: poData.vendorId,
            businessUnitId: poData.businessUnitId,
            inventoryLocationId: poData.inventoryLocationId,
            jobId: poData.jobId,
            projectId: poData.projectId,
            technicianId: poData.technicianId,
            items: poData.items,
            summary: poData.summary
        });
    }

    // ============================================================
    // Payroll APIs
    // ============================================================

    /**
     * Get timesheet codes
     */
    async getTimesheetCodes() {
        return this.request('GET', '/payroll/v2/timesheet-codes');
    }

    /**
     * Get activity/earning codes
     */
    async getActivityCodes() {
        return this.request('GET', '/payroll/v2/activity-codes');
    }

    /**
     * Get gross pay items
     */
    async getGrossPayItems(params = {}) {
        return this.request('GET', '/payroll/v2/gross-pay-items', null, {
            employeeId: params.employeeId,
            payPeriodId: params.payPeriodId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get pay periods
     */
    async getPayPeriods() {
        return this.request('GET', '/payroll/v2/pay-periods');
    }

    /**
     * Get job splits
     */
    async getJobSplits(jobId) {
        return this.request('GET', `/payroll/v2/jobs/${jobId}/splits`);
    }

    /**
     * Create payroll adjustment
     */
    async createPayrollAdjustment(adjustmentData) {
        return this.request('POST', '/payroll/v2/adjustments', {
            employeeId: adjustmentData.employeeId,
            activityCodeId: adjustmentData.activityCodeId,
            amount: adjustmentData.amount,
            memo: adjustmentData.memo
        });
    }

    /**
     * Delete payroll adjustment
     */
    async deletePayrollAdjustment(adjustmentId) {
        return this.request('DELETE', `/payroll/v2/adjustments/${adjustmentId}`);
    }

    // ============================================================
    // Marketing APIs - Campaigns
    // ============================================================

    /**
     * Get campaigns
     */
    async getCampaigns(params = {}) {
        return this.request('GET', '/marketing/v2/campaigns', null, {
            active: params.active,
            categoryId: params.categoryId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get campaign by ID
     */
    async getCampaign(campaignId) {
        return this.request('GET', `/marketing/v2/campaigns/${campaignId}`);
    }

    /**
     * Create campaign
     */
    async createCampaign(campaignData) {
        return this.request('POST', '/marketing/v2/campaigns', {
            name: campaignData.name,
            categoryId: campaignData.categoryId,
            active: campaignData.active || true
        });
    }

    /**
     * Get campaign categories
     */
    async getCampaignCategories() {
        return this.request('GET', '/marketing/v2/categories');
    }

    /**
     * Create campaign category
     */
    async createCampaignCategory(categoryData) {
        return this.request('POST', '/marketing/v2/categories', {
            name: categoryData.name
        });
    }

    /**
     * Get campaign costs
     */
    async getCampaignCosts(campaignId) {
        return this.request('GET', `/marketing/v2/campaigns/${campaignId}/costs`);
    }

    /**
     * Add campaign cost
     */
    async addCampaignCost(campaignId, costData) {
        return this.request('POST', `/marketing/v2/campaigns/${campaignId}/costs`, {
            year: costData.year,
            month: costData.month,
            amount: costData.amount
        });
    }

    // ============================================================
    // Settings APIs - Employees, Technicians, Business Units, Tags
    // ============================================================

    /**
     * Get employees (non-technician staff)
     */
    async getEmployees(params = {}) {
        return this.request('GET', '/settings/v2/employees', null, {
            active: params.active,
            name: params.name,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get employee by ID
     */
    async getEmployee(employeeId) {
        return this.request('GET', `/settings/v2/employees/${employeeId}`);
    }

    /**
     * Get technician by ID
     */
    async getTechnician(technicianId) {
        return this.request('GET', `/settings/v2/technicians/${technicianId}`);
    }

    /**
     * Get technician goals
     */
    async getTechnicianGoals(technicianId) {
        return this.request('GET', `/settings/v2/technicians/${technicianId}/goals`);
    }

    /**
     * Get business units
     */
    async getBusinessUnits(params = {}) {
        return this.request('GET', '/settings/v2/business-units', null, {
            active: params.active,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get business unit by ID
     */
    async getBusinessUnit(businessUnitId) {
        return this.request('GET', `/settings/v2/business-units/${businessUnitId}`);
    }

    /**
     * Get tag types
     */
    async getTagTypes() {
        return this.request('GET', '/settings/v2/tag-types');
    }

    /**
     * Get tags
     */
    async getTags(params = {}) {
        return this.request('GET', '/settings/v2/tags', null, {
            tagTypeId: params.tagTypeId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get job types
     */
    async getJobTypes(params = {}) {
        return this.request('GET', '/settings/v2/job-types', null, {
            businessUnitId: params.businessUnitId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get cancel reasons
     */
    async getCancelReasons() {
        return this.request('GET', '/settings/v2/job-cancel-reasons');
    }

    /**
     * Get hold reasons
     */
    async getHoldReasons() {
        return this.request('GET', '/settings/v2/job-hold-reasons');
    }

    // ============================================================
    // Task Management APIs
    // ============================================================

    /**
     * Get tasks
     */
    async getTasks(params = {}) {
        return this.request('GET', '/task-management/v2/tasks', null, {
            status: params.status,
            assignedToId: params.assignedToId,
            sourceId: params.sourceId,
            typeId: params.typeId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get task by ID
     */
    async getTask(taskId) {
        return this.request('GET', `/task-management/v2/tasks/${taskId}`);
    }

    /**
     * Create task
     */
    async createTask(taskData) {
        return this.request('POST', '/task-management/v2/tasks', {
            typeId: taskData.typeId,
            sourceId: taskData.sourceId,
            assignedToId: taskData.assignedToId,
            dueDate: taskData.dueDate,
            summary: taskData.summary,
            customerId: taskData.customerId,
            jobId: taskData.jobId
        });
    }

    /**
     * Update task
     */
    async updateTask(taskId, updates) {
        return this.request('PATCH', `/task-management/v2/tasks/${taskId}`, updates);
    }

    /**
     * Create subtask
     */
    async createSubtask(parentTaskId, subtaskData) {
        return this.request('POST', `/task-management/v2/tasks/${parentTaskId}/subtasks`, {
            summary: subtaskData.summary,
            assignedToId: subtaskData.assignedToId,
            dueDate: subtaskData.dueDate
        });
    }

    /**
     * Get task sources
     */
    async getTaskSources() {
        return this.request('GET', '/task-management/v2/data/sources');
    }

    /**
     * Get task types
     */
    async getTaskTypes() {
        return this.request('GET', '/task-management/v2/data/types');
    }

    /**
     * Get task resolutions
     */
    async getTaskResolutions() {
        return this.request('GET', '/task-management/v2/data/resolutions');
    }

    // ============================================================
    // Telecom APIs - Calls
    // ============================================================

    /**
     * Get calls
     */
    async getCalls(params = {}) {
        return this.request('GET', '/telecom/v2/calls', null, {
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            direction: params.direction, // Inbound, Outbound
            agentId: params.agentId,
            customerId: params.customerId,
            campaignId: params.campaignId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get call by ID
     */
    async getCall(callId) {
        return this.request('GET', `/telecom/v2/calls/${callId}`);
    }

    /**
     * Get call recording URL
     */
    async getCallRecording(callId) {
        return this.request('GET', `/telecom/v2/calls/${callId}/recording`);
    }

    /**
     * Update call record
     */
    async updateCall(callId, updates) {
        return this.request('PATCH', `/telecom/v2/calls/${callId}`, updates);
    }

    // ============================================================
    // Equipment Systems APIs
    // ============================================================

    /**
     * Get installed equipment at location
     */
    async getInstalledEquipment(locationId) {
        return this.request('GET', '/equipment-systems/v2/installed-equipment', null, {
            locationId,
            pageSize: 100
        });
    }

    /**
     * Get equipment by ID
     */
    async getEquipment(equipmentId) {
        return this.request('GET', `/equipment-systems/v2/installed-equipment/${equipmentId}`);
    }

    /**
     * Create installed equipment record
     */
    async createInstalledEquipment(locationId, equipmentData) {
        return this.request('POST', '/equipment-systems/v2/installed-equipment', {
            locationId,
            name: equipmentData.name,
            equipmentType: equipmentData.type,
            manufacturer: equipmentData.manufacturer,
            model: equipmentData.model,
            serialNumber: equipmentData.serialNumber,
            installDate: equipmentData.installDate
        });
    }

    /**
     * Update installed equipment
     */
    async updateInstalledEquipment(equipmentId, updates) {
        return this.request('PATCH', `/equipment-systems/v2/installed-equipment/${equipmentId}`, updates);
    }

    // ============================================================
    // Service Agreements APIs
    // ============================================================

    /**
     * Get service agreements
     */
    async getServiceAgreements(params = {}) {
        return this.request('GET', '/service-agreements/v2/agreements', null, {
            status: params.status, // Active, Canceled
            customerId: params.customerId,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get service agreement by ID
     */
    async getServiceAgreement(agreementId) {
        return this.request('GET', `/service-agreements/v2/agreements/${agreementId}`);
    }

    /**
     * Get service agreement templates
     */
    async getServiceAgreementTemplates() {
        return this.request('GET', '/service-agreements/v2/templates');
    }

    // ============================================================
    // Scheduling Pro APIs
    // ============================================================

    /**
     * Get schedulers
     */
    async getSchedulers() {
        return this.request('GET', '/scheduling-pro/v2/schedulers');
    }

    /**
     * Get scheduler by ID
     */
    async getScheduler(schedulerId) {
        return this.request('GET', `/scheduling-pro/v2/schedulers/${schedulerId}`);
    }

    /**
     * Get scheduling sessions
     */
    async getSchedulingSessions(params = {}) {
        return this.request('GET', '/scheduling-pro/v2/sessions', null, {
            schedulerId: params.schedulerId,
            status: params.status,
            createdOnOrAfter: params.createdAfter,
            createdBefore: params.createdBefore,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
            customerEmail: params.customerEmail,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get scheduler performance metrics
     */
    async getSchedulerPerformance(schedulerId, params = {}) {
        return this.request('GET', `/scheduling-pro/v2/schedulers/${schedulerId}/performance`, null, {
            startDate: params.startDate,
            endDate: params.endDate
        });
    }

    // ============================================================
    // Pricebook APIs (bonus - commonly needed)
    // ============================================================

    /**
     * Get pricebook items
     */
    async getPricebookItems(params = {}) {
        return this.request('GET', '/pricebook/v2/items', null, {
            type: params.type, // Service, Material, Equipment
            active: params.active,
            pageSize: params.pageSize || 100
        });
    }

    /**
     * Get pricebook item by ID
     */
    async getPricebookItem(itemId) {
        return this.request('GET', `/pricebook/v2/items/${itemId}`);
    }

    /**
     * Search pricebook
     */
    async searchPricebook(query) {
        return this.request('GET', '/pricebook/v2/items', null, {
            search: query,
            active: true,
            pageSize: 50
        });
    }

    // ============================================================
    // Data Export APIs (for bulk data)
    // ============================================================

    /**
     * Export jobs data
     */
    async exportJobs(params = {}) {
        return this.request('GET', '/jpm/v2/export/jobs', null, {
            modifiedOnOrAfter: params.modifiedAfter,
            modifiedBefore: params.modifiedBefore,
            pageSize: params.pageSize || 1000
        });
    }

    /**
     * Export customers data
     */
    async exportCustomers(params = {}) {
        return this.request('GET', '/crm/v2/export/customers', null, {
            modifiedOnOrAfter: params.modifiedAfter,
            modifiedBefore: params.modifiedBefore,
            pageSize: params.pageSize || 1000
        });
    }

    /**
     * Export invoices data
     */
    async exportInvoices(params = {}) {
        return this.request('GET', '/accounting/v2/export/invoices', null, {
            modifiedOnOrAfter: params.modifiedAfter,
            modifiedBefore: params.modifiedBefore,
            pageSize: params.pageSize || 1000
        });
    }

    // ============================================================
    // Utility Methods
    // ============================================================

    /**
     * Find nearest available technician for a job
     */
    async findNearestTechnician(jobId) {
        const [job, technicians, shifts] = await Promise.all([
            this.getJobDetails(jobId),
            this.getTechnicians(),
            this.getTechnicianShifts({
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                shiftType: 'Available'
            })
        ]);

        // Get available technician IDs
        const availableTechIds = new Set(shifts.data?.map(s => s.technicianId) || []);
        
        // Filter to available technicians
        const availableTechs = (technicians.data || []).filter(t => 
            availableTechIds.has(t.id)
        );

        // For now, return first available (in production, would use GPS/routing)
        return availableTechs[0] || null;
    }

    /**
     * Get comprehensive job dashboard data
     */
    async getJobDashboard(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const startOfDay = new Date(dateStr);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        const [
            scheduled,
            completed,
            onHold,
            canceled,
            technicians,
            capacity
        ] = await Promise.all([
            this.getAppointments({ startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }),
            this.getCompletedJobs(startOfDay.toISOString(), endOfDay.toISOString()),
            this.request('GET', '/jpm/v2/jobs', null, { jobStatus: 'Hold', pageSize: 50 }),
            this.request('GET', '/jpm/v2/jobs', null, { 
                jobStatus: 'Canceled',
                modifiedOnOrAfter: startOfDay.toISOString(),
                pageSize: 50
            }),
            this.getTechnicians(),
            this.getCapacity({ startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() })
        ]);

        return {
            date: dateStr,
            appointments: {
                total: scheduled.data?.length || 0,
                data: scheduled.data || []
            },
            completed: {
                total: completed.data?.length || 0,
                data: completed.data || []
            },
            onHold: {
                total: onHold.data?.length || 0,
                data: onHold.data || []
            },
            canceled: {
                total: canceled.data?.length || 0,
                data: canceled.data || []
            },
            technicians: {
                total: technicians.data?.length || 0,
                data: technicians.data || []
            },
            capacity: capacity.data || {}
        };
    }

    /**
     * Get customer 360 view
     */
    async getCustomer360(customerId) {
        const [
            customer,
            locations,
            jobs,
            memberships,
            invoices,
            leads
        ] = await Promise.all([
            this.getCustomer(customerId),
            this.getCustomerLocations(customerId),
            this.request('GET', '/jpm/v2/jobs', null, { customerId, pageSize: 50 }),
            this.getCustomerMemberships({ customerId }),
            this.getInvoicesFiltered({ customerId, pageSize: 50 }),
            this.getLeads({ customerId })
        ]);

        const totalSpent = (invoices.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

        return {
            customer: customer.data || customer,
            locations: locations.data || [],
            jobs: {
                total: jobs.data?.length || 0,
                recent: (jobs.data || []).slice(0, 10)
            },
            memberships: {
                active: (memberships.data || []).filter(m => m.status === 'Active'),
                total: memberships.data?.length || 0
            },
            invoices: {
                total: invoices.data?.length || 0,
                totalSpent,
                recent: (invoices.data || []).slice(0, 10)
            },
            leads: {
                open: (leads.data || []).filter(l => l.status === 'Open'),
                total: leads.data?.length || 0
            }
        };
    }
}

// Factory function
let extendedInstance = null;

function getServiceTitanExtendedClient() {
    if (!extendedInstance) {
        extendedInstance = new ServiceTitanExtendedClient({
            clientId: process.env.SERVICETITAN_CLIENT_ID,
            clientSecret: process.env.SERVICETITAN_CLIENT_SECRET,
            tenantId: process.env.SERVICETITAN_TENANT_ID || SERVICETITAN_CONFIG.TENANT_ID,
            appKey: process.env.SERVICETITAN_APP_KEY
        });
    }
    return extendedInstance;
}

module.exports = {
    ServiceTitanExtendedClient,
    getServiceTitanExtendedClient
};
