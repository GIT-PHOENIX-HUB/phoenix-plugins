# {{CAPABILITY_NAME}}

{{SHORT_DESCRIPTION}} — one line explaining what this capability does.

## What It Does

{{DETAILED_DESCRIPTION}}

Explain the purpose of this capability in 2-3 paragraphs. What problem does it solve?
Who uses it? What does the output look like?

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | {{COMMAND_COUNT}} | {{COMMAND_NAMES}} |
| Skills | {{SKILL_COUNT}} | {{SKILL_NAMES}} |
| Agents | {{AGENT_COUNT}} | {{AGENT_NAMES}} |
| Hooks | {{HOOK_COUNT}} | {{HOOK_NAMES}} |

## Commands

| Command | Description |
|---------|-------------|
| `/{{command-name}}` | {{What this command does}} |

## Installation

Symlink or copy this folder to `~/.claude/plugins/{{capability-name}}/`

```bash
ln -s /path/to/capabilities/{{capability-name}} ~/.claude/plugins/{{capability-name}}
```

## Dependencies

- {{List any external dependencies — MCP servers, file system paths, API keys}}
- - If none: "None. Self-contained capability."
 
  - ## Status
 
  - {{Active / In Development / Spec Only}}
 
  - ---

  ## Template Instructions

  > **This is a template.** To use it:
  > >
  > >> 1. Copy this entire `capability-template/` folder to `capabilities/{{your-name}}/`
  > >> 2. > 2. Replace all `{{PLACEHOLDER}}` values with your actual content
  > >>    > 3. > 3. Delete this "Template Instructions" section
  > >>    >    > 4. > 4. Add your capability to `CAPABILITY_REGISTRY.md`
  > >>    >    >    > 5. > 5. See `docs/PLUGIN_DEVELOPMENT_GUIDE.md` for the full development guide
  > >>    >    >    >    > 6. >
  > >>    >    >    >    >    >> **Model capability to reference:** `capabilities/echo-persistence/` (most complete example)
  > >>    >    >    >    >    >> > **Minimal example:** `capabilities/electrical-guru/` (simplest working capability)
