# ANTIGRAVITY MISSION: MCP VAULT SCRUB & DOCUMENTATION

---

## YOUR MISSION

Scrub the awesome-lists for additional MCP servers relevant to Phoenix Electric.
Claude Code is on SharePoint. You handle discovery and documentation.

---

## CURRENT STATE

**Location:** `~/GitHub/MCP_VAULT/` (Git initialized, not pushed yet)

### Actual Structure (14 repos, ~687MB)

```
MCP_VAULT/
├── _inventory/
│   ├── tier0-pricebook.md      # Excel/PDF tools - READY
│   └── manifest.md             # Current inventory
├── tools/documents/            # Tier 0 - 6 repos
│   ├── excel-mcp-server        # 30+ Excel tools (Python)
│   ├── excel-mcp-alt           # Excel read/write (Go+Node)
│   ├── mcp_pdf_forms           # PDF forms
│   ├── pdfco-mcp               # PDF.co (needs API key)
│   ├── document-edit-mcp       # Word/Excel/PDF
│   └── excel-to-pdf-mcp        # Spreadsheet to PDF
├── social/                     # Tier 1 - 3 repos
│   ├── facebook-mcp-server     # 27 Facebook tools
│   ├── meta-ads-mcp            # FB/Instagram ads
│   └── social-media-mcp        # Twitter/LinkedIn/Mastodon
├── official/                   # Tier 2 - 2 repos
│   ├── servers/                # Anthropic official MCPs
│   └── anthropic-cookbook/     # Integration patterns
└── reference/                  # SCRUB THESE - YOUR JOB
    ├── awesome-mcp-servers/    # TensorBlock (500+ indexed)
    ├── punkpeye-awesome/       # Another popular list
    └── wong2-awesome/          # Another popular list
```

---

## WHAT TO SCRUB FOR

Phoenix Electric = electrical contractor, Elbert/Douglas/Denver.

### Priority 1 - Pricebook Project (URGENT)
- More Excel/spreadsheet tools
- PDF generation/manipulation
- Pricing/quote automation

### Priority 2 - Business Ops
- QuickBooks / accounting integrations
- Scheduling / calendar
- Email automation
- CRM tools

### Priority 3 - Marketing (neglected FB page)
- More social media tools
- Review management (Google, Yelp)
- Local business marketing

### Priority 4 - Field Service
- GPS / routing
- Inventory management
- Time tracking

### Priority 5 - Integration
- Webhook / Zapier connectors
- REST API tools
- Database connectors

---

## YOUR WORKFLOW

### Step 1: Read the awesome-lists
```bash
cd ~/GitHub/MCP_VAULT/reference
cat awesome-mcp-servers/README.md | head -500
cat punkpeye-awesome/README.md | head -500
cat wong2-awesome/README.md | head -500
```

### Step 2: Create scrub report
```bash
touch ~/GitHub/MCP_VAULT/_inventory/SCRUB_REPORT.md
```

Format:
| Server | GitHub URL | Category | Priority | Notes |
|--------|------------|----------|----------|-------|

### Step 3: Clone discoveries
```bash
cd ~/GitHub/MCP_VAULT
mkdir -p accounting scheduling crm field-service integrations
git clone <url> <category>/<name>
```

### Step 4: Update manifest.md

### Step 5: Push to GitHub
```bash
cd ~/GitHub/MCP_VAULT
git add .
git commit -m "Scrub: added [X] servers for [category]"
# After first push, just:
git push origin main
```

**PUSH AFTER EVERY BATCH OF CLONES.**

---

## CONTEXT

- **Phoenix Electric:** Electrical contractor, Elbert/Douglas/Denver metro
- **~1,700 customers:** Residential, commercial, builders
- **Team:** Shane (CTO), Stephanie (office), Joe (ops), techs
- **ServiceTitan:** Field service management
- **Microsoft 365:** SharePoint, Teams, Outlook
- **QuickBooks:** Getting set up
- **Neglected Facebook page:** Needs revival
- **Phoenix AI Core:** 10-agent orchestration system
- **Deadline:** January 1, 2026 (11 days)

---

## DELIVERABLES

1. `_inventory/SCRUB_REPORT.md` - everything found in awesome-lists
2. Clone top discoveries into appropriate folders
3. Update `_inventory/manifest.md` with new repos
4. Push to GitHub (frequently!)
5. Report back: Top 5 servers to integrate first

---

## GIT COMMANDS REFERENCE

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Scrub: [description]"

# Push to remote
git push origin main

# If push fails (no upstream):
git push -u origin main
```

---

**"The more you save, the more you keep."**
