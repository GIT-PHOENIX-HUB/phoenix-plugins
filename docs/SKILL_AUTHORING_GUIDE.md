# Skill Authoring Guide

## Phoenix Toolbox — Writing Auto-Activating Knowledge Modules

This guide teaches you how to write skills for the Phoenix Toolbox. Skills are the knowledge layer of the capability system — they make agents smarter in specific domains without requiring explicit invocation.

## Understanding Skills

A skill is a markdown file that contains structured domain knowledge with activation rules. When Claude Code loads a capability, it reads the skill files and automatically activates them when the conversation context matches the skill's activation rules.

The key difference between a skill and a command: commands require the user to type `/command-name`. Skills fire on their own. The user asks about wire gauge sizing, and the NEC expertise skill activates silently, giving Claude the knowledge to answer accurately. No slash command needed.

The Phoenix Toolbox currently contains 13 skills across 8 capabilities. They range from deep technical expertise (NEC electrical codes) to operational knowledge (session buffer management) to business workflows (ServiceFusion job handling).

## When to Write a Skill

Write a skill when domain knowledge needs to be available automatically based on context, when the same knowledge is needed across multiple sessions, when accuracy depends on structured reference data that the agent cannot be expected to memorize, and when the knowledge domain has clear boundaries that can be defined with activation rules.

Do not write a skill when the user should explicitly control when the knowledge is loaded (use a command instead), when the knowledge is too broad to scope with activation rules, when the information changes so frequently that a static file would be constantly stale, or when a simple instruction in the agent definition would suffice.

## Skill Architecture

Every skill has four essential parts:

The activation section defines WHEN the skill fires. This is the most critical section to get right. Activation rules include topic detection (what the conversation is about), keyword matching (specific terms that trigger loading), file context (what files are being discussed or edited), and exclusion rules (when the skill should NOT fire even if other conditions match).

The knowledge section defines WHAT the agent learns. This is the actual content — the domain expertise, rules, reference tables, decision frameworks, and common mistake catalogs that make the agent competent in this domain.

The boundaries section defines WHERE the skill stops. This prevents over-application. A residential electrical code skill should not fire for industrial electrical questions. A ServiceFusion skill should not activate for generic CRM discussions.

The metadata section tracks versioning, authorship, and relationships to other skills and capabilities.

## Writing Activation Rules

Activation rules are the most important part of skill authoring. Get them wrong and either the skill never fires (too narrow) or it fires on irrelevant conversations (too broad).

### Topic Detection

Topic detection matches the general subject of the conversation. Write it as a condition the agent can evaluate: "The conversation involves residential electrical wiring, circuit sizing, or panel installations." Be specific enough to avoid false positives but general enough to catch relevant variations.

### Keyword Matching

Keywords are specific terms that strongly indicate the skill should activate. For an electrical skill, keywords might include "NEC", "wire gauge", "ampacity", "breaker", "GFCI", "AFCI", "ground fault". Choose keywords that are domain-specific — avoid common words that appear in unrelated contexts.

### File Context

If the agent is reading or editing files that relate to this skill's domain, the skill should activate. Specify file patterns like `*.wiring`, `electrical-*`, or specific filenames. This is particularly useful for code-related skills where file types strongly indicate the domain.

### Exclusion Rules

Exclusion rules are as important as activation rules. They explicitly state when the skill should NOT fire, even if other conditions match. An electrical skill might exclude commercial and industrial contexts. A marketing skill might exclude competitor analysis. Without exclusion rules, skills tend to over-activate.

### Testing Activation Rules

Before committing a skill, mentally test it against at least five scenarios: three where it SHOULD fire and two where it should NOT. Walk through each scenario and verify the activation rules produce the correct result. If you find edge cases, add explicit inclusions or exclusions.

## Writing Knowledge Content

### Structure

Organize knowledge in a clear hierarchy. Start with foundational concepts that establish the mental model, then move to detailed rules broken into logical categories, then reference tables for lookup data, and finally common mistakes that serve as guardrails.

### Foundational Concepts

Begin with the basics. What must the agent understand before it can apply the detailed rules? This section loads first and establishes context. For an electrical skill, this might cover how residential circuits work, what the NEC is, and how code compliance works. For a ServiceFusion skill, this might explain the job lifecycle and how estimates become work orders.

### Detailed Rules

Break rules into categories. Each category should be self-contained enough to be useful on its own. Use descriptive category names that the agent can quickly scan. Within each category, state rules as clear directives, not suggestions. Include the reasoning behind each rule so the agent can apply it to novel situations.

### Reference Tables

Include lookup data in table format. Wire gauge to ampacity tables, API endpoint mappings, status code definitions, pricing tiers, file naming conventions — anything the agent needs to give accurate, specific answers. Tables are more efficient than prose for structured data.

### Decision Frameworks

For domains where judgment is required, provide a decision framework. This is a step-by-step process the agent follows when the answer isn't obvious from the rules alone. Identify the question, classify which rule category applies, apply the relevant rules, verify the answer makes sense, and qualify any caveats.

### Common Mistakes

The common mistakes section is one of the most valuable parts of a skill. Document errors that agents (or users) frequently make in this domain, explain why each mistake is wrong, and provide the correct approach. This section prevents repeated errors across sessions and is especially valuable when a new agent session loads the skill for the first time.

## Production Examples

The best way to learn skill authoring is to study production skills:

**PERSISTENCE.md** in echo-persistence is the canonical example of an operational skill. It teaches agents how the buffer and archive system works, when to checkpoint, and how to maintain session continuity. Its activation rules fire when the agent is working with browser-echo files or discussing session management.

**NEC_EXPERTISE.md** in electrical-guru demonstrates a deep technical skill. It contains extensive reference data (wire gauge tables, circuit requirements), strict rules (never under-size wire), and clear boundaries (residential only, not commercial).

**SF_WORKFLOW.md** in servicefusion shows a business workflow skill. It maps the ServiceFusion job lifecycle, explains how estimates become work orders, and includes the API patterns needed to interact with the system.

**M365_OPERATIONS.md**, **CALENDAR_MANAGEMENT.md**, and **EMAIL_MANAGEMENT.md** in phoenix-365 demonstrate how to split a broad domain into focused, complementary skills. Each one handles a specific aspect of Microsoft 365 without overlapping with the others.

**BUFFER_SYSTEM.md**, **SESSION_CONTINUITY.md**, **CHECKPOINT_PROTOCOL.md**, and **LEDGER_NAVIGATION.md** in browser-persistence show how to build a suite of related skills that work together. Each skill has a narrow focus but they collectively give the agent comprehensive knowledge of the browser persistence system.

## Quality Checklist

Before committing any new skill, verify all of the following:

All placeholder markers are filled — no `{{...}}` text remains anywhere in the file. Activation rules are specific and tested against at least five scenarios. Exclusion rules prevent the three most likely false activations. Knowledge content is organized in clear categories with a logical flow. Reference tables include actual data, not placeholders. The common mistakes section has at least three documented errors with corrections. Boundaries explicitly state what is in scope and what is out of scope. Professional disclaimers are included for regulated domains (electrical, legal, medical, financial). The skill is registered in CAPABILITY_REGISTRY.md with the correct capability skill count updated. The file renders correctly in GitHub preview with no formatting issues.

## File Location

Skills that belong to a capability go in: `capabilities/{{capability-name}}/skills/{{SKILL_NAME}}.md`

Standalone skills (rare) go in an appropriate location and are referenced in the capability registry.

The skill filename should be uppercase with underscores, describing the knowledge domain: `NEC_EXPERTISE.md`, `BUFFER_SYSTEM.md`, `SF_WORKFLOW.md`.

## Template

Use the skill template at `templates/skill-template/SKILL.md` or the capability-internal template at `templates/capability-template/skills/SKILL.md` as your starting point. Both include all required sections with placeholder markers and detailed comments explaining each section.

## Related Documentation

- **Plugin development guide:** `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
- - **MCP development guide:** `docs/MCP_DEVELOPMENT_GUIDE.md`
  - - **Architecture overview:** `docs/ARCHITECTURE.md`
    - - **Skill template:** `templates/skill-template/`
      - - **Capability template:** `templates/capability-template/skills/`
        - - **Capability registry:** `CAPABILITY_REGISTRY.md`
