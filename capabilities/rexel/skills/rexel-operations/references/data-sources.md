# Rexel Data Sources

## CSV Source Files

Invoice data is processed from CSV exports in:
```
~/Phoenix_Local/VISION FILESYSTEM.../REXEL_COLLECTION_TEMP/extracted/
```

### Batches

| Batch | Files |
|-------|-------|
| 1-500 rexel Invoices | LineItems + Pricing |
| 2-499 rexel | LineItems + Pricing |
| 3-499 rexel | LineItems + Pricing |
| MultipleFiles-12-17-2025 | LineItems + Pricing |
| MultipleFiles-12-17-2025 (1-5) | LineItems + Pricing each |

### CSV Schemas

**REXEL_LineItems.csv** — Line-level invoice detail:
- Invoice #, Job Name, PO #, SKU, Item Number
- Item Qty, Ship Qty, Alias, Unit Price
- DiscountPercentorChain, Unit, Total

**REXEL_Pricing.csv** — Invoice header info:
- CustomerNumber, InvoiceNumber, PurchaseOrderNumber
- JobName, ProcessDate, InvoiceDate, PaidInd
- HasSignatureOrPhoto, TtlDisc, Note, Freight, TotalInvoiceAmount

### Join Key
Both files share `Invoice #` / `InvoiceNumber` for date correlation.

## ETL Process

The `csv-processor.ts` script:
1. Recursively finds all REXEL_LineItems.csv and REXEL_Pricing.csv files
2. Builds an invoice date index from Pricing files
3. Processes LineItems: deduplicates by invoice+SKU+qty across batches
4. Aggregates per-SKU: min/max/last price, purchase count, total qty, total spend
5. Detects brands from SKU patterns and descriptions
6. Outputs `rexel-skus.json` with all aggregated data

### Re-running ETL
```bash
cd ~/GitHub/phoenix-ai-core-staging/packages/rexel-mcp-server
npm run etl        # processes CSVs and regenerates rexel-skus.json
npm run build      # compiles and copies data to dist/
```

## Data Stats (as of 2026-03-10)

- **Total CSV rows:** 18,673
- **Deduped line items:** 11,672
- **Unique SKUs:** 1,624
- **Total spend:** $1,011,282
- **Invoice dates indexed:** 2,215
