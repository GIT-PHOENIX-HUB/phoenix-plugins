/**
 * Vendor Feed Processor
 * 
 * Handles SFTP-based vendor invoice feeds for automated bill ingestion.
 * Supports multiple file formats: CSV, EDI, XML.
 */

const { Client: SFTPClient } = require('ssh2-sftp-client');
const { parse: parseCSV } = require('csv-parse/sync');
const { parseStringPromise: parseXML } = require('xml2js');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

class VendorFeedProcessor {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.SFTP_HOST,
      port: config.port || parseInt(process.env.SFTP_PORT || '22'),
      username: config.username || process.env.SFTP_USERNAME,
      password: config.password || process.env.SFTP_PASSWORD,
      privateKey: config.privateKey || process.env.SFTP_PRIVATE_KEY,
      inboxPath: config.inboxPath || '/incoming',
      archivePath: config.archivePath || '/archive',
      errorPath: config.errorPath || '/errors',
      keyVaultName: config.keyVaultName || process.env.KEY_VAULT_NAME,
      ...config
    };

    // Vendor-specific parsers
    this.vendorParsers = new Map();
    this.registerDefaultParsers();
  }

  /**
   * Load credentials from Key Vault
   */
  async loadCredentials() {
    if (this.config.keyVaultName) {
      const credential = new DefaultAzureCredential();
      const vaultUrl = `https://${this.config.keyVaultName}.vault.azure.net`;
      const secretClient = new SecretClient(vaultUrl, credential);

      try {
        const [host, username, password] = await Promise.all([
          secretClient.getSecret('SFTP-Host'),
          secretClient.getSecret('SFTP-Username'),
          secretClient.getSecret('SFTP-Password')
        ]);

        this.config.host = host.value;
        this.config.username = username.value;
        this.config.password = password.value;
      } catch (error) {
        console.warn('Could not load SFTP credentials from Key Vault:', error.message);
      }
    }
  }

  /**
   * Create SFTP connection
   */
  async connect() {
    await this.loadCredentials();

    const sftp = new SFTPClient();
    
    await sftp.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      privateKey: this.config.privateKey
    });

    return sftp;
  }

  // ========================================
  // FEED DOWNLOAD & MANAGEMENT
  // ========================================

  /**
   * Download pending feeds from SFTP
   */
  async downloadPendingFeeds() {
    const sftp = await this.connect();
    const feeds = [];

    try {
      const files = await sftp.list(this.config.inboxPath);
      
      for (const file of files) {
        if (file.type === '-' && this.isSupportedFormat(file.name)) {
          const remotePath = path.join(this.config.inboxPath, file.name);
          const content = await sftp.get(remotePath);
          
          feeds.push({
            filename: file.name,
            remotePath,
            content: content.toString(),
            size: file.size,
            modifyTime: file.modifyTime,
            vendor: this.detectVendor(file.name),
            format: this.detectFormat(file.name)
          });
        }
      }
    } finally {
      await sftp.end();
    }

    return feeds;
  }

  /**
   * Archive processed feed
   */
  async archiveFeed(filename) {
    const sftp = await this.connect();
    
    try {
      const sourcePath = path.join(this.config.inboxPath, filename);
      const archiveName = this.generateArchiveName(filename);
      const destPath = path.join(this.config.archivePath, archiveName);
      
      await sftp.rename(sourcePath, destPath);
      
      return { success: true, archivedAs: archiveName };
    } finally {
      await sftp.end();
    }
  }

  /**
   * Move feed to error folder
   */
  async moveToErrors(filename, errorMessage) {
    const sftp = await this.connect();
    
    try {
      const sourcePath = path.join(this.config.inboxPath, filename);
      const errorName = `ERROR_${new Date().toISOString().split('T')[0]}_${filename}`;
      const destPath = path.join(this.config.errorPath, errorName);
      
      await sftp.rename(sourcePath, destPath);
      
      // Write error log file
      const logPath = path.join(this.config.errorPath, `${errorName}.log`);
      await sftp.put(Buffer.from(errorMessage), logPath);
      
      return { success: true, movedTo: errorName };
    } finally {
      await sftp.end();
    }
  }

  // ========================================
  // FEED PROCESSING
  // ========================================

  /**
   * Process a downloaded feed
   */
  async processFeed(feed) {
    const { filename, content, vendor, format } = feed;

    // Get vendor-specific parser
    const parser = this.vendorParsers.get(vendor) || this.vendorParsers.get('default');
    
    if (!parser) {
      throw new Error(`No parser available for vendor: ${vendor}`);
    }

    // Parse based on format
    let rawData;
    switch (format) {
      case 'csv':
        rawData = this.parseCSV(content);
        break;
      case 'xml':
        rawData = await this.parseXML(content);
        break;
      case 'edi':
        rawData = this.parseEDI(content);
        break;
      case 'json':
        rawData = JSON.parse(content);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Transform using vendor parser
    const lineItems = parser.transform(rawData, { filename, vendor });

    return {
      filename,
      vendor,
      format,
      recordCount: Array.isArray(rawData) ? rawData.length : 1,
      lineItems,
      processedAt: new Date().toISOString()
    };
  }

  // ========================================
  // FORMAT PARSERS
  // ========================================

  /**
   * Parse CSV content
   */
  parseCSV(content) {
    return parseCSV(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  }

  /**
   * Parse XML content
   */
  async parseXML(content) {
    const result = await parseXML(content, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });
    return result;
  }

  /**
   * Parse EDI content (X12 810 Invoice)
   */
  parseEDI(content) {
    const segments = content.split(/~|\n/).filter(s => s.trim());
    const invoices = [];
    let currentInvoice = null;

    for (const segment of segments) {
      const elements = segment.split('*');
      const segmentId = elements[0];

      switch (segmentId) {
        case 'BIG':
          // Beginning of Invoice
          currentInvoice = {
            invoiceDate: this.parseEDIDate(elements[1]),
            invoiceNumber: elements[2],
            poNumber: elements[4],
            lineItems: []
          };
          break;

        case 'N1':
          // Name Segment
          if (currentInvoice) {
            if (elements[1] === 'SE') {
              currentInvoice.vendor = elements[2];
            } else if (elements[1] === 'BY') {
              currentInvoice.buyer = elements[2];
            }
          }
          break;

        case 'IT1':
          // Invoice Line Item
          if (currentInvoice) {
            currentInvoice.lineItems.push({
              lineNumber: elements[1],
              quantity: parseFloat(elements[2]),
              unit: elements[3],
              unitPrice: parseFloat(elements[4]),
              productId: elements[7],
              description: elements[8] || ''
            });
          }
          break;

        case 'TDS':
          // Total Monetary Summary
          if (currentInvoice) {
            currentInvoice.totalAmount = parseFloat(elements[1]) / 100; // Implied decimal
          }
          break;

        case 'SE':
          // End of Transaction Set
          if (currentInvoice) {
            invoices.push(currentInvoice);
            currentInvoice = null;
          }
          break;
      }
    }

    return invoices;
  }

  /**
   * Parse EDI date format (CCYYMMDD)
   */
  parseEDIDate(dateStr) {
    if (!dateStr || dateStr.length < 8) return null;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // ========================================
  // VENDOR PARSERS
  // ========================================

  /**
   * Register default vendor parsers
   */
  registerDefaultParsers() {
    // Default CSV parser
    this.vendorParsers.set('default', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row.invoice_number || row.InvoiceNumber || row['Invoice #'] || `${meta.filename}-${index}`,
          description: row.description || row.Description || row.Item || 'Line Item',
          quantity: parseFloat(row.quantity || row.Quantity || row.Qty || 1),
          unitPrice: parseFloat(row.unit_price || row.UnitPrice || row.Price || row.amount || row.Amount || 0),
          amount: parseFloat(row.total || row.Total || row.amount || row.Amount || 0),
          dueDate: row.due_date || row.DueDate || row['Due Date'] || null
        }));
      }
    });

    // Ferguson Enterprises (plumbing supplies)
    this.vendorParsers.set('ferguson', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row['Invoice Number'],
          poNumber: row['PO Number'],
          description: `${row['Item Description']} (${row['Item Number']})`,
          quantity: parseFloat(row['Qty Shipped'] || 1),
          unitPrice: parseFloat(row['Unit Price'] || 0),
          amount: parseFloat(row['Extended Price'] || 0),
          dueDate: row['Due Date']
        }));
      }
    });

    // Lennox (HVAC equipment)
    this.vendorParsers.set('lennox', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row['Invoice'] || row['INVOICE'],
          description: row['Description'] || row['DESCRIPTION'],
          modelNumber: row['Model'] || row['MODEL'],
          quantity: parseFloat(row['Qty'] || row['QTY'] || 1),
          unitPrice: parseFloat(row['Price'] || row['PRICE'] || 0),
          amount: parseFloat(row['Amount'] || row['AMOUNT'] || row['Total'] || 0)
        }));
      }
    });

    // Carrier (HVAC equipment)
    this.vendorParsers.set('carrier', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row['InvoiceNo'],
          partNumber: row['PartNo'],
          description: row['PartDescription'],
          quantity: parseFloat(row['OrderQty'] || 1),
          unitPrice: parseFloat(row['UnitPrice'] || 0),
          amount: parseFloat(row['NetAmount'] || 0),
          orderNumber: row['OrderNo']
        }));
      }
    });

    // Grainger (MRO supplies)
    this.vendorParsers.set('grainger', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row['Invoice Number'],
          itemNumber: row['Grainger Item #'],
          description: row['Item Description'],
          quantity: parseFloat(row['Quantity'] || 1),
          unitPrice: parseFloat(row['Unit Price']?.replace('$', '') || 0),
          amount: parseFloat(row['Extended Price']?.replace('$', '') || 0)
        }));
      }
    });

    // Home Depot Pro (supplies)
    this.vendorParsers.set('homedepot', {
      transform: (data, meta) => {
        if (!Array.isArray(data)) return [];
        
        return data.map((row, index) => ({
          lineNumber: index + 1,
          invoiceNumber: row['Invoice'],
          sku: row['SKU'],
          description: row['Product Description'],
          quantity: parseFloat(row['Qty'] || 1),
          unitPrice: parseFloat(row['Price Each']?.replace('$', '') || 0),
          amount: parseFloat(row['Line Total']?.replace('$', '') || 0)
        }));
      }
    });
  }

  /**
   * Register a custom vendor parser
   */
  registerVendorParser(vendorKey, parser) {
    this.vendorParsers.set(vendorKey.toLowerCase(), parser);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if file format is supported
   */
  isSupportedFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.csv', '.xml', '.edi', '.x12', '.json', '.txt'].includes(ext);
  }

  /**
   * Detect file format from filename
   */
  detectFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    const formatMap = {
      '.csv': 'csv',
      '.xml': 'xml',
      '.edi': 'edi',
      '.x12': 'edi',
      '.json': 'json',
      '.txt': 'csv' // Assume tab-delimited
    };
    return formatMap[ext] || 'csv';
  }

  /**
   * Detect vendor from filename
   */
  detectVendor(filename) {
    const lower = filename.toLowerCase();
    
    if (lower.includes('ferguson')) return 'ferguson';
    if (lower.includes('lennox')) return 'lennox';
    if (lower.includes('carrier')) return 'carrier';
    if (lower.includes('grainger')) return 'grainger';
    if (lower.includes('homedepot') || lower.includes('hdpro')) return 'homedepot';
    
    return 'default';
  }

  /**
   * Generate archive filename with timestamp
   */
  generateArchiveName(filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    return `${base}_${timestamp}${ext}`;
  }

  /**
   * Test SFTP connection
   */
  async testConnection() {
    try {
      const sftp = await this.connect();
      const files = await sftp.list(this.config.inboxPath);
      await sftp.end();
      
      return {
        connected: true,
        host: this.config.host,
        inboxFiles: files.length
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = { VendorFeedProcessor };
