/**
 * Phoenix Mail Courier - Draft Reply Generator
 * 
 * Uses OpenAI/GPT-4 to generate intelligent draft replies to emails.
 * Follows the golden rule: NEVER auto-send - drafts only.
 */

const OpenAI = require('openai');
const { getGraphClient } = require('../integrations/graph');
const { courierConfig } = require('./config');

class DraftGenerator {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.model = courierConfig.draftGeneration.model || 'gpt-4';
        this.graphClient = getGraphClient();
    }

    /**
     * Generate a draft reply for an email and save it to drafts
     */
    async generateAndSaveDraft(mailboxEmail, originalEmail) {
        // GOLDEN RULE CHECK: Ensure we're only creating drafts
        if (courierConfig.goldenRules.autoSendEnabled) {
            throw new Error('SECURITY VIOLATION: Auto-send is not allowed. Drafts only.');
        }

        try {
            // Step 1: Generate the reply content using AI
            const replyContent = await this.generateReplyContent(originalEmail);

            // Step 2: Create the draft in the mailbox
            const draft = await this.createDraftReply(mailboxEmail, originalEmail, replyContent);

            return {
                success: true,
                draftId: draft.id,
                subject: draft.subject,
                message: 'Draft created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate reply content using GPT-4
     */
    async generateReplyContent(email) {
        const senderName = email.from?.emailAddress?.name || 'there';
        const subject = email.subject || '(No Subject)';
        const body = this.extractEmailBody(email);

        // Build the prompt
        const prompt = `
You are drafting a reply to an email received by Phoenix Electric.

ORIGINAL EMAIL:
From: ${email.from?.emailAddress?.name || 'Unknown'} <${email.from?.emailAddress?.address || 'unknown'}>
Subject: ${subject}
Date: ${email.receivedDateTime}

Body:
${body}

---

Please draft a professional, courteous reply to this email. 
- Acknowledge the sender's message
- Address any questions or requests if possible
- Keep it brief and professional
- Do NOT make commitments or promises
- If unsure about something, indicate the team will follow up
- Sign off appropriately

Draft the reply only (no explanations or meta-commentary):
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { 
                        role: 'system', 
                        content: courierConfig.draftGeneration.systemPrompt 
                    },
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            let replyContent = response.choices[0]?.message?.content || '';

            // Enforce length limit
            if (replyContent.length > courierConfig.limits.maxDraftLengthChars) {
                replyContent = replyContent.substring(0, courierConfig.limits.maxDraftLengthChars) + '...';
            }

            // Add draft footer for transparency
            replyContent += courierConfig.draftGeneration.draftFooter;

            return replyContent;
        } catch (error) {
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    /**
     * Extract readable body from email
     */
    extractEmailBody(email) {
        // Prefer plain text, fall back to HTML stripped
        if (email.body?.contentType === 'text') {
            return email.body.content;
        }

        if (email.body?.content) {
            // Strip HTML tags for cleaner processing
            return this.stripHtml(email.body.content);
        }

        // Fall back to preview
        return email.bodyPreview || '';
    }

    /**
     * Strip HTML tags from content
     */
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
            .replace(/&nbsp;/g, ' ')    // Replace non-breaking spaces
            .replace(/&amp;/g, '&')     // Replace ampersands
            .replace(/&lt;/g, '<')      // Replace less than
            .replace(/&gt;/g, '>')      // Replace greater than
            .replace(/\s+/g, ' ')       // Collapse whitespace
            .trim();
    }

    /**
     * Create a draft reply in the mailbox
     */
    async createDraftReply(mailboxEmail, originalEmail, replyContent) {
        const client = await this.graphClient.getClient();

        // Build the subject line
        let subject = originalEmail.subject || '';
        if (!subject.toLowerCase().startsWith('re:')) {
            subject = `Re: ${subject}`;
        }
        
        // Add prefix if configured
        if (courierConfig.draftGeneration.subjectPrefix) {
            subject = `${courierConfig.draftGeneration.subjectPrefix}${subject}`;
        }

        try {
            // Create a reply draft using Graph API
            // Method 1: Create reply from original message
            const reply = await client
                .api(`/users/${mailboxEmail}/messages/${originalEmail.id}/createReply`)
                .post({});

            // Update the reply with our generated content
            const updatedDraft = await client
                .api(`/users/${mailboxEmail}/messages/${reply.id}`)
                .patch({
                    body: {
                        contentType: 'HTML',
                        content: this.formatAsHtml(replyContent)
                    }
                });

            return updatedDraft || reply;
        } catch (error) {
            // Fallback: Create a new draft message
            try {
                const draft = await client
                    .api(`/users/${mailboxEmail}/messages`)
                    .post({
                        subject: subject,
                        body: {
                            contentType: 'HTML',
                            content: this.formatAsHtml(replyContent)
                        },
                        toRecipients: [
                            {
                                emailAddress: {
                                    address: originalEmail.from?.emailAddress?.address,
                                    name: originalEmail.from?.emailAddress?.name
                                }
                            }
                        ],
                        // Reference the original message
                        conversationId: originalEmail.conversationId
                    });

                return draft;
            } catch (fallbackError) {
                throw new Error(`Failed to create draft: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Format plain text as HTML for email
     */
    formatAsHtml(text) {
        // Convert line breaks to HTML
        const htmlContent = text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');

        return `
            <html>
                <body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
                    ${htmlContent}
                </body>
            </html>
        `;
    }

    /**
     * Generate a simple acknowledgment reply (for simple emails)
     */
    async generateSimpleAcknowledgment(senderName) {
        return `Hi ${senderName},

Thank you for your email. I've received your message and will review it shortly.

If this is urgent, please don't hesitate to call our office.

Best regards,
Phoenix Electric Team${courierConfig.draftGeneration.draftFooter}`;
    }

    /**
     * Generate a reply for a specific type of email
     */
    async generateTypedReply(email, emailType) {
        const templates = {
            'invoice': `Thank you for sending this invoice. Our accounting team will review and process it according to our standard payment terms.`,
            'quote_request': `Thank you for your inquiry. We'll review your request and prepare a quote for you shortly. A team member will be in touch.`,
            'scheduling': `Thank you for reaching out about scheduling. Let me check our availability and get back to you with some options.`,
            'complaint': `Thank you for bringing this to our attention. We take all feedback seriously and will look into this matter promptly. A manager will follow up with you directly.`,
            'general': null  // Use AI generation
        };

        if (templates[emailType]) {
            const senderName = email.from?.emailAddress?.name || 'there';
            return `Hi ${senderName},\n\n${templates[emailType]}\n\nBest regards,\nPhoenix Electric Team${courierConfig.draftGeneration.draftFooter}`;
        }

        // Fall back to AI generation
        return this.generateReplyContent(email);
    }

    /**
     * Classify email type based on content
     */
    classifyEmailType(subject, bodyPreview) {
        const text = `${subject} ${bodyPreview}`.toLowerCase();

        if (text.includes('invoice') || text.includes('payment') || text.includes('bill')) {
            return 'invoice';
        }
        if (text.includes('quote') || text.includes('estimate') || text.includes('price')) {
            return 'quote_request';
        }
        if (text.includes('schedule') || text.includes('appointment') || text.includes('available')) {
            return 'scheduling';
        }
        if (text.includes('complaint') || text.includes('problem') || text.includes('issue') || text.includes('unhappy')) {
            return 'complaint';
        }

        return 'general';
    }
}

// Factory function
function createDraftGenerator() {
    return new DraftGenerator();
}

module.exports = { DraftGenerator, createDraftGenerator };
