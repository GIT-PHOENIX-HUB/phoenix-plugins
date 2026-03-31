/**
 * Bank Reconciliation Engine
 * 
 * Matches bank transactions to QuickBooks transactions
 * and identifies discrepancies for review.
 */

class Reconciliation {
  constructor(config = {}) {
    this.quickbooks = config.quickbooks;
    this.bankAggregator = config.bankAggregator;
    this.logger = config.logger;
    
    // Matching configuration
    this.matchConfig = {
      amountTolerance: config.amountTolerance || 0.01, // $0.01 tolerance
      dateTolerance: config.dateTolerance || 3, // 3 days
      autoMatchThreshold: config.autoMatchThreshold || 0.95 // 95% confidence
    };

    // Categorization rules
    this.categorizationRules = config.categorizationRules || this.getDefaultRules();
  }

  // ========================================
  // RECONCILIATION OPERATIONS
  // ========================================

  /**
   * Run full reconciliation for an account
   */
  async reconcile(options) {
    const { accountId, asOfDate, autoMatch = true } = options;

    // Get bank transactions
    const startDate = this.getReconciliationStartDate(asOfDate);
    const bankTxns = await this.bankAggregator.getTransactions(accountId, {
      startDate,
      endDate: asOfDate
    });

    // Get QBO transactions for same period
    const qboTxns = await this.getQBOTransactions(accountId, startDate, asOfDate);

    // Perform matching
    const matches = [];
    const unmatchedBank = [];
    const unmatchedQBO = [...qboTxns];

    for (const bankTxn of bankTxns) {
      let bestMatch = null;
      let bestScore = 0;

      for (let i = 0; i < unmatchedQBO.length; i++) {
        const qboTxn = unmatchedQBO[i];
        const score = this.calculateMatchScore(bankTxn, qboTxn);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { qboTxn, index: i };
        }
      }

      if (autoMatch && bestMatch && bestScore >= this.matchConfig.autoMatchThreshold) {
        // Auto-match
        matches.push({
          bankTransaction: bankTxn,
          qboTransaction: bestMatch.qboTxn,
          matchScore: bestScore,
          autoMatched: true
        });
        unmatchedQBO.splice(bestMatch.index, 1);
      } else if (bestMatch && bestScore > 0.5) {
        // Potential match - needs review
        matches.push({
          bankTransaction: bankTxn,
          qboTransaction: bestMatch.qboTxn,
          matchScore: bestScore,
          autoMatched: false,
          needsReview: true
        });
        unmatchedQBO.splice(bestMatch.index, 1);
      } else {
        // No match found
        unmatchedBank.push({
          transaction: bankTxn,
          suggestedCategory: this.categorizeTransaction(bankTxn)
        });
      }
    }

    // Calculate discrepancy
    const bankBalance = await this.getBankEndingBalance(accountId, asOfDate);
    const qboBalance = await this.getQBOEndingBalance(accountId, asOfDate);
    const discrepancy = Math.abs(bankBalance - qboBalance);

    const result = {
      accountId,
      asOfDate,
      matched: matches.filter(m => m.autoMatched),
      needsReview: matches.filter(m => m.needsReview),
      unmatched: {
        bank: unmatchedBank,
        qbo: unmatchedQBO
      },
      balances: {
        bank: bankBalance,
        qbo: qboBalance,
        discrepancy
      },
      status: discrepancy < this.matchConfig.amountTolerance ? 'balanced' : 'discrepancy',
      timestamp: new Date().toISOString()
    };

    this.logger?.info('Reconciliation completed', {
      accountId,
      matched: result.matched.length,
      unmatched: unmatchedBank.length + unmatchedQBO.length,
      discrepancy
    });

    return result;
  }

  /**
   * Calculate match score between bank and QBO transaction
   */
  calculateMatchScore(bankTxn, qboTxn) {
    let score = 0;
    let factors = 0;

    // Amount matching (highest weight)
    const bankAmount = Math.abs(bankTxn.amount);
    const qboAmount = Math.abs(qboTxn.TotalAmt || qboTxn.Amount);
    const amountDiff = Math.abs(bankAmount - qboAmount);
    
    if (amountDiff <= this.matchConfig.amountTolerance) {
      score += 0.4; // Perfect match
    } else if (amountDiff <= 1) {
      score += 0.3;
    } else if (amountDiff / bankAmount <= 0.05) {
      score += 0.2; // Within 5%
    }
    factors++;

    // Date matching
    const bankDate = new Date(bankTxn.date);
    const qboDate = new Date(qboTxn.TxnDate);
    const daysDiff = Math.abs((bankDate - qboDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      score += 0.3;
    } else if (daysDiff <= this.matchConfig.dateTolerance) {
      score += 0.2;
    } else if (daysDiff <= 7) {
      score += 0.1;
    }
    factors++;

    // Name/memo matching
    const bankName = (bankTxn.name || bankTxn.merchantName || '').toLowerCase();
    const qboName = (qboTxn.EntityRef?.name || qboTxn.PayeeRef?.name || qboTxn.PrivateNote || '').toLowerCase();
    
    if (bankName && qboName) {
      const nameWords = bankName.split(/\s+/);
      const matchingWords = nameWords.filter(word => qboName.includes(word));
      
      if (matchingWords.length > 0) {
        score += 0.3 * (matchingWords.length / nameWords.length);
      }
    }
    factors++;

    return score;
  }

  /**
   * Create a match record
   */
  async createMatch(matchData) {
    const { bankTransactionId, qboTransactionId, qboTransactionType } = matchData;

    // In a production system, this would update a matches table
    // and potentially mark transactions as reconciled in QBO

    this.logger?.audit('reconciliation_match_created', {
      bankTxnId: bankTransactionId,
      qboTxnId: qboTransactionId,
      qboTxnType: qboTransactionType
    });

    return {
      success: true,
      matchId: `${bankTransactionId}-${qboTransactionId}`,
      timestamp: new Date().toISOString()
    };
  }

  // ========================================
  // TRANSACTION CATEGORIZATION
  // ========================================

  /**
   * Categorize a bank transaction
   */
  categorizeTransaction(transaction) {
    const name = (transaction.name || transaction.merchantName || '').toLowerCase();
    const amount = transaction.amount;

    for (const rule of this.categorizationRules) {
      if (this.matchesRule(transaction, rule)) {
        return {
          category: rule.category,
          accountId: rule.accountId,
          confidence: rule.confidence || 0.8,
          ruleName: rule.name
        };
      }
    }

    // Use Plaid's category as fallback
    if (transaction.category && transaction.category.length > 0) {
      return {
        category: transaction.category[0],
        confidence: 0.5,
        source: 'plaid'
      };
    }

    return {
      category: 'Uncategorized',
      confidence: 0,
      needsReview: true
    };
  }

  /**
   * Check if transaction matches a categorization rule
   */
  matchesRule(transaction, rule) {
    const name = (transaction.name || transaction.merchantName || '').toLowerCase();
    const amount = Math.abs(transaction.amount);

    // Pattern matching
    if (rule.patterns) {
      const matches = rule.patterns.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(name);
        }
        return name.includes(pattern.toLowerCase());
      });
      if (!matches) return false;
    }

    // Amount range
    if (rule.minAmount && amount < rule.minAmount) return false;
    if (rule.maxAmount && amount > rule.maxAmount) return false;

    // Transaction type (debit/credit)
    if (rule.transactionType) {
      const isCredit = transaction.amount < 0; // Plaid convention
      if (rule.transactionType === 'credit' && !isCredit) return false;
      if (rule.transactionType === 'debit' && isCredit) return false;
    }

    return true;
  }

  /**
   * Get default categorization rules
   */
  getDefaultRules() {
    return [
      {
        name: 'Payroll',
        patterns: ['payroll', 'gusto', 'adp', 'paychex', 'direct deposit'],
        category: 'Payroll Expenses',
        accountId: '62',
        confidence: 0.9
      },
      {
        name: 'Rent',
        patterns: ['rent', 'lease payment', 'landlord'],
        category: 'Rent Expense',
        accountId: '68',
        confidence: 0.85
      },
      {
        name: 'Utilities',
        patterns: ['electric', 'gas bill', 'water bill', 'utility', 'power company'],
        category: 'Utilities',
        accountId: '69',
        confidence: 0.85
      },
      {
        name: 'Insurance',
        patterns: ['insurance', 'geico', 'progressive', 'state farm', 'allstate'],
        category: 'Insurance',
        accountId: '70',
        confidence: 0.85
      },
      {
        name: 'Office Supplies',
        patterns: ['office depot', 'staples', 'amazon.com', 'walmart'],
        category: 'Office Supplies',
        accountId: '55',
        confidence: 0.7
      },
      {
        name: 'Fuel',
        patterns: ['shell', 'chevron', 'exxon', 'mobil', 'bp', 'gas station', 'fuel'],
        category: 'Vehicle Fuel',
        accountId: '56',
        confidence: 0.85
      },
      {
        name: 'Merchant Fees',
        patterns: ['stripe', 'square', 'paypal', 'merchant fee', 'processing fee'],
        category: 'Merchant Account Fees',
        accountId: '57',
        confidence: 0.9
      },
      {
        name: 'Software/Subscriptions',
        patterns: ['microsoft', 'adobe', 'google', 'slack', 'zoom', 'dropbox'],
        category: 'Software Subscriptions',
        accountId: '58',
        confidence: 0.85
      },
      {
        name: 'Bank Fees',
        patterns: ['service charge', 'monthly fee', 'overdraft', 'nsf fee', 'wire fee'],
        category: 'Bank Service Charges',
        accountId: '59',
        confidence: 0.9
      },
      {
        name: 'Customer Payment',
        patterns: ['customer payment', 'deposit', 'transfer from'],
        transactionType: 'credit',
        category: 'Customer Payment',
        accountId: '1',
        confidence: 0.7
      }
    ];
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  async getQBOTransactions(accountId, startDate, endDate) {
    // Get various transaction types that affect the bank account
    const [purchases, payments, deposits, transfers] = await Promise.all([
      this.quickbooks.query(
        `SELECT * FROM Purchase WHERE AccountRef = '${accountId}' AND TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      ),
      this.quickbooks.query(
        `SELECT * FROM Payment WHERE DepositToAccountRef = '${accountId}' AND TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      ),
      this.quickbooks.query(
        `SELECT * FROM Deposit WHERE DepositToAccountRef = '${accountId}' AND TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      ),
      this.quickbooks.query(
        `SELECT * FROM Transfer WHERE FromAccountRef = '${accountId}' OR ToAccountRef = '${accountId}' AND TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
      )
    ].map(p => p.catch(() => []))); // Handle missing permissions gracefully

    return [
      ...purchases.map(p => ({ ...p, Type: 'Purchase' })),
      ...payments.map(p => ({ ...p, Type: 'Payment' })),
      ...deposits.map(d => ({ ...d, Type: 'Deposit' })),
      ...transfers.map(t => ({ ...t, Type: 'Transfer' }))
    ];
  }

  async getBankEndingBalance(accountId, asOfDate) {
    const balances = await this.bankAggregator.getBalances();
    const account = balances.find(b => b.accountId === accountId);
    return account?.balance || 0;
  }

  async getQBOEndingBalance(accountId, asOfDate) {
    // Would query QBO account balance
    try {
      const accounts = await this.quickbooks.getAccounts();
      const account = accounts.find(a => a.Id === accountId);
      return account?.CurrentBalance || 0;
    } catch (error) {
      this.logger?.warn('Failed to get QBO balance', { accountId, error: error.message });
      return 0;
    }
  }

  getReconciliationStartDate(asOfDate) {
    // Start 30 days before asOfDate
    const start = new Date(asOfDate);
    start.setDate(start.getDate() - 30);
    return start.toISOString().split('T')[0];
  }

  // ========================================
  // RULE MANAGEMENT
  // ========================================

  /**
   * Add a categorization rule
   */
  addRule(rule) {
    this.categorizationRules.push(rule);
  }

  /**
   * Update a categorization rule
   */
  updateRule(ruleName, updates) {
    const index = this.categorizationRules.findIndex(r => r.name === ruleName);
    if (index >= 0) {
      this.categorizationRules[index] = {
        ...this.categorizationRules[index],
        ...updates
      };
      return true;
    }
    return false;
  }

  /**
   * Remove a categorization rule
   */
  removeRule(ruleName) {
    const index = this.categorizationRules.findIndex(r => r.name === ruleName);
    if (index >= 0) {
      this.categorizationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all categorization rules
   */
  getRules() {
    return [...this.categorizationRules];
  }

  // ========================================
  // REPORTING
  // ========================================

  /**
   * Generate reconciliation summary report
   */
  generateReconciliationReport(reconciliationResult) {
    const { accountId, asOfDate, matched, needsReview, unmatched, balances } = reconciliationResult;

    return {
      title: 'Bank Reconciliation Report',
      account: accountId,
      period: asOfDate,
      summary: {
        bankBalance: balances.bank,
        bookBalance: balances.qbo,
        difference: balances.discrepancy,
        status: balances.discrepancy < 0.01 ? 'Reconciled' : 'Needs Attention'
      },
      transactions: {
        totalMatched: matched.length,
        needsReview: needsReview.length,
        unmatchedBank: unmatched.bank.length,
        unmatchedBooks: unmatched.qbo.length
      },
      items: {
        matched: matched.map(m => ({
          date: m.bankTransaction.date,
          description: m.bankTransaction.name,
          bankAmount: m.bankTransaction.amount,
          bookAmount: m.qboTransaction.TotalAmt || m.qboTransaction.Amount,
          matchScore: (m.matchScore * 100).toFixed(0) + '%'
        })),
        pendingReview: needsReview.map(m => ({
          date: m.bankTransaction.date,
          description: m.bankTransaction.name,
          bankAmount: m.bankTransaction.amount,
          suggestedMatch: m.qboTransaction.PrivateNote || m.qboTransaction.EntityRef?.name,
          confidence: (m.matchScore * 100).toFixed(0) + '%'
        })),
        outstanding: [
          ...unmatched.bank.map(u => ({
            source: 'Bank',
            date: u.transaction.date,
            description: u.transaction.name,
            amount: u.transaction.amount,
            suggestedCategory: u.suggestedCategory?.category
          })),
          ...unmatched.qbo.map(t => ({
            source: 'Books',
            date: t.TxnDate,
            description: t.PrivateNote || t.EntityRef?.name || 'Unknown',
            amount: t.TotalAmt || t.Amount
          }))
        ]
      },
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = { Reconciliation };
