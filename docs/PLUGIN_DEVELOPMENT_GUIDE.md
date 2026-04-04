# Plugin Development Guide

How to create a new capability for the Phoenix Toolbox from scratch.

---

## Overview

A capability in Phoenix Toolbox is a self-contained functional unit that lives under `capabilities/<name>/`. Each capability can include commands (slash commands), skills (auto-activating knowledge), agents (specialized subagents), hooks (event-driven automation), and MCP server integrations.

This guide walks through creating a capability from zero to registered-and-installable.

---

## File Structure

Every capability follows this structure. Not all directories are required — include only what your capability needs.

```
capabilities/your-capability/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest (required)
├── commands/
│   └── your-command.md      # Slash command files
├── skills/
│   └── SKILL.md             # Auto-activating knowledge
├── agents/
│   └── AGENT.md             # Specialized subagent definitions
├── hooks/
│   └── hooks.json           # Event-driven hook config
├── .mcp.json                # MCP server config (if applicable)
├── scripts/                 # Helper scripts (optional)
└── README.md                # What it does, how to install (required)
```

The minimum viable capability needs only `README.md` and `.claude-plugin/plugin.json`. See `capabilities/electrical-guru/` for the simplest working example.

---

## Step 1: Create the Folder

```bash
mkdir -p capabilities/your-capability/.claude-plugin
mkdir -p capabilities/your-capability/commands
mkdir -p capabilities/your-capability/skills
```

Or copy the scaffold from `templates/capability-template/`.

---

## Step 2: Write plugin.json

The plugin manifest tells Claude Code what your capability provides.

```json
{
  "name": "your-capability",
  "version": "1.0.0",
  "description": "One-line description of what this does",
  "author": "Phoenix Electric",
  "commands": {
    "your-command": {
      "description": "What /your-command does",
      "file": "commands/your-command.md"
    }
  },
  "skills": [
    "skills/SKILL.md"
  ],
  "agents": [
    "agents/AGENT.md"
  ],
  "hooks": "hooks/hooks.json"
}
```

Only include the sections your capability needs. If you have no agents, omit the `agents` key entirely.

---

## Step 3: Write Commands

Commands are markdown files with YAML frontmatter. When a user types `/your-command`, Claude Code reads the markdown and follows its instructions.

```markdown
---
name: your-command
description: What this command does — one line
---

# /your-command

Detailed instructions for what Claude should do when this command is invoked.

## What To Do

1. Step one
2. Step two
3. Step three

## Output Format

Describe what the response should look like.
```

The `name` must match the key in plugin.json. The `description` appears in the command picker.

Command naming conventions:
- Single-word capabilities: `/command-name` (e.g., `/echo`, `/health`)
- - Multi-command capabilities: `/prefix:action` (e.g., `/comms:start`, `/comms:stop`)
  - - Use lowercase, hyphens for multi-word names
   
    - ---

    ## Step 4: Write Skills

    Skills are auto-activating knowledge files. They fire when the user's message matches certain patterns, providing Claude with relevant context without being explicitly invoked.

    ```markdown
    ---
    name: your-skill
    activation:
      - "pattern that triggers this skill"
      - "another trigger pattern"
    ---

    # Your Skill Name

    Knowledge content that Claude should have when this skill activates.

    ## Key Facts

    - Fact 1
    - Fact 2

    ## Reference Material

    Detailed reference content here.
    ```

    Skills should be focused — one topic per skill file. If your capability covers multiple distinct knowledge areas, create multiple skill files.

    See `capabilities/electrical-guru/skills/SKILL.md` for a working example.

    ---

    ## Step 5: Write Agents

    Agents are specialized subagent definitions that Claude can delegate tasks to.

    ```markdown
    ---
    name: your-agent
    description: What this agent specializes in
    ---

    # Your Agent

    ## Role

    Describe this agent's specific role and expertise.

    ## Capabilities

    What this agent can do that the main session cannot (or should not).

    ## Constraints

    What this agent should NOT do.
    ```

    See `capabilities/echo-persistence/agents/` for working examples with 5 different agent definitions.

    ---

    ## Step 6: Configure Hooks

    Hooks fire automatically on Claude Code events. Use them sparingly — they run on every matching event.

    ```json
    {
      "hooks": {
        "SessionStart": [
          {
            "command": "echo 'Capability initialized'",
            "description": "Run on session start"
          }
        ],
        "PreToolUse": [
          {
            "command": "echo 'Pre-tool check'",
            "description": "Run before tool use"
          }
        ]
      }
    }
    ```

    Available hook events: `SessionStart`, `PreToolUse`, `PostToolUse`, `PreCompaction`, `Notification`.

    Only use hooks when your capability genuinely needs event-driven behavior. Most capabilities do not need hooks — `echo-persistence` and `phoenix-comms` are the exceptions, not the rule.

    ---

    ## Step 7: Write the README

    Every capability must have a README.md that covers: what it does, component counts, command descriptions, installation instructions, dependencies, and status.

    Use the template at `templates/capability-template/README.md` or model after `capabilities/echo-persistence/README.md`.

    ---

    ## Step 8: Install and Test

    ```bash
    # Symlink into Claude's plugin directory
    ln -s /path/to/capabilities/your-capability ~/.claude/plugins/your-capability

    # Verify the symlink resolves
    ls -la ~/.claude/plugins/your-capability

    # Test commands
    # Type /your-command in a Claude Code session
    ```

    ---

    ## Step 9: Register

    Add your capability to `CAPABILITY_REGISTRY.md` with accurate counts for commands, skills, agents, and hooks.

    ---

    ## Common Mistakes

    1. **Forgetting plugin.json** — Without it, Claude Code does not see your capability
    2. 2. **Mismatched command names** — The `name` in the command YAML must match the key in plugin.json
       3. 3. **Hardcoded paths** — Use configurable paths with fallbacks. Never hardcode `/Users/shane/...`
          4. 4. **Credentials in code** — Use Azure Key Vault. No API keys, tokens, or secrets in any file
             5. 5. **Stale README** — Update the README when you add/remove commands or change behavior
                6. 6. **Missing from registry** — If it's not in CAPABILITY_REGISTRY.md, other agents won't know it exists
                  
                   7. ---
                  
                   8. ## Reference Capabilities
                  
                   9. | Capability | Why It's a Good Reference |
                   10. |---|---|
                   11. | `echo-persistence` | Most complete: 7 commands, 5 agents, 3 hooks, full skill |
                   12. | `electrical-guru` | Simplest: 1 command, 1 skill, no agents, no hooks |
                   13. | `servicefusion` | API integration: 6 commands, external MCP dependency |
                   14. | `phoenix-365` | Complex: 4 commands, 3 skills, 2 agents, 1 hook, MCP server |
                   15. | `gauntlet` | Standalone app: React + Node, no plugin structure |
                  
                   16. ---
                  
                   17. *Phoenix Toolbox — Plugin Development Guide*
                   18. *Last updated: 2026-04-04 (Phase 5)*
