/**
 * MCP Tool Registry
 * 
 * Manages the registration and retrieval of MCP tools.
 * Tools are categorized by their source system and access requirements.
 */

class MCPToolRegistry {
    constructor() {
        this.tools = new Map();
        this.categories = new Set();
    }

    /**
     * Register a new tool
     * @param {Object} toolDefinition - Tool configuration
     */
    registerTool(toolDefinition) {
        const {
            name,
            description,
            category = 'general',
            requiresAuth = false,
            scopes = [],
            requiresApproval = false,
            parameters = {},
            handler = null,
            backendFunction = null
        } = toolDefinition;

        if (!name) {
            throw new Error('Tool name is required');
        }

        if (this.tools.has(name)) {
            console.warn(`Tool ${name} is being overwritten`);
        }

        this.tools.set(name, {
            name,
            description,
            category,
            requiresAuth,
            scopes,
            requiresApproval,
            parameters,
            handler,
            backendFunction: backendFunction || name,
            registeredAt: new Date().toISOString()
        });

        this.categories.add(category);

        return this;
    }

    /**
     * Get a tool by name
     * @param {string} name - Tool name
     * @returns {Object|null} Tool definition or null
     */
    getTool(name) {
        return this.tools.get(name) || null;
    }

    /**
     * Check if a tool exists
     * @param {string} name - Tool name
     * @returns {boolean}
     */
    hasTool(name) {
        return this.tools.has(name);
    }

    /**
     * List all registered tools
     * @returns {Array} Array of tool definitions
     */
    listTools() {
        return Array.from(this.tools.values());
    }

    /**
     * List tool names only
     * @returns {Array} Array of tool names
     */
    listToolNames() {
        return Array.from(this.tools.keys());
    }

    /**
     * List tools by category
     * @param {string} category - Category name
     * @returns {Array} Array of tools in category
     */
    listToolsByCategory(category) {
        return this.listTools().filter(tool => tool.category === category);
    }

    /**
     * List all categories
     * @returns {Array} Array of category names
     */
    listCategories() {
        return Array.from(this.categories);
    }

    /**
     * List tools that require authentication
     * @returns {Array} Array of protected tools
     */
    listProtectedTools() {
        return this.listTools().filter(tool => tool.requiresAuth);
    }

    /**
     * List tools that require approval
     * @returns {Array} Array of tools requiring approval
     */
    listApprovalRequiredTools() {
        return this.listTools().filter(tool => tool.requiresApproval);
    }

    /**
     * Get tools grouped by category
     * @returns {Object} Tools grouped by category
     */
    getToolsByCategory() {
        const grouped = {};
        for (const tool of this.listTools()) {
            if (!grouped[tool.category]) {
                grouped[tool.category] = [];
            }
            grouped[tool.category].push(tool);
        }
        return grouped;
    }

    /**
     * Get tool summary for documentation
     * @returns {Object} Summary object
     */
    getSummary() {
        const tools = this.listTools();
        return {
            totalTools: tools.length,
            categories: this.listCategories(),
            protectedCount: this.listProtectedTools().length,
            approvalRequiredCount: this.listApprovalRequiredTools().length,
            byCategory: Object.fromEntries(
                this.listCategories().map(cat => [
                    cat,
                    this.listToolsByCategory(cat).length
                ])
            )
        };
    }

    /**
     * Generate MCP tool listing format
     * @returns {Object} MCP-compatible tool listing
     */
    toMCPFormat() {
        return {
            tools: this.listTools().map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.parameters,
                annotations: {
                    category: tool.category,
                    requiresAuth: tool.requiresAuth,
                    requiresApproval: tool.requiresApproval,
                    scopes: tool.scopes
                }
            }))
        };
    }

    /**
     * Generate OpenAI function calling format
     * @returns {Array} Array of function definitions
     */
    toOpenAIFunctionsFormat() {
        return this.listTools().map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    /**
     * Unregister a tool
     * @param {string} name - Tool name
     * @returns {boolean} True if tool was removed
     */
    unregisterTool(name) {
        return this.tools.delete(name);
    }

    /**
     * Clear all tools
     */
    clear() {
        this.tools.clear();
        this.categories.clear();
    }
}

module.exports = { MCPToolRegistry };
