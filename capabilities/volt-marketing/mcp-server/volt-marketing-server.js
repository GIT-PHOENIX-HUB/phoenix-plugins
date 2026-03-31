#!/usr/bin/env node
/**
 * Volt Marketing MCP Server
 * Model Context Protocol server for Phoenix Electric CO marketing intelligence.
 * 
 * This MCP server exposes Volt's marketing strategy capabilities as tools
 * that can be called by Claude Code, Claude Desktop, or any MCP-compatible client.
 * 
 * Tools provided:
 *   - volt_campaign_plan: Generate a full campaign plan for a service line
 *   - volt_budget_allocator: Get 3-tier budget recommendations
 *   - volt_ad_copy: Generate platform-specific ad copy
 *   - volt_seasonal_check: Get current seasonal marketing priorities
 *   - volt_territory_check: Validate if a location is in service territory
 *   - volt_roi_calculator: Estimate ROI for a marketing channel/spend level
 *   - volt_competitor_scan: Analyze competitive landscape for a sub-market
 *   - volt_review_strategy: Generate review acquisition strategy
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ============================================================
// PHOENIX ELECTRIC CO — COMPANY CONFIGURATION
// ============================================================
const COMPANY = {
  name: "Phoenix Electric CO",
  hq: "Elizabeth, Colorado",
  type: "Residential Electrical Contractor",
  generacDealer: true,
  businessMix: "90% Residential / 10% Light Commercial",
};

const SERVICE_LINES = [
  { name: "Generac Generators", avgValue: "$12,000-$25,000+", margin: "highest", priority: 1 },
  { name: "Custom Home Electrical", avgValue: "$15,000-$80,000+", margin: "high", priority: 2 },
  { name: "Kitchen/Bath Remodels", avgValue: "$3,000-$15,000", margin: "good", priority: 3 },
  { name: "Electrical Service Calls", avgValue: "$250-$2,500", margin: "moderate", priority: 4 },
  { name: "Basement Finishes", avgValue: "$3,000-$12,000", margin: "good", priority: 5 },
  { name: "Whole-Home Renovations", avgValue: "$8,000-$30,000+", margin: "high", priority: 6 },
  { name: "Multifamily/Small Commercial", avgValue: "varies", margin: "moderate", priority: 7 },
  { name: "EV Charger Installation", avgValue: "$800-$2,500", margin: "moderate", priority: 8 },
];

const TERRITORY = {
  primary: [
    "Lone Tree", "Highlands Ranch", "Parker", "Castle Rock", "Castle Pines",
    "Centennial", "Littleton", "Englewood", "Elizabeth", "Kiowa", "Elbert",
    "Franktown", "Sedalia", "Palmer Lake", "Monument", "Larkspur",
    "Colorado Springs (north)", "Agate", "Golden", "Morrison", "Evergreen"
  ],
  excluded: ["Winter Park", "Silverthorne", "Summit County", "Grand County", "Western Slope"],
  rule: "ALL territory south of I-70 only"
};

const SEASONALITY = {
  spring: { months: "March-June", focus: "Storm season, Generac demand, remodel season starts, outdoor lighting" },
  summer: { months: "June-August", focus: "Peak construction, custom homes, pool/hot tub hookups, AC electrical" },
  fall: { months: "September-November", focus: "Pre-winter Generac push, weatherization, holiday lighting" },
  winter: { months: "December-February", focus: "Indoor remodels, emergency service calls, generator maintenance" }
};

// ============================================================
// MCP SERVER SETUP
// ============================================================
const server = new Server(
  { name: "volt-marketing-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ============================================================
// TOOL DEFINITIONS
// ============================================================
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "volt_campaign_plan",
      description: "Generate a full marketing campaign plan for a specific Phoenix Electric service line. Returns targeting, budget tiers, ad concepts, timeline, and KPIs.",
      inputSchema: {
        type: "object",
        properties: {
          service_line: { type: "string", description: "Service line to plan for (e.g., 'generac', 'custom_homes', 'service_calls', 'remodels', 'basement', 'ev_charger')" },
          budget_tier: { type: "string", enum: ["starter", "growth", "domination"], description: "Budget level: starter ($500-1500/mo), growth ($1500-4000/mo), domination ($4000+/mo)" },
          target_area: { type: "string", description: "Specific geographic focus within service territory (e.g., 'Castle Rock', 'Elizabeth', 'Parker')" }
        },
        required: ["service_line"]
      }
    },
    {
      name: "volt_budget_allocator",
      description: "Get recommended monthly marketing budget allocation across channels for Phoenix Electric, with 3 tiers and expected ROI.",
      inputSchema: {
        type: "object",
        properties: {
          monthly_budget: { type: "number", description: "Total monthly marketing budget in dollars" },
          focus: { type: "string", description: "Primary focus: 'balanced', 'generators', 'service_calls', 'custom_homes', 'remodels'" }
        },
        required: ["monthly_budget"]
      }
    },
    {
      name: "volt_ad_copy",
      description: "Generate platform-specific ad copy for Phoenix Electric campaigns. Returns headlines, descriptions, and CTAs.",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["google_search", "google_lsa", "facebook", "instagram", "nextdoor", "direct_mail"], description: "Advertising platform" },
          service_line: { type: "string", description: "Service line to promote" },
          angle: { type: "string", description: "Marketing angle (e.g., 'urgency', 'trust', 'value', 'storm_response', 'seasonal')" }
        },
        required: ["platform", "service_line"]
      }
    },
    {
      name: "volt_seasonal_check",
      description: "Get current seasonal marketing priorities and recommended actions for Phoenix Electric based on Colorado market cycles.",
      inputSchema: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month number (1-12). Defaults to current month." }
        }
      }
    },
    {
      name: "volt_territory_check",
      description: "Check if a location is within Phoenix Electric's service territory or in the excluded zone.",
      inputSchema: {
        type: "object",
        properties: {
          location: { type: "string", description: "City or area name to check" }
        },
        required: ["location"]
      }
    },
    {
      name: "volt_roi_calculator",
      description: "Estimate expected ROI for a marketing channel at a given spend level for Phoenix Electric.",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Marketing channel (e.g., 'google_lsa', 'google_ppc', 'facebook', 'direct_mail', 'nextdoor')" },
          monthly_spend: { type: "number", description: "Monthly spend in dollars" },
          service_line: { type: "string", description: "Target service line" }
        },
        required: ["channel", "monthly_spend"]
      }
    },
    {
      name: "volt_review_strategy",
      description: "Generate a review acquisition and management strategy for Phoenix Electric's Google Business Profile.",
      inputSchema: {
        type: "object",
        properties: {
          current_review_count: { type: "number", description: "Current number of Google reviews" },
          current_rating: { type: "number", description: "Current Google star rating" },
          goal: { type: "string", description: "Goal: 'volume' (more reviews), 'rating' (improve score), or 'both'" }
        }
      }
    },
    {
      name: "volt_storm_protocol",
      description: "Activate storm-response marketing protocol for Generac generator campaigns. Returns ready-to-deploy ad copy, budget surge recommendations, and activation checklist.",
      inputSchema: {
        type: "object",
        properties: {
          storm_type: { type: "string", description: "Type of weather event (e.g., 'power_outage', 'severe_storm', 'wildfire', 'winter_storm')" },
          affected_areas: { type: "string", description: "Areas affected by the outage/storm" }
        },
        required: ["storm_type"]
      }
    }
  ]
}));

// ============================================================
// TOOL HANDLERS
// ============================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "volt_territory_check": {
      const location = args.location?.toLowerCase() || "";
      const isExcluded = TERRITORY.excluded.some(t => location.includes(t.toLowerCase()));
      const isPrimary = TERRITORY.primary.some(t => location.includes(t.toLowerCase()));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            location: args.location,
            in_territory: isPrimary && !isExcluded,
            excluded: isExcluded,
            note: isExcluded
              ? "EXCLUDED TERRITORY — Do NOT advertise here."
              : isPrimary
                ? "PRIMARY TERRITORY — Full marketing authorized."
                : "Not in primary list — verify manually. Must be south of I-70."
          }, null, 2)
        }]
      };
    }

    case "volt_seasonal_check": {
      const month = args.month || new Date().getMonth() + 1;
      let season, priorities;
      if (month >= 3 && month <= 5) { season = SEASONALITY.spring; priorities = "GENERAC STORM ADS, remodel campaigns, new construction outreach, outdoor lighting"; }
      else if (month >= 6 && month <= 8) { season = SEASONALITY.summer; priorities = "Custom home electrical, peak construction, pool/hot tub hookups, AC service calls"; }
      else if (month >= 9 && month <= 11) { season = SEASONALITY.fall; priorities = "PRE-WINTER GENERAC PUSH, weatherization, holiday lighting installs, finish construction"; }
      else { season = SEASONALITY.winter; priorities = "Indoor remodels (kitchens/basements), emergency service calls, generator maintenance contracts"; }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ month, season: season.months, focus: season.focus, top_priorities: priorities, action: "Deploy marketing aligned to these seasonal priorities NOW." }, null, 2)
        }]
      };
    }

    default:
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            tool: name,
            args: args,
            note: "This tool returns structured data. Connect to the full Volt Marketing skill for detailed strategy. Use the SKILL.md system prompt for comprehensive marketing intelligence.",
            company: COMPANY,
            service_lines: SERVICE_LINES,
            territory: TERRITORY
          }, null, 2)
        }]
      };
  }
});

// ============================================================
// START SERVER
// ============================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Volt Marketing MCP Server running on stdio");
}

main().catch(console.error);
