/**
 * OpenAI Chat Handler
 * Manages conversations with ChatGPT including function calling
 */

const OpenAI = require('openai');
const { tools } = require('./functionDefinitions');
const { getFunctionExecutor } = require('./functionExecutor');

const SYSTEM_PROMPT = `You are Phoenix, the AI assistant for Phoenix Electric, an electrical service company. 
You help manage operations by providing information from ServiceTitan (field service management) and Microsoft 365.

Your capabilities include:
- ServiceTitan: View jobs, customers, technicians, invoices, estimates, and timesheets
- Email: Read, summarize, draft replies, and organize emails
- Calendar: View and create calendar events
- Teams: Post messages and notifications
- Files: Save attachments and list files in OneDrive/SharePoint
- Tasks: Create To-Do tasks

Guidelines:
1. Be concise and professional in your responses
2. When asked about business data, use the available functions to fetch real-time information
3. For write operations (updating jobs, sending emails, creating events), always confirm with the user first
4. If you're unsure about something, ask for clarification rather than guessing
5. Format data clearly - use bullet points or tables when presenting multiple items
6. Always mention the source of data (e.g., "According to ServiceTitan..." or "From your calendar...")

When users ask about:
- "Jobs today" or "daily summary" → use getDailyJobSummary
- "Unread emails" or "inbox" → use getEmailSummary
- "My schedule" or "calendar" → use getTodayEvents
- Specific jobs, customers, or technicians → use the appropriate search/get functions

For time references:
- "Today" = current date
- "This week" = Monday through Friday of current week
- Use ISO date format (YYYY-MM-DD) for date parameters`;

class ChatHandler {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.model = process.env.OPENAI_MODEL || 'gpt-4';
        this.functionExecutor = getFunctionExecutor();
        
        // Store conversation history per session
        this.conversations = new Map();
    }

    /**
     * Get or create conversation history for a session
     */
    getConversation(sessionId) {
        if (!this.conversations.has(sessionId)) {
            this.conversations.set(sessionId, [
                { role: 'system', content: SYSTEM_PROMPT }
            ]);
        }
        return this.conversations.get(sessionId);
    }

    /**
     * Clear conversation history for a session
     */
    clearConversation(sessionId) {
        this.conversations.delete(sessionId);
    }

    /**
     * Process a user message and return AI response
     */
    async chat(sessionId, userMessage) {
        const conversation = this.getConversation(sessionId);
        
        // Add user message to history
        conversation.push({ role: 'user', content: userMessage });

        try {
            // Call OpenAI with function calling enabled
            let response = await this.openai.chat.completions.create({
                model: this.model,
                messages: conversation,
                tools: tools,
                tool_choice: 'auto'
            });

            let assistantMessage = response.choices[0].message;

            // Handle function calls
            while (assistantMessage.tool_calls) {
                // Add assistant message with tool calls to history
                conversation.push(assistantMessage);

                // Execute each function call
                const toolResults = [];
                for (const toolCall of assistantMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    console.log(`Executing function: ${functionName}`, functionArgs);

                    const result = await this.functionExecutor.execute(
                        functionName, 
                        functionArgs,
                        sessionId
                    );

                    // Check if confirmation is needed
                    if (result.needsConfirmation) {
                        // Add the confirmation request as a tool result
                        toolResults.push({
                            tool_call_id: toolCall.id,
                            role: 'tool',
                            content: JSON.stringify({
                                status: 'confirmation_required',
                                message: result.message
                            })
                        });
                    } else {
                        toolResults.push({
                            tool_call_id: toolCall.id,
                            role: 'tool',
                            content: JSON.stringify(result.success ? result.data : { error: result.error })
                        });
                    }
                }

                // Add tool results to conversation
                conversation.push(...toolResults);

                // Get next response from OpenAI
                response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: conversation,
                    tools: tools,
                    tool_choice: 'auto'
                });

                assistantMessage = response.choices[0].message;
            }

            // Add final assistant response to history
            conversation.push(assistantMessage);

            // Keep conversation history manageable (last 20 messages + system prompt)
            if (conversation.length > 21) {
                const systemPrompt = conversation[0];
                conversation.splice(1, conversation.length - 21);
            }

            return {
                success: true,
                response: assistantMessage.content,
                sessionId
            };

        } catch (error) {
            console.error('Chat error:', error);
            return {
                success: false,
                error: error.message || 'An error occurred while processing your request',
                sessionId
            };
        }
    }

    /**
     * Handle confirmation response from user
     */
    async handleConfirmation(sessionId, functionName, confirmed) {
        if (confirmed) {
            this.functionExecutor.confirmOperation(sessionId, functionName);
            return this.chat(sessionId, 'Yes, proceed with the operation.');
        } else {
            return this.chat(sessionId, 'No, cancel the operation.');
        }
    }

    /**
     * Get a quick response without function calling (for simple queries)
     */
    async quickChat(message) {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: 'You are Phoenix, a helpful AI assistant for Phoenix Electric.' },
                    { role: 'user', content: message }
                ]
            });

            return {
                success: true,
                response: response.choices[0].message.content
            };
        } catch (error) {
            console.error('Quick chat error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
let instance = null;

function getChatHandler() {
    if (!instance) {
        instance = new ChatHandler();
    }
    return instance;
}

module.exports = { ChatHandler, getChatHandler };
