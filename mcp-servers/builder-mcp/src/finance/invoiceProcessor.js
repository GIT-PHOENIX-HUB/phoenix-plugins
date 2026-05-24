/**
 * Invoice Processor
 * 
 * Processes invoices from various sources (email, SFTP, API)
 * and creates corresponding entries in QuickBooks.
 */

class InvoiceProcessor {
  constructor(config = {}) {
    this.quickbooks = config.quickbooks;
    this.logger = config.logger;
    this.serviceTitan = config.serviceTitan;
    
    // Default account mappings
    this.accountMappings = {
      defaultExpenseAccount: config.defaultExpenseAccount || '54',
      defaultIncomeAccount: config.defaultIncomeAccount || '42',
      defaultAPAccount: config.defaultAPAccount || '33',
      defaultARAccount: config.defaultARAccount || '84'
    };

    // Vendor mapping cache
    this.vendorCache = new Map();
    this.customerCache = new Map();
    this.itemCache = new Map();
  }

  // ========================================
  // VENDOR BILL PROCESSING
  // ========================================

  /**
   * Process a vendor invoice/bill
   */
  async processInvoice(invoiceData) {
    const { type, vendor, invoiceNumber, amount, dueDate, lineItems } = invoiceData;

    // Validate required fields
    if (!vendor || !amount) {
      throw new Error('Vendor and amount are required');
    }

    // Find or create vendor
    const vendorRef = await this.getOrCreateVendor(vendor);

    // Check for duplicate
    const existing = await this.checkDuplicateBill(vendorRef.value, invoiceNumber);
    if (existing) {
      return {
        status: 'duplicate',
        billId: existing.Id,
        message: `Bill ${invoiceNumber} already exists`
      };
    }

    // Build bill structure
    const billData = {
      VendorRef: vendorRef,
      DocNumber: invoiceNumber,
      DueDate: dueDate || this.calculateDueDate(30),
      TotalAmt: amount,
      Line: await this.buildBillLines(lineItems, amount)
    };

    // Create bill in QuickBooks
    const bill = await this.quickbooks.createBill(billData);

    this.logger?.info('Bill created', {
      billId: bill.Id,
      vendor: vendor,
      amount: amount
    });

    return {
      status: 'created',
      billId: bill.Id,
      docNumber: bill.DocNumber,
      amount: bill.TotalAmt
    };
  }

  /**
   * Build bill line items
   */
  async buildBillLines(lineItems, totalAmount) {
    if (!lineItems || lineItems.length === 0) {
      // Single line with total amount
      return [{
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: totalAmount,
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: this.accountMappings.defaultExpenseAccount }
        }
      }];
    }

    const lines = [];
    
    for (const item of lineItems) {
      if (item.itemId) {
        // Item-based line
        lines.push({
          DetailType: 'ItemBasedExpenseLineDetail',
          Amount: item.amount,
          ItemBasedExpenseLineDetail: {
            ItemRef: { value: item.itemId },
            Qty: item.quantity || 1,
            UnitPrice: item.unitPrice || item.amount
          },
          Description: item.description
        });
      } else {
        // Account-based line
        lines.push({
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: item.amount,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: item.accountId || this.accountMappings.defaultExpenseAccount }
          },
          Description: item.description
        });
      }
    }

    return lines;
  }

  // ========================================
  // CUSTOMER INVOICE PROCESSING
  // ========================================

  /**
   * Create invoice from ServiceTitan invoice data
   */
  async createInvoiceFromServiceTitan(stInvoice) {
    // Map ServiceTitan customer to QBO customer
    const customerRef = await this.getOrCreateCustomer({
      name: stInvoice.customer?.name,
      email: stInvoice.customer?.email,
      address: stInvoice.summary?.location?.address
    });

    // Build invoice line items
    const lines = await this.buildInvoiceLinesFromST(stInvoice.items);

    const invoiceData = {
      CustomerRef: customerRef,
      DocNumber: stInvoice.number,
      TxnDate: stInvoice.invoiceDate || stInvoice.createdOn,
      DueDate: stInvoice.dueDate || this.calculateDueDate(30),
      Line: lines,
      CustomField: [
        {
          DefinitionId: '1',
          Name: 'ServiceTitan ID',
          Type: 'StringType',
          StringValue: stInvoice.id?.toString()
        },
        {
          DefinitionId: '2', 
          Name: 'Job Number',
          Type: 'StringType',
          StringValue: stInvoice.job?.number
        }
      ]
    };

    // Add sales tax if present
    if (stInvoice.summary?.taxAmount) {
      invoiceData.TxnTaxDetail = {
        TotalTax: stInvoice.summary.taxAmount
      };
    }

    // Create invoice
    const invoice = await this.quickbooks.createInvoice(invoiceData);

    this.logger?.info('Invoice created from ServiceTitan', {
      qboId: invoice.Id,
      stId: stInvoice.id,
      amount: invoice.TotalAmt
    });

    return invoice;
  }

  /**
   * Build invoice lines from ServiceTitan items
   */
  async buildInvoiceLinesFromST(items) {
    if (!items || items.length === 0) {
      return [{
        DetailType: 'SalesItemLineDetail',
        Amount: 0,
        Description: 'Services Rendered',
        SalesItemLineDetail: {
          ItemRef: { value: '1' } // Default service item
        }
      }];
    }

    const lines = [];

    for (const item of items) {
      // Try to find matching QBO item
      let itemRef = await this.findOrCreateItem(item);

      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: item.total || (item.quantity * item.unitPrice),
        Description: item.description || item.skuName,
        SalesItemLineDetail: {
          ItemRef: itemRef,
          Qty: item.quantity || 1,
          UnitPrice: item.unitPrice
        }
      });
    }

    return lines;
  }

  // ========================================
  // ENTITY MANAGEMENT
  // ========================================

  /**
   * Get or create vendor in QuickBooks
   */
  async getOrCreateVendor(vendorInfo) {
    // Normalize vendor name
    const displayName = typeof vendorInfo === 'string' 
      ? vendorInfo 
      : vendorInfo.name || vendorInfo.displayName;

    // Check cache
    if (this.vendorCache.has(displayName)) {
      return this.vendorCache.get(displayName);
    }

    // Search in QuickBooks
    let vendor = await this.quickbooks.findVendorByName(displayName);

    if (!vendor) {
      // Create new vendor
      const vendorData = typeof vendorInfo === 'string'
        ? { DisplayName: displayName }
        : {
            DisplayName: displayName,
            PrimaryEmailAddr: vendorInfo.email ? { Address: vendorInfo.email } : undefined,
            PrimaryPhone: vendorInfo.phone ? { FreeFormNumber: vendorInfo.phone } : undefined
          };

      vendor = await this.quickbooks.createVendor(vendorData);
      this.logger?.info('Created new vendor', { name: displayName, id: vendor.Id });
    }

    const vendorRef = { value: vendor.Id, name: vendor.DisplayName };
    this.vendorCache.set(displayName, vendorRef);

    return vendorRef;
  }

  /**
   * Get or create customer in QuickBooks
   */
  async getOrCreateCustomer(customerInfo) {
    const displayName = customerInfo.name;

    // Check cache
    if (this.customerCache.has(displayName)) {
      return this.customerCache.get(displayName);
    }

    // Search in QuickBooks
    let customer = await this.quickbooks.findCustomerByName(displayName);

    if (!customer) {
      // Create new customer
      const customerData = {
        DisplayName: displayName,
        PrimaryEmailAddr: customerInfo.email ? { Address: customerInfo.email } : undefined,
        BillAddr: customerInfo.address ? {
          Line1: customerInfo.address.street || customerInfo.address.line1,
          City: customerInfo.address.city,
          CountrySubDivisionCode: customerInfo.address.state,
          PostalCode: customerInfo.address.zip || customerInfo.address.postalCode
        } : undefined
      };

      customer = await this.quickbooks.createCustomer(customerData);
      this.logger?.info('Created new customer', { name: displayName, id: customer.Id });
    }

    const customerRef = { value: customer.Id, name: customer.DisplayName };
    this.customerCache.set(displayName, customerRef);

    return customerRef;
  }

  /**
   * Find or create item (product/service)
   */
  async findOrCreateItem(itemInfo) {
    const itemName = itemInfo.skuName || itemInfo.name || itemInfo.description?.substring(0, 100);

    // Check cache
    if (this.itemCache.has(itemName)) {
      return this.itemCache.get(itemName);
    }

    // Search in QuickBooks
    let item = await this.quickbooks.findItemByName(itemName);

    if (!item) {
      // Create as service item
      const itemData = {
        Name: itemName,
        Type: itemInfo.type === 'material' ? 'NonInventory' : 'Service',
        IncomeAccountRef: { value: this.accountMappings.defaultIncomeAccount },
        UnitPrice: itemInfo.unitPrice || 0
      };

      try {
        item = await this.quickbooks.createItem(itemData);
        this.logger?.info('Created new item', { name: itemName, id: item.Id });
      } catch (error) {
        // If item creation fails, use default service
        this.logger?.warn('Failed to create item, using default', { name: itemName, error: error.message });
        return { value: '1' }; // Default service item
      }
    }

    const itemRef = { value: item.Id, name: item.Name };
    this.itemCache.set(itemName, itemRef);

    return itemRef;
  }

  // ========================================
  // DUPLICATE DETECTION
  // ========================================

  /**
   * Check for duplicate bill
   */
  async checkDuplicateBill(vendorId, docNumber) {
    if (!docNumber) return null;

    const bills = await this.quickbooks.getBills({ vendorId });
    return bills.find(bill => bill.DocNumber === docNumber);
  }

  /**
   * Check for duplicate invoice
   */
  async checkDuplicateInvoice(customerId, docNumber) {
    if (!docNumber) return null;

    const invoices = await this.quickbooks.getInvoicesByCustomer(customerId);
    return invoices.find(inv => inv.DocNumber === docNumber);
  }

  // ========================================
  // EMAIL INVOICE EXTRACTION
  // ========================================

  /**
   * Extract invoice data from email attachment or body
   */
  async extractInvoiceFromEmail(email) {
    const extractedData = {
      vendor: null,
      invoiceNumber: null,
      amount: null,
      dueDate: null,
      lineItems: []
    };

    // Try to extract from subject
    const subjectPatterns = {
      invoiceNumber: /(?:invoice|inv|bill)[\s#:]*([A-Z0-9-]+)/i,
      amount: /\$[\d,]+\.?\d*/
    };

    if (email.subject) {
      const invMatch = email.subject.match(subjectPatterns.invoiceNumber);
      if (invMatch) extractedData.invoiceNumber = invMatch[1];

      const amountMatch = email.subject.match(subjectPatterns.amount);
      if (amountMatch) extractedData.amount = this.parseAmount(amountMatch[0]);
    }

    // Try to extract from sender
    if (email.from) {
      extractedData.vendor = this.extractVendorFromEmail(email.from);
    }

    // Parse body for additional details
    if (email.body) {
      const bodyData = this.parseInvoiceFromText(email.body);
      extractedData.amount = extractedData.amount || bodyData.amount;
      extractedData.dueDate = bodyData.dueDate;
      extractedData.invoiceNumber = extractedData.invoiceNumber || bodyData.invoiceNumber;
    }

    // TODO: PDF attachment parsing using OCR/AI
    if (email.attachments && email.attachments.length > 0) {
      // Would integrate with Azure Form Recognizer or similar
      this.logger?.info('PDF extraction not yet implemented');
    }

    return extractedData;
  }

  /**
   * Parse invoice details from text
   */
  parseInvoiceFromText(text) {
    const result = {
      amount: null,
      dueDate: null,
      invoiceNumber: null
    };

    // Amount patterns
    const amountPatterns = [
      /(?:total|amount due|balance due)[\s:]*\$?([\d,]+\.?\d*)/i,
      /\$\s*([\d,]+\.?\d*)/
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.amount = this.parseAmount(match[1]);
        break;
      }
    }

    // Due date patterns
    const dueDatePatterns = [
      /(?:due date|due by|payment due)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:due date|due by|payment due)[\s:]*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i
    ];

    for (const pattern of dueDatePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.dueDate = this.parseDate(match[1]);
        break;
      }
    }

    // Invoice number patterns
    const invPatterns = [
      /(?:invoice|inv|bill)[\s#:]*([A-Z0-9-]+)/i
    ];

    for (const pattern of invPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.invoiceNumber = match[1];
        break;
      }
    }

    return result;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  extractVendorFromEmail(fromAddress) {
    // Try to extract company name from email domain
    const emailMatch = fromAddress.match(/<([^>]+)>/) || [null, fromAddress];
    const email = emailMatch[1];
    
    if (email) {
      const domain = email.split('@')[1];
      if (domain) {
        // Remove common suffixes
        let companyName = domain.split('.')[0];
        // Capitalize first letter
        companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
        return companyName;
      }
    }

    // Fall back to display name
    const displayName = fromAddress.replace(/<[^>]+>/, '').trim();
    return displayName || 'Unknown Vendor';
  }

  parseAmount(amountStr) {
    if (!amountStr) return null;
    // Remove currency symbols, commas, spaces
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  calculateDueDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.vendorCache.clear();
    this.customerCache.clear();
    this.itemCache.clear();
  }
}

module.exports = { InvoiceProcessor };
