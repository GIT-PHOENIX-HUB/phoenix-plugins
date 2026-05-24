/**
 * Phoenix Builder Space - Knowledge Manager
 * 
 * Manages the company knowledge base stored in markdown files.
 * Handles documentation generation, search, and SharePoint sync.
 */

const { createGraphAutomation } = require('./graphAutomation');
const { builderConfig } = require('./config');

class KnowledgeManager {
    constructor() {
        this.graph = createGraphAutomation();
        this.knowledgeIndex = new Map();
    }

    /**
     * Get knowledge base status
     */
    async getStatus() {
        return {
            repository: builderConfig.modules.knowledgeManagement.sourceRepository,
            basePath: builderConfig.modules.knowledgeManagement.basePath,
            categories: builderConfig.modules.knowledgeManagement.categories,
            syncEnabled: builderConfig.modules.knowledgeManagement.syncToSharePoint,
            indexedEntries: this.knowledgeIndex.size,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Search the knowledge base
     */
    async search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/);

        // Search through indexed entries
        for (const [path, entry] of this.knowledgeIndex) {
            let score = 0;
            const titleLower = entry.title.toLowerCase();
            const contentLower = entry.content.toLowerCase();

            // Score based on matches
            for (const term of queryTerms) {
                if (titleLower.includes(term)) score += 10;
                if (entry.tags?.some(t => t.toLowerCase().includes(term))) score += 5;
                if (contentLower.includes(term)) score += 1;
            }

            if (score > 0) {
                results.push({
                    path,
                    title: entry.title,
                    category: entry.category,
                    score,
                    excerpt: this.extractExcerpt(entry.content, queryTerms[0])
                });
            }
        }

        // Sort by score
        results.sort((a, b) => b.score - a.score);

        return {
            query,
            resultCount: results.length,
            results: results.slice(0, 20)
        };
    }

    /**
     * Add or update a knowledge entry
     */
    async updateEntry(category, entry) {
        // Validate category
        const validCategories = builderConfig.modules.knowledgeManagement.categories;
        if (!validCategories.includes(category)) {
            return {
                success: false,
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            };
        }

        const path = `${builderConfig.modules.knowledgeManagement.basePath}${category}/${entry.filename}`;
        
        // Build markdown content
        const content = this.buildMarkdownContent(entry);

        // Update local index
        this.knowledgeIndex.set(path, {
            title: entry.title,
            category,
            content: entry.content,
            tags: entry.tags || [],
            updatedAt: new Date().toISOString()
        });

        // Sync to SharePoint if enabled
        if (builderConfig.modules.knowledgeManagement.syncToSharePoint) {
            try {
                await this.syncToSharePoint(path, content);
            } catch (error) {
                console.error('SharePoint sync failed:', error.message);
            }
        }

        return {
            success: true,
            path,
            category,
            syncedToSharePoint: builderConfig.modules.knowledgeManagement.syncToSharePoint
        };
    }

    /**
     * Generate documentation from source code or config
     */
    async generateDocs(sourceType, sourcePath) {
        const generators = {
            'workflow': this.generateWorkflowDocs.bind(this),
            'function': this.generateFunctionDocs.bind(this),
            'config': this.generateConfigDocs.bind(this),
            'api': this.generateAPIDocs.bind(this)
        };

        const generator = generators[sourceType];
        if (!generator) {
            return {
                success: false,
                error: `Unknown source type: ${sourceType}. Valid types: ${Object.keys(generators).join(', ')}`
            };
        }

        return await generator(sourcePath);
    }

    /**
     * Generate documentation for a GitHub Actions workflow
     */
    async generateWorkflowDocs(workflowPath) {
        // This would parse the YAML and generate markdown
        const doc = {
            title: `Workflow: ${workflowPath}`,
            content: `
# Workflow Documentation

**File:** \`${workflowPath}\`

## Overview

This document describes the automated workflow defined in the specified YAML file.

## Triggers

*(Auto-generated from workflow triggers)*

## Jobs

*(Auto-generated from workflow jobs)*

## Inputs

*(Auto-generated from workflow inputs)*

## Secrets Required

*(Auto-generated from workflow secrets)*

## Usage

\`\`\`bash
# Manual trigger via GitHub CLI
gh workflow run ${workflowPath}
\`\`\`

---
*Generated by Phoenix Builder Space Knowledge Manager*
            `.trim(),
            category: 'runbooks',
            tags: ['workflow', 'automation', 'github-actions']
        };

        return {
            success: true,
            documentation: doc
        };
    }

    /**
     * Generate documentation for Azure Functions or scripts
     */
    async generateFunctionDocs(functionPath) {
        const doc = {
            title: `Function: ${functionPath}`,
            content: `
# Function Documentation

**Path:** \`${functionPath}\`

## Purpose

*(Describe the function's purpose)*

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *(param1)* | *string* | *Yes* | *Description* |

## Returns

*(Describe return value)*

## Example Usage

\`\`\`javascript
// Example code
\`\`\`

## Dependencies

- *(List dependencies)*

## Error Handling

*(Describe error handling)*

---
*Generated by Phoenix Builder Space Knowledge Manager*
            `.trim(),
            category: 'runbooks',
            tags: ['function', 'code']
        };

        return {
            success: true,
            documentation: doc
        };
    }

    /**
     * Generate documentation for configuration files
     */
    async generateConfigDocs(configPath) {
        const doc = {
            title: `Configuration: ${configPath}`,
            content: `
# Configuration Documentation

**File:** \`${configPath}\`

## Overview

This document describes the configuration options and their effects.

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| *(setting)* | *type* | *default* | *description* |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| *(var)* | *Yes/No* | *description* |

## Security Considerations

- Secrets should be stored in Azure Key Vault
- Never commit sensitive values to source control

---
*Generated by Phoenix Builder Space Knowledge Manager*
            `.trim(),
            category: 'architecture',
            tags: ['configuration', 'settings']
        };

        return {
            success: true,
            documentation: doc
        };
    }

    /**
     * Generate API documentation
     */
    async generateAPIDocs(apiPath) {
        const doc = {
            title: `API: ${apiPath}`,
            content: `
# API Documentation

**Endpoint:** \`${apiPath}\`

## Authentication

*(Describe authentication method)*

## Endpoints

### GET ${apiPath}

**Description:** *(describe)*

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|

**Response:**
\`\`\`json
{
  "example": "response"
}
\`\`\`

### POST ${apiPath}

**Description:** *(describe)*

**Request Body:**
\`\`\`json
{
  "example": "request"
}
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 500 | Internal Server Error |

---
*Generated by Phoenix Builder Space Knowledge Manager*
            `.trim(),
            category: 'architecture',
            tags: ['api', 'endpoints']
        };

        return {
            success: true,
            documentation: doc
        };
    }

    /**
     * Sync a document to SharePoint
     */
    async syncToSharePoint(path, content) {
        const library = builderConfig.modules.knowledgeManagement.sharePointLibrary;
        
        await this.graph.uploadFile(
            builderConfig.sharePoint.siteId,
            builderConfig.sharePoint.driveId,
            library,
            path.split('/').pop(),
            content
        );

        return { synced: true, path };
    }

    /**
     * Build markdown content from entry
     */
    buildMarkdownContent(entry) {
        const lines = [
            `# ${entry.title}`,
            '',
            entry.description || '',
            '',
            entry.content,
            '',
            '---',
            '',
            `**Tags:** ${(entry.tags || []).join(', ')}`,
            `**Last Updated:** ${new Date().toISOString()}`,
            `**Category:** ${entry.category || 'Uncategorized'}`,
            '',
            '*Managed by Phoenix Builder Space*'
        ];

        return lines.join('\n');
    }

    /**
     * Extract a relevant excerpt from content
     */
    extractExcerpt(content, searchTerm, contextLength = 100) {
        const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
        
        if (index === -1) {
            return content.substring(0, contextLength * 2) + '...';
        }

        const start = Math.max(0, index - contextLength);
        const end = Math.min(content.length, index + searchTerm.length + contextLength);
        
        let excerpt = content.substring(start, end);
        
        if (start > 0) excerpt = '...' + excerpt;
        if (end < content.length) excerpt = excerpt + '...';

        return excerpt;
    }

    /**
     * Get all entries in a category
     */
    async getCategory(category) {
        const entries = [];

        for (const [path, entry] of this.knowledgeIndex) {
            if (entry.category === category) {
                entries.push({
                    path,
                    title: entry.title,
                    tags: entry.tags,
                    updatedAt: entry.updatedAt
                });
            }
        }

        return {
            category,
            entryCount: entries.length,
            entries
        };
    }

    /**
     * Import markdown file into knowledge base
     */
    async importMarkdown(path, content, category) {
        // Parse front matter if present
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        let title = path.split('/').pop().replace('.md', '');
        let tags = [];
        let body = content;

        if (frontMatterMatch) {
            // Parse YAML front matter
            const frontMatter = frontMatterMatch[1];
            body = frontMatterMatch[2];

            const titleMatch = frontMatter.match(/title:\s*(.+)/);
            if (titleMatch) title = titleMatch[1].trim();

            const tagsMatch = frontMatter.match(/tags:\s*\[([^\]]+)\]/);
            if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim());
        }

        // Add to index
        this.knowledgeIndex.set(path, {
            title,
            category,
            content: body,
            tags,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            path,
            title,
            category,
            tags
        };
    }

    /**
     * Get runbook template
     */
    getRunbookTemplate(name) {
        return `
# ${name} Runbook

## Overview

*(Brief description of this runbook's purpose)*

## Prerequisites

- [ ] Prerequisite 1
- [ ] Prerequisite 2

## Procedure

### Step 1: *(Title)*

*(Detailed instructions)*

\`\`\`bash
# Example command
\`\`\`

### Step 2: *(Title)*

*(Detailed instructions)*

## Verification

How to verify the procedure was successful:

1. Check...
2. Verify...

## Rollback

If something goes wrong:

1. Stop...
2. Revert...

## Related Documents

- [Related Doc 1](./related-doc.md)

## Change Log

| Date | Author | Change |
|------|--------|--------|
| ${new Date().toISOString().split('T')[0]} | | Initial version |

---
*Phoenix Builder Space Runbook*
        `.trim();
    }
}

// Factory function
function createKnowledgeManager() {
    return new KnowledgeManager();
}

module.exports = { KnowledgeManager, createKnowledgeManager };
