# GitHub Operations Skill

**How BBB uses the GitHub web UI effectively — the practical mechanics of browser-based persistence.**

---

## Creating Files

GitHub's web UI creates files at: `repo/new/branch/path`

When you type a `/` in the filename field, GitHub creates a folder. So typing `identity/BROWSER.md` creates both the `identity/` directory and the `BROWSER.md` file.

### Gotchas
- The filename input can sometimes capture extra characters if you type too fast or if browser auto-suggestions interfere. Always verify the filename in the breadcrumb before committing.
- Copilot may auto-suggest commit messages. These are usually reasonable but should be replaced with our `browser-persistence: action description` convention.
- After committing, GitHub may suggest creating the next file — verify the suggested path is correct before writing content.

---

## Editing Files

Navigate to the file, click the pencil icon (edit), make changes, then "Commit changes..."

### Renaming Files
To rename a file, enter edit mode and change the filename in the breadcrumb path. This is effectively a move operation — it creates the new file and removes the old one.

### Large Edits
For very large files (500+ lines), the web editor can be slow. Consider creating a new file with updated content rather than editing inline. GitHub's web editor doesn't have undo beyond the current session.

---

## Reading Files

### get_page_text
The fastest way to read a full file. Returns plain text without formatting. Good for long documents.

### read_page
Returns the DOM tree with reference IDs. Useful for navigating the page structure and finding interactive elements. Use `ref_id` parameter to focus on a specific section.

### Screenshots
For visual verification — shows exactly what the page looks like. Critical for confirming layouts, UI states, and visual evidence.

### Zoom
Use the zoom action with a region to inspect small UI elements like commit SHAs, timestamps, or truncated filenames.

---

## Navigating the Organization

### Key Navigation Patterns
- Org repos page: `github.com/orgs/GIT-PHOENIX-HUB/repositories`
- Repo root: `github.com/GIT-PHOENIX-HUB/repo-name`
- Folder: `github.com/GIT-PHOENIX-HUB/repo-name/tree/main/path`
- File: `github.com/GIT-PHOENIX-HUB/repo-name/blob/main/path/file.md`
- Issue: `github.com/GIT-PHOENIX-HUB/repo-name/issues/N`
- New file: `github.com/GIT-PHOENIX-HUB/repo-name/new/main/path`
- Edit file: `github.com/GIT-PHOENIX-HUB/repo-name/edit/main/path/file.md`

### Branch Navigation
- Branches page: `github.com/GIT-PHOENIX-HUB/repo-name/branches`
- Commit history: `github.com/GIT-PHOENIX-HUB/repo-name/commits/main`
- Specific commit: `github.com/GIT-PHOENIX-HUB/repo-name/commit/SHA`

---

## Issue Operations

### Creating Issues
Navigate to `repo/issues/new`. Fill in title and body. The body supports full markdown with checkboxes, tables, code blocks, and links.

### Commenting on Issues
Scroll to the bottom of an Issue page. Find the comment text area, type content, click "Comment".

### Editing Issue Bodies
Click the `...` menu on the Issue, select "Edit". This opens the full body in a markdown editor. Use JavaScript to manipulate the textarea content for large edits (find by `textarea` element, set `.value`, trigger input event).

---

## Commit Message Convention

All browser-persistence commits follow this pattern:
```
browser-persistence: action description
```

Examples:
- `browser-persistence: create capability README`
- `browser-persistence: create identity/BROWSER.md`
- `browser-persistence: update ACTIVE_MISSIONS.md`
- `browser-persistence: fix ACTIVE_MISSIONS.md filename`

---

## Verification Workflow

When verifying claims about repo state:

1. Navigate to the actual URL (don't trust cached or recalled state)
2. Read the page content (DOM or text extraction)
3. Take a screenshot if visual evidence is needed
4. Note the HEAD SHA and timestamp
5. Log findings with cited evidence

Never log something as fact unless you can cite the exact path, SHA, or screenshot that proves it.

---

*Part of browser-persistence skills.*
*See also: [crash-proof-documentation](../crash-proof-documentation/SKILL.md), [architectural-thinking](../architectural-thinking/SKILL.md), [agent-coordination](../agent-coordination/SKILL.md)*
