# Volt Marketing — Deployment Runbook

**Version:** 1.0.0
**Last Updated:** March 2026
**Author:** Shane Warehime + Claude (Opus 4.6)

---

## Prerequisites

Before deploying Volt, ensure you have:
- Node.js 18+ installed (for MCP server)
- Claude Code CLI installed and authenticated
- Git configured with access to this repository
- Access to the phoenix-plugins repo

---

## Deployment Option 1: Claude Code Plugin (Recommended)

This is the fastest path to getting Volt active in your Claude Code environment.

### Step 1: Clone the Repository
```bash
git clone https://github.com/shane7777777777777/phoenix-plugins.git
cd phoenix-plugins
```

### Step 2: Register the Plugin
In your Claude Code project directory, add the plugin path:
```bash
# From your project root
claude plugin add ./path/to/phoenix-plugins/plugins/volt-marketing
```

### Step 3: Verify Installation
```bash
claude plugin list
# Should show: volt-marketing v1.0.0
```

### Step 4: Test Activation
```bash
# Using the slash command
/volt

# Or just ask a marketing question — the skill auto-triggers
"What's the best way to market Generac generators in Castle Rock?"
```

---

## Deployment Option 2: Skill Only (Lightweight)

If you just need the skill without the full plugin structure:

### Step 1: Copy SKILL.md
Copy `plugins/volt-marketing/skills/volt-marketing/SKILL.md` into your Claude Code project's `.claude/skills/` directory.

### Step 2: Verify
The skill will auto-trigger on marketing-related queries. No registration needed.

---

## Deployment Option 3: MCP Server

For programmatic access to Volt's marketing intelligence tools.

### Step 1: Install Dependencies
```bash
cd plugins/volt-marketing/mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
```

### Step 2: Configure Claude Desktop
Add to your Claude Desktop `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "volt-marketing": {
      "command": "node",
      "args": ["./plugins/volt-marketing/mcp-server/volt-marketing-server.js"],
      "env": {}
    }
  }
}
```

### Step 3: Configure Claude Code
Add to your project's `.mcp.json`:
```json
{
  "mcpServers": {
    "volt-marketing": {
      "command": "node",
      "args": ["./plugins/volt-marketing/mcp-server/volt-marketing-server.js"]
    }
  }
}
```

### Step 4: Restart and Verify
Restart Claude Desktop or Claude Code. The 8 Volt tools should appear:
- volt_campaign_plan
- volt_budget_allocator
- volt_ad_copy
- volt_seasonal_check
- volt_territory_check
- volt_roi_calculator
- volt_review_strategy
- volt_storm_protocol

---

## Deployment Option 4: Anthropic Workbench / Claude Project

For using Volt as a system prompt in the Anthropic Console:

### Step 1: Open Claude Workbench
Navigate to platform.claude.com/workbench

### Step 2: Create New Prompt
- Set model to Claude Opus 4.6
- Enable Thinking mode
- Set temperature to 1

### Step 3: Paste System Prompt
Copy the full system prompt from the SKILL.md file (everything after the YAML frontmatter) and paste it into the System Prompt field.

### Step 4: Save and Test
Save with name "Phoenix Electric CO - Volt Marketing Strategist"

---

## Post-Deployment Verification Checklist

Run these tests after deployment to confirm Volt is working correctly:

### Test 1: Territory Validation
Ask: "Should we advertise in Winter Park?"
Expected: Volt should REFUSE and flag Winter Park as excluded territory.

### Test 2: Seasonal Awareness
Ask: "What should we focus on this month?"
Expected: Volt should reference current Colorado season and appropriate service lines.

### Test 3: Budget Tiers
Ask: "Give me a marketing budget for $2,000/month"
Expected: Volt should provide 3 tiers (Starter, Growth, Domination) with channel allocation.

### Test 4: Service Line Knowledge
Ask: "What's our best approach for Generac marketing?"
Expected: Volt should reference $12K-$25K install value, storm-chasing protocols, co-op funds, and seasonal timing.

### Test 5: Actionable Output
Ask: "Give me a Google Ads campaign for service calls in Parker"
Expected: Volt should provide specific keywords, negative keywords, targeting radius, budget, expected CPL, and ad copy.

---

## Troubleshooting

### Skill Not Triggering
- Verify SKILL.md is in the correct `.claude/skills/` directory
- Check that the YAML frontmatter is valid
- Restart Claude Code

### MCP Server Not Connecting
- Run `node volt-marketing-server.js` manually to check for errors
- Verify Node.js 18+ is installed
- Check that @modelcontextprotocol/sdk is installed
- Verify the path in your config file is correct

### Command Not Found
- Verify volt.md is in the `.claude/commands/` directory
- Check YAML frontmatter syntax
- Restart Claude Code

---

## Updating Volt

To update Volt with new service lines, territory changes, or marketing intelligence:

1. Pull latest from repo: `git pull origin main`
2. Edit the relevant files (SKILL.md for skill, volt.md for command)
3. Commit and push changes
4. Restart Claude Code to pick up changes

---

## Support

For issues or enhancements, file an issue at:
https://github.com/shane7777777777777/phoenix-plugins/issues
