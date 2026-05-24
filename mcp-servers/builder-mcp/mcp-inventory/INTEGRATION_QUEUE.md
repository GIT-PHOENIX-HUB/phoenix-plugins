# MCP INTEGRATION PRIORITY QUEUE

**Generated:** 2025-12-21
**Deadline:** January 1, 2026 (11 days)
**Goal:** Wire MCP tools to Phoenix AI Core agents

---

## PHASE 1: PRICEBOOK PROJECT (THIS WEEK - Dec 21-28)

**Objective:** Enable Quote Generator agent to create pricebook and count sheets

| Order | Tool | Why | Effort | Deps |
|-------|------|-----|--------|------|
| 1 | excel-mcp-server | Core Excel operations - formulas, formatting, charts | Low | Python, uv |
| 2 | mcp_pdf_forms | Analyze existing count sheet PDFs | Low | Python, uv |
| 3 | document-edit-mcp | Create Word docs, convert to PDF | Low | Python |
| 4 | excel-to-pdf-mcp | Convert spreadsheets to PDF | Low | Node, LibreOffice |

### Integration Steps

**1. excel-mcp-server (Priority 1)**
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/excel-mcp-server
uv venv && source .venv/bin/activate
uv pip install -e .
claude mcp add excel -- excel-mcp-server
```

**2. mcp_pdf_forms (Priority 1)**
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/mcp_pdf_forms
uv venv && source .venv/bin/activate
uv pip install -e .
claude mcp add pdf-forms -- mcp-pdf-forms
```

**3. document-edit-mcp (Priority 1)**
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/document-edit-mcp
./setup.sh
# Follow Claude Desktop config in README
```

**4. excel-to-pdf-mcp (Priority 1)**
```bash
# First install LibreOffice
brew install libreoffice

cd ~/GitHub/MCP_VAULT/tools/documents/excel-to-pdf-mcp
npm install && npm run build
```

### Success Criteria
- [x] Can create Excel workbook with formulas (excel-mcp-server CONNECTED)
- [x] Can apply formatting (bold, colors, borders) (excel-mcp-server CONNECTED)
- [x] Can create pivot tables and charts (excel-mcp-server CONNECTED)
- [x] Can analyze existing PDF forms (pdf-forms CONNECTED)
- [x] Can create Word/PDF documents (document-edit CONNECTED)
- [ ] Can convert Excel to PDF (requires LibreOffice)

**STATUS: 3/4 Phase 1 tools installed and connected (Dec 21, 2025)**

---

## PHASE 2: FACEBOOK REVIVAL (Dec 28 - Jan 3)

**Objective:** Resurrect Phoenix Electric Facebook page with automated content

| Order | Tool | Why | Effort | Deps |
|-------|------|-----|--------|------|
| 5 | facebook-mcp-server | Core FB operations - posting, comments, analytics | Medium | FB Token |

### Prerequisites
1. Get Facebook Page Access Token:
   - Go to: https://developers.facebook.com/tools/explorer
   - Select your page
   - Generate token with permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`
     - `pages_manage_metadata`
   - Copy token to `.env` file

### Integration Steps

**5. facebook-mcp-server**
```bash
cd ~/GitHub/MCP_VAULT/social/facebook-mcp-server

# Create .env file
cat > .env << 'EOF'
FACEBOOK_ACCESS_TOKEN=your_token_here
FACEBOOK_PAGE_ID=your_page_id
EOF

# Install
uv pip install -r requirements.txt

# Add to Claude
# (follow config in README)
```

### Success Criteria
- [ ] Can post text to FB page
- [ ] Can post images
- [ ] Can view post analytics
- [ ] Can moderate comments
- [ ] Can schedule posts

---

## PHASE 3: ENHANCED PDF (Jan 3-10)

**Objective:** Full PDF capabilities including form filling and conversion

| Order | Tool | Why | Effort | Deps |
|-------|------|-----|--------|------|
| 6 | pdfco-mcp | Full PDF operations - conversion, forms, OCR | Low | PDF.co API key |

### Prerequisites
1. Sign up at https://pdf.co (free tier: 100 credits/month)
2. Get API key from dashboard

### Integration Steps

**6. pdfco-mcp**
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/pdfco-mcp
uv venv && source .venv/bin/activate
uv pip install -e .

# Set API key
export X_API_KEY=your_pdfco_api_key

# Add to Claude config with env var
```

### Success Criteria
- [ ] Can convert PDF to Excel
- [ ] Can convert Excel to PDF
- [ ] Can fill PDF forms
- [ ] Can merge/split PDFs
- [ ] Can OCR scanned documents

---

## PHASE 4: ADVERTISING (Jan 10-15)

**Objective:** Enable Meta Ads campaign management

| Order | Tool | Why | Effort | Deps |
|-------|------|-----|--------|------|
| 7 | meta-ads-mcp | FB/IG advertising - campaigns, targeting, analytics | Medium | Meta OAuth |

### Easiest Path: Remote MCP (Recommended)
```json
{
  "mcpServers": {
    "meta-ads": {
      "url": "https://mcp.pipeboard.co/meta-ads-mcp"
    }
  }
}
```
- No local setup needed
- OAuth handled by pipeboard.co
- Click "Needs login" to connect

### Success Criteria
- [ ] Can view ad accounts
- [ ] Can create campaigns
- [ ] Can set targeting (geo, interests)
- [ ] Can view performance insights

---

## PHASE 5: MULTI-PLATFORM (Jan 15-20)

**Objective:** Expand social presence beyond Facebook

| Order | Tool | Why | Effort | Deps |
|-------|------|-----|--------|------|
| 8 | social-media-mcp | Twitter, LinkedIn, Mastodon | High | Multiple API keys |

### Prerequisites (Many Keys Required)
- Twitter Developer Account (7 keys)
- LinkedIn Developer App (3 keys)
- Mastodon instance account (3 keys)
- Brave Search API key
- OpenAI or Anthropic key

### Integration Steps
```bash
cd ~/GitHub/MCP_VAULT/social/social-media-mcp
npm install
npm run build

# Create extensive .env file (see README for all keys)
```

### Success Criteria
- [ ] Can post to Twitter
- [ ] Can post to LinkedIn
- [ ] Can research trending topics

---

## PHASE 6: DISCOVERY & EXPANSION (Ongoing)

**Objective:** Find and integrate additional tools as needed

| Need | Source | Action |
|------|--------|--------|
| QuickBooks | awesome-lists | Search & clone |
| Google Calendar | official/servers | May already have |
| Email automation | awesome-lists | Search & clone |
| SMS/Twilio | awesome-lists | Search & clone |
| Review management | awesome-lists | Search & clone |

### Discovery Process
```bash
# Search awesome-lists for specific tool
grep -ri "quickbooks" ~/GitHub/MCP_VAULT/reference/

# Or search the 7,260+ indexed servers online
```

---

## EFFORT LEGEND

| Level | Meaning |
|-------|---------|
| Low | Install and run, no external deps |
| Medium | Needs API key or minor config |
| High | Multiple API keys, complex setup |

---

## CREDENTIAL TRACKER

| Tool | Credential | Status |
|------|------------|--------|
| excel-mcp-server | None | ✅ INSTALLED & CONNECTED |
| mcp_pdf_forms | None | ✅ INSTALLED & CONNECTED |
| document-edit-mcp | None | ✅ INSTALLED & CONNECTED |
| excel-to-pdf-mcp | LibreOffice | Install needed |
| facebook-mcp-server | FB Token | Not obtained |
| pdfco-mcp | PDF.co API | Not obtained |
| meta-ads-mcp | Meta OAuth | Not obtained |
| social-media-mcp | 7+ keys | Not obtained |

---

## QUICK WINS (Today)

These require NO external API keys:

1. **excel-mcp-server** - Full Excel manipulation
2. **mcp_pdf_forms** - PDF form analysis
3. **document-edit-mcp** - Word/Excel/PDF creation
4. **excel-to-pdf-mcp** - Spreadsheet to PDF (after LibreOffice install)

Start here, get wins, then tackle the ones needing credentials.

---

## WIRING TO PHOENIX AI CORE

Each MCP should connect to appropriate agent:

| MCP Tool | Phoenix Agent |
|----------|---------------|
| excel-mcp-server | Quote Generator |
| mcp_pdf_forms | Quote Generator |
| document-edit-mcp | Quote Generator |
| excel-to-pdf-mcp | Quote Generator |
| pdfco-mcp | Quote Generator |
| facebook-mcp-server | Social Media Agent |
| meta-ads-mcp | Marketing Agent |
| social-media-mcp | Social Media Agent |

---

**Total Tools to Integrate:** 8 primary + unlimited from discovery
**Estimated Timeline:** 4-6 weeks for full integration
**Critical Path:** Phase 1 (Pricebook) must complete by Dec 28
