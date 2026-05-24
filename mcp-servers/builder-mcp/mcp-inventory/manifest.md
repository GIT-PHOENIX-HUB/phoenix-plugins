# Phoenix MCP Arsenal - Full Inventory

**Generated:** 2025-12-21
**Owner:** Phoenix Electric / Shane Warehime
**Location:** ~/GitHub/MCP_VAULT

---

## Quick Stats

| Category | Repos | Production-Ready | Integrated |
|----------|-------|------------------|------------|
| Excel/PDF (Tier 0) | 6 | 5 | Pending |
| Social Media (Tier 1) | 3 | 3 | Pending |
| Official/Reference (Tier 2) | 3 | 3 | Reference |
| **TOTAL** | **12** | **11** | **0** |

---

## Tier 0: Excel/PDF (Pricebook Ready)

See detailed inventory: `tier0-pricebook.md`

| Repo | Lang | Tools | Best For |
|------|------|-------|----------|
| excel-mcp-server | Python | 30+ | Full Excel manipulation |
| excel-mcp-alt | Go+Node | 7 | Windows live editing |
| mcp_pdf_forms | Python | 3 | PDF form analysis |
| pdfco-mcp | Python | 30+ | PDF conversion (cloud API) |
| document-edit-mcp | Python | 9 | Word/Excel/PDF local ops |
| excel-to-pdf-mcp | Node.js | 2 | Excel/Numbers to PDF |

**Recommended:** `excel-mcp-server` (haris-musa) for pricebook work

---

## Tier 1: Social Media

### 1. facebook-mcp-server (HagaiHen)
**Location:** `social/facebook-mcp-server`
**Language:** Python
**Entry Point:** `server.py` via `uv run`

#### Environment Required
```
FACEBOOK_ACCESS_TOKEN=<page_access_token>
FACEBOOK_PAGE_ID=<page_id>
```

#### Tools (27)
**Posting:**
- `post_to_facebook` - Create text post
- `post_image_to_facebook` - Post image with caption
- `update_post` - Edit existing post
- `schedule_post` - Schedule future post
- `delete_post` - Remove post

**Comments:**
- `get_post_comments` - Fetch comments
- `reply_to_comment` - Reply to comment
- `delete_comment` / `delete_comment_from_post` - Remove comment
- `hide_comment` / `unhide_comment` - Hide/show comment
- `bulk_delete_comments` / `bulk_hide_comments` - Bulk operations
- `filter_negative_comments` - Filter by sentiment

**Analytics:**
- `get_page_posts` - List recent posts
- `get_number_of_comments` / `get_number_of_likes`
- `get_post_impressions` (total/unique/paid/organic)
- `get_post_engaged_users` / `get_post_clicks`
- `get_post_reactions_like_total` / `get_post_reactions_breakdown`
- `get_post_top_commenters` / `get_post_share_count`
- `get_page_fan_count` - Total page fans

**Messaging:**
- `send_dm_to_user` - Direct message

#### Install
```bash
cd ~/GitHub/MCP_VAULT/social/facebook-mcp-server
uv pip install -r requirements.txt
# Add .env with FB credentials
```

#### Claude Config
```json
{
  "FacebookMCP": {
    "command": "uv",
    "args": ["run", "--with", "mcp[cli]", "--with", "requests", "mcp", "run", "server.py"]
  }
}
```

---

### 2. meta-ads-mcp (pipeboard-co)
**Location:** `social/meta-ads-mcp`
**Language:** Python
**Entry Point:** Remote MCP or local install

#### Best Option: Remote MCP (No Setup)
```json
{
  "mcpServers": {
    "meta-ads-remote": {
      "url": "https://mcp.pipeboard.co/meta-ads-mcp"
    }
  }
}
```

#### Tools (29)
**Account Management:**
- `mcp_meta_ads_get_ad_accounts` - List accounts
- `mcp_meta_ads_get_account_info` - Account details
- `mcp_meta_ads_get_account_pages` - Associated pages

**Campaigns:**
- `mcp_meta_ads_get_campaigns` - List campaigns
- `mcp_meta_ads_get_campaign_details` - Campaign info
- `mcp_meta_ads_create_campaign` - Create campaign

**Ad Sets:**
- `mcp_meta_ads_get_adsets` - List ad sets
- `mcp_meta_ads_get_adset_details` - Ad set info
- `mcp_meta_ads_create_adset` - Create ad set
- `mcp_meta_ads_update_adset` - Update ad set

**Ads:**
- `mcp_meta_ads_get_ads` - List ads
- `mcp_meta_ads_get_ad_details` - Ad info
- `mcp_meta_ads_create_ad` - Create ad
- `mcp_meta_ads_update_ad` - Update ad
- `mcp_meta_ads_get_ad_image` - View ad image

**Creatives:**
- `mcp_meta_ads_get_ad_creatives` - Creative details
- `mcp_meta_ads_create_ad_creative` - Create creative
- `mcp_meta_ads_update_ad_creative` - Update creative
- `mcp_meta_ads_upload_ad_image` - Upload image

**Targeting:**
- `mcp_meta_ads_search_interests` - Find interests
- `mcp_meta_ads_get_interest_suggestions` - Interest suggestions
- `mcp_meta_ads_validate_interests` - Validate interests
- `mcp_meta_ads_search_behaviors` - Behavior targeting
- `mcp_meta_ads_search_demographics` - Demographics
- `mcp_meta_ads_search_geo_locations` - Geo targeting

**Analytics:**
- `mcp_meta_ads_get_insights` - Performance data
- `mcp_meta_ads_search` - Generic search

**Other:**
- `mcp_meta_ads_get_login_link` - Auth link
- `mcp_meta_ads_create_budget_schedule` - Budget scheduling

---

### 3. social-media-mcp (tayler-id)
**Location:** `social/social-media-mcp`
**Language:** Node.js (TypeScript)
**Entry Point:** `build/index.js`

#### Platforms Supported
- Twitter/X
- Mastodon
- LinkedIn

#### Environment Required
```
# Twitter
TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_BEARER_TOKEN
TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
TWITTER_OAUTH_CLIENT, TWITTER_CLIENT_SECRET

# Mastodon
MASTODON_CLIENT_SECRET, MASTODON_CLIENT_KEY, MASTODON_ACCESS_TOKEN

# LinkedIn
LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN

# AI (for content generation)
ANTHROPIC_API_KEY, OPENAI_API_KEY, BRAVE_API_KEY
```

#### Tools (3)
- `create_post` - Create and post to multiple platforms
- `get_trending_topics` - Get trending topics
- `research_topic` - Research using Brave/Perplexity

#### Install
```bash
cd ~/GitHub/MCP_VAULT/social/social-media-mcp
npm install
npm run build
```

#### Claude Config
```json
{
  "social-media-mcp": {
    "command": "node",
    "args": ["path/to/social-media-mcp/build/index.js"],
    "env": { /* all platform keys */ }
  }
}
```

---

## Tier 2: Official & Reference

### 1. modelcontextprotocol/servers
**Location:** `official/servers`
**Purpose:** Official MCP server implementations from Anthropic

Contains reference implementations for:
- Filesystem, Git, GitHub, GitLab
- PostgreSQL, SQLite, Redis
- Puppeteer, Playwright
- Slack, Google Drive, Google Maps
- Fetch, Brave Search, Memory
- And many more...

### 2. TensorBlock/awesome-mcp-servers
**Location:** `reference/awesome-mcp-servers`
**Purpose:** Curated index of 500+ MCP servers

Use this to discover additional MCPs for:
- Communication (Discord, Telegram, WhatsApp)
- Cloud (AWS, Azure, GCP)
- Databases (MongoDB, MySQL, Elasticsearch)
- DevOps (Docker, Kubernetes, Terraform)
- Productivity (Notion, Todoist, Obsidian)

### 3. anthropics/anthropic-cookbook
**Location:** `official/anthropic-cookbook`
**Purpose:** Recipes and patterns for Claude/MCP integration

---

## Integration Priority Queue

### Immediate (Pricebook Project)
1. `excel-mcp-server` (haris-musa) - Excel manipulation

### Phase 1 (Social Media Revival)
2. `facebook-mcp-server` - Revive Phoenix Electric FB page
3. `meta-ads-mcp` - When ready for advertising

### Phase 2 (Multi-Platform)
4. `social-media-mcp` - Twitter/LinkedIn/Mastodon posting

### Reference (As Needed)
5. Browse `awesome-mcp-servers` for specific needs
6. Pull from `modelcontextprotocol/servers` for official implementations

---

## Environment Variables Master List

```bash
# Excel/PDF
X_API_KEY=<pdf.co_api_key>

# Facebook
FACEBOOK_ACCESS_TOKEN=<page_token>
FACEBOOK_PAGE_ID=<page_id>

# Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_BEARER_TOKEN=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

# Mastodon
MASTODON_ACCESS_TOKEN=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=

# AI APIs (for content generation)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
BRAVE_API_KEY=
```

---

## Folder Structure

```
~/GitHub/MCP_VAULT/
├── _inventory/
│   ├── manifest.md          # This file
│   ├── manifest.json         # Machine-readable (TBD)
│   └── tier0-pricebook.md    # Pricebook-specific inventory
├── official/
│   ├── servers/              # modelcontextprotocol/servers
│   └── anthropic-cookbook/   # Anthropic patterns
├── social/
│   ├── facebook-mcp-server/  # FB page management
│   ├── meta-ads-mcp/         # Meta Ads API
│   └── social-media-mcp/     # Multi-platform posting
├── tools/
│   └── documents/
│       ├── excel-mcp-server/
│       ├── excel-mcp-alt/
│       ├── mcp_pdf_forms/
│       ├── pdfco-mcp/
│       ├── document-edit-mcp/
│       └── excel-to-pdf-mcp/
├── reference/
│   └── awesome-mcp-servers/  # 500+ MCP index
├── scraping/                 # (empty - for future)
├── content/                  # (empty - for future)
├── analytics/                # (empty - for future)
└── experimental/             # (empty - for future)
```

---

## Next Steps for Antigravity

1. **Review this manifest** - Understand what's available
2. **Prioritize integration** - What does Phoenix AI Core need first?
3. **Set up credentials** - Facebook Page token, Meta Ads access
4. **Wire to agents** - Connect MCPs to appropriate Phoenix agents
5. **Test workflows** - Verify each integration works

---

## Acquisition Log

| Time | Action | Status |
|------|--------|--------|
| 06:04 | Created MCP_VAULT structure | Done |
| 06:04 | Cloned Tier 0 (6 Excel/PDF repos) | Done |
| 06:05 | Generated tier0-pricebook.md | Done |
| 06:06 | Cloned Tier 1 (3 social repos) | Done |
| 06:06 | Cloned Tier 2 (3 reference repos) | Done |
| 06:07 | Generated full manifest | Done |
