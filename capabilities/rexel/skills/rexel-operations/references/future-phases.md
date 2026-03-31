# Rexel Plugin — Future Phases

## Phase 2: SFTP Auto-Fetch

Rexel provides invoice data via SFTP. SSH keys already exist at `~/.ssh/rexel_sftp`.

**Plan:**
- SessionStart hook checks data staleness (>7 days = warning)
- Scheduled SFTP pull of new CSV batches
- Auto-run ETL to rebuild rexel-skus.json
- Notify user of new items or price changes

## Phase 2: Firecrawl Product Photos

Use Firecrawl to scrape product images from Rexel's website for each SKU.

**Plan:**
- Map SKUs to Rexel product URLs
- Firecrawl scrape product pages for images
- Store images locally or in cloud storage
- Link images to pricebook entries

## Phase 2: Requisition Orders

Generate formatted purchase orders for Rexel's ordering system.

**Plan:**
- Build order template from SKU data
- Include job references for PO tracking
- Format for Rexel's submission system
- Track order status

## Phase 2: Price Change Alerts

Detect and alert on significant price changes between ETL runs.

**Plan:**
- Compare new rexel-skus.json against previous version
- Flag items with >5% price increase
- Generate change report
- Suggest pricebook updates for affected items
