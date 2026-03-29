# CLAUDE CODE FULL INVENTORY
## Complete Tools, Skills & Capabilities Dump
**Generated:** 2025-12-22
**Model:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Session:** MCP_VAULT Project

---

## SECTION 1: BUILT-IN CLAUDE CODE TOOLS

### Core File Operations

| Tool | Purpose | Parameters |
|------|---------|------------|
| **Read** | Read files (text, images, PDFs, notebooks) | `file_path`, `offset`, `limit` |
| **Write** | Create/overwrite files | `file_path`, `content` |
| **Edit** | Surgical string replacement in files | `file_path`, `old_string`, `new_string`, `replace_all` |
| **Glob** | Find files by pattern (e.g., `**/*.ts`) | `pattern`, `path` |
| **Grep** | Search file contents with regex | `pattern`, `path`, `glob`, `type`, `output_mode`, `-A/-B/-C` context |
| **NotebookEdit** | Edit Jupyter notebook cells | `notebook_path`, `cell_id`, `new_source`, `edit_mode` |

### Shell & System

| Tool | Purpose | Parameters |
|------|---------|------------|
| **Bash** | Execute shell commands | `command`, `timeout`, `run_in_background`, `description` |
| **KillShell** | Terminate background shell processes | `shell_id` |
| **TaskOutput** | Get output from background tasks | `task_id`, `block`, `timeout` |

### Web & Research

| Tool | Purpose | Parameters |
|------|---------|------------|
| **WebFetch** | Fetch and analyze web pages | `url`, `prompt` |
| **WebSearch** | Search the web for information | `query`, `allowed_domains`, `blocked_domains` |

### Agent & Task Management

| Tool | Purpose | Parameters |
|------|---------|------------|
| **Task** | Launch specialized sub-agents | `prompt`, `subagent_type`, `model`, `run_in_background`, `resume` |
| **TodoWrite** | Track tasks and progress | `todos` (array of task objects) |
| **AskUserQuestion** | Interactive questions with options | `questions` (1-4 questions with options) |

### Mode & Planning

| Tool | Purpose | Parameters |
|------|---------|------------|
| **EnterPlanMode** | Start planning mode for complex tasks | (none) |
| **ExitPlanMode** | Complete planning and get approval | `launchSwarm`, `teammateCount` |

### Extensions

| Tool | Purpose | Parameters |
|------|---------|------------|
| **Skill** | Execute registered skills | `skill` |
| **SlashCommand** | Execute custom slash commands | `command` |

---

## SECTION 2: AVAILABLE SUB-AGENTS (Task Tool)

| Agent Type | Purpose | Tools Available |
|------------|---------|-----------------|
| **general-purpose** | Complex multi-step tasks, code search | All tools |
| **Explore** | Fast codebase exploration, file finding | All tools |
| **Plan** | Software architecture, implementation planning | All tools |
| **claude-code-guide** | Documentation lookup for Claude Code/SDK | Glob, Grep, Read, WebFetch, WebSearch |
| **statusline-setup** | Configure status line settings | Read, Edit |

---

## SECTION 3: MCP SERVERS INSTALLED

### Currently Connected (MCP_VAULT Project)

```
excel: ✅ Connected
  Command: uv run --directory .../excel-mcp-server excel-mcp-server stdio

pdf-forms: ✅ Connected
  Command: uv run --directory .../mcp_pdf_forms mcp-pdf-forms

document-edit: ✅ Connected
  Command: uv run --directory .../document-edit-mcp python -c "from claude_document_mcp.server import main; main()"
```

### Excel MCP Server Tools (30+)

| Tool | Description |
|------|-------------|
| `create_workbook` | Create new Excel workbook |
| `get_workbook_metadata` | Get workbook info (sheets, dimensions) |
| `read_sheet_data` | Read cell data from sheet |
| `write_sheet_data` | Write data to cells |
| `create_sheet` | Add new worksheet |
| `rename_sheet` | Rename existing sheet |
| `delete_sheet` | Remove worksheet |
| `get_cell_formula` | Read formula from cell |
| `write_cell_formula` | Write formula to cell |
| `validate_formula` | Check if formula is valid |
| `format_range` | Apply formatting (bold, colors, borders) |
| `merge_cells` | Merge cell range |
| `unmerge_cells` | Unmerge cell range |
| `create_chart` | Create chart (line, bar, pie, etc.) |
| `create_pivot_table` | Create pivot table |
| `create_table` | Create Excel table |
| `insert_rows` | Insert rows at position |
| `delete_rows` | Delete rows |
| `insert_columns` | Insert columns |
| `delete_columns` | Delete columns |
| `copy_range` | Copy range to location |
| `get_sheet_names` | List all sheet names |
| `get_named_ranges` | Get named ranges |
| `create_named_range` | Create named range |
| `apply_number_format` | Format numbers (currency, %, etc.) |
| `set_column_width` | Set column width |
| `set_row_height` | Set row height |
| `freeze_panes` | Freeze rows/columns |
| `add_data_validation` | Add dropdown/validation rules |
| `protect_sheet` | Password protect sheet |

### PDF Forms MCP Server Tools

| Tool | Description |
|------|-------------|
| `find_pdfs` | Find PDF files in directory |
| `get_form_fields` | Extract form field info (name, type, position) |
| `highlight_fields` | Highlight form fields visually |
| `analyze_pdf_structure` | Analyze PDF structure |

### Document Edit MCP Server Tools

| Tool | Description |
|------|-------------|
| `create_word_document` | Create Word doc from text |
| `edit_word_document` | Edit existing Word doc |
| `convert_txt_to_word` | Convert TXT to Word |
| `convert_word_to_pdf` | Convert Word to PDF |
| `create_excel_file` | Create Excel from data |
| `edit_excel_file` | Edit Excel file |
| `convert_csv_to_excel` | Convert CSV to Excel |
| `create_pdf_from_text` | Create PDF from text |

---

## SECTION 4: MCP ARSENAL (Available but Not Yet Installed)

### Tier 0: Excel/PDF (tools/documents/)

| Repo | Tools | Status |
|------|-------|--------|
| excel-mcp-server | 30+ | ✅ INSTALLED |
| excel-mcp-alt | Alternative implementation | Available |
| mcp_pdf_forms | PDF analysis | ✅ INSTALLED |
| pdfco-mcp | Full PDF ops (API key needed) | Available |
| document-edit-mcp | Word/Excel/PDF | ✅ INSTALLED |
| excel-to-pdf-mcp | Spreadsheet to PDF | Needs LibreOffice |

### Tier 1: Social Media (social/)

| Repo | Tools | Status |
|------|-------|--------|
| facebook-mcp-server | 27 FB tools | Needs FB Token |
| meta-ads-mcp | 29 ads tools | Needs Meta OAuth |
| social-media-mcp | Multi-platform | Needs 7+ API keys |

### Tier 2: Reference (official/, reference/)

| Repo | Purpose |
|------|---------|
| modelcontextprotocol/servers | Official MCP implementations |
| anthropic-cookbook | Integration patterns |
| awesome-mcp-servers (x3) | 7,260+ indexed servers |

---

## SECTION 5: SLASH COMMANDS

### Built-in Commands

| Command | Purpose |
|---------|---------|
| `/help` | Get help with Claude Code |
| `/clear` | Clear conversation |
| `/compact` | Compress conversation context |
| `/config` | Edit settings |
| `/cost` | Show session costs |
| `/doctor` | Diagnose issues |
| `/init` | Initialize CLAUDE.md |
| `/memory` | Edit memory files |
| `/model` | Switch models |
| `/mcp` | Manage MCP servers |
| `/permissions` | Manage tool permissions |
| `/resume` | Resume previous session |
| `/vim` | Toggle vim mode |
| `/terminal-setup` | Configure terminal |
| `/context` | View context usage |
| `/export` | Export conversation |
| `/hooks` | Manage hooks |
| `/add-dir` | Add working directory |
| `/status` | System status |
| `/usage` | View usage limits |
| `/upgrade` | Upgrade plan |
| `/pr-comments` | GitHub PR comments |
| `/install-github-app` | Install GitHub app |
| `/agents` | Manage custom agents |
| `/plugins` | Manage plugins |
| `/todos` | List todo items |
| `/release-notes` | View release notes |
| `/theme` | Change theme |
| `/rewind` | Undo code changes |
| `/rename` | Rename session |

---

## SECTION 6: KEYBOARD SHORTCUTS

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Interrupt/cancel |
| `Ctrl+D` | Exit |
| `Ctrl+L` | Clear screen |
| `Ctrl+R` | History search / Transcript mode |
| `Ctrl+O` | Toggle transcript |
| `Ctrl+G` | Edit prompt in editor |
| `Ctrl+Y` | Paste deleted text |
| `Ctrl+K` | Kill line |
| `Ctrl+U` | Undo input |
| `Tab` | Auto-complete / Accept suggestion |
| `Shift+Tab` | Toggle auto-accept mode |
| `Alt+T` | Toggle thinking mode |
| `Alt+P` | Switch model |
| `Escape` | Interrupt Claude |
| `Enter` | Send message |
| `Shift+Enter` | New line |

---

## SECTION 7: ENVIRONMENT VARIABLES

### Authentication
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for Anthropic |
| `CLAUDE_CODE_API_KEY_HELPER` | Custom key helper script |
| `ANTHROPIC_AUTH_TOKEN` | Auth token |

### Model Configuration
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_MODEL` | Override default model |
| `ANTHROPIC_SMALL_FAST_MODEL` | Fast model for simple tasks |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Default Sonnet alias |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Default Opus alias |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Default Haiku alias |

### Behavior
| Variable | Purpose |
|----------|---------|
| `BASH_DEFAULT_TIMEOUT_MS` | Bash command timeout |
| `BASH_MAX_TIMEOUT_MS` | Max bash timeout |
| `CLAUDE_CODE_SHELL` | Override shell |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Freeze working dir |
| `DISABLE_AUTOUPDATER` | Disable auto-updates |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Reduce network |

### MCP
| Variable | Purpose |
|----------|---------|
| `MCP_TIMEOUT` | Server startup timeout |
| `MCP_TOOL_TIMEOUT` | Tool execution timeout |

### Logging/Debug
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_LOG` | Set to `debug` for verbose |
| `OTEL_*` | OpenTelemetry config |

---

## SECTION 8: FILE TYPES I CAN READ

| Type | Extensions | Method |
|------|------------|--------|
| Text | `.txt`, `.md`, `.json`, `.yaml`, `.xml`, etc. | Direct read |
| Code | `.js`, `.ts`, `.py`, `.go`, `.rs`, `.java`, etc. | Syntax highlighted |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` | Visual analysis |
| PDFs | `.pdf` | Page-by-page extraction |
| Notebooks | `.ipynb` | Cell-by-cell with outputs |
| Config | `.env`, `.gitignore`, `.eslintrc`, etc. | Direct read |

---

## SECTION 9: MODELS AVAILABLE

| Model | ID | Best For |
|-------|-----|----------|
| **Opus 4.5** | `claude-opus-4-5-20251101` | Complex reasoning, planning |
| **Sonnet 4** | `claude-sonnet-4-20250514` | Balanced speed/capability |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Fast, simple tasks |

### Plan Modes
- **OpusPlan**: Opus for planning, Opus for execution
- **SonnetPlan**: Sonnet for planning, Sonnet for execution
- **HaikuPlan**: Sonnet for planning, Haiku for execution

---

## SECTION 10: CURRENT SESSION CAPABILITIES

### What I Can Do Right Now

**File Operations:**
- Read any file (text, code, images, PDFs)
- Create and edit files with surgical precision
- Search codebases with regex patterns
- Find files by glob patterns

**Shell Operations:**
- Run any bash command
- Background long-running processes
- Chain commands with && or ;
- Git operations (commit, push, PR creation)

**Web Operations:**
- Fetch and analyze web pages
- Search the web for current information
- Handle redirects and authentication

**Excel Operations (via MCP):**
- Create workbooks from scratch
- Add formulas, formatting, charts
- Pivot tables, data validation
- Merge cells, freeze panes

**PDF Operations (via MCP):**
- Analyze PDF form structures
- Extract field information
- Find PDFs in directories

**Document Operations (via MCP):**
- Create Word documents
- Convert Word to PDF
- Create Excel files
- Convert CSV to Excel

**Planning & Agents:**
- Enter plan mode for complex tasks
- Launch specialized sub-agents
- Track tasks with todo lists
- Ask clarifying questions

---

## SECTION 11: WHAT I CANNOT DO

| Limitation | Reason |
|------------|--------|
| Access the internet directly | Must use WebFetch/WebSearch tools |
| Remember between sessions | No persistent memory (use CLAUDE.md) |
| Execute GUI applications | Terminal-only environment |
| Access external APIs directly | Need MCP servers or bash curl |
| Push code without permission | Git operations require approval |
| Access files outside project | Sandboxed to working directories |
| Run interactive commands | No stdin for running processes |

---

## SECTION 12: PHOENIX ELECTRIC SPECIFIC

### Configured Paths
- MCP_VAULT: `~/GitHub/MCP_VAULT/`
- Phoenix AI Core: `~/GitHub/phoenix-ai-core-staging/`
- Builder Knowledge: `~/GitHub/phoenix-builder-space-knowledge/`

### GitHub Repo
- MCP Arsenal: https://github.com/shane7777777777777/mcp-vault

### Deadline
- **January 1, 2026**: Phoenix AI Core launch
- **10 days remaining** as of this inventory

---

## QUICK REFERENCE CARD

```
FILES:      Read, Write, Edit, Glob, Grep
SHELL:      Bash, KillShell, TaskOutput
WEB:        WebFetch, WebSearch
AGENTS:     Task (Explore, Plan, general-purpose)
PLANNING:   EnterPlanMode, ExitPlanMode
TRACKING:   TodoWrite
QUESTIONS:  AskUserQuestion
MCP:        excel, pdf-forms, document-edit

SHORTCUTS:  Ctrl+C (stop), Tab (complete), Shift+Tab (auto-accept)
MODES:      /vim, /model opus, shift+tab (auto-accept edits)
```

---

**End of Inventory**
*Generated by Claude Opus 4.5 for Phoenix Electric*
