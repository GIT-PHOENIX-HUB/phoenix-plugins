/**
 * Phoenix Mail Courier - Attachment Handler
 * 
 * Handles saving email attachments to SharePoint with proper folder structure.
 * Follows naming conventions: EmailTriage_<Date>_Attachment_<Name>.ext
 */

const { getGraphClient } = require('../integrations/graph');
const { courierConfig, getAttachmentPath } = require('./config');

class AttachmentHandler {
    constructor() {
        this.graphClient = getGraphClient();
        this.siteId = courierConfig.sharePointConfig.siteId;
        this.driveId = courierConfig.sharePointConfig.driveId;
    }

    /**
     * Save all attachments from an email to SharePoint
     */
    async saveEmailAttachments(mailboxEmail, messageId, userId, senderEmail) {
        // GOLDEN RULE CHECK: Never delete, only save
        if (courierConfig.goldenRules.deleteEnabled) {
            throw new Error('SECURITY VIOLATION: Delete operations are not allowed.');
        }

        const savedAttachments = [];

        try {
            // Get attachments from the email
            const attachments = await this.getEmailAttachments(mailboxEmail, messageId);

            if (!attachments || attachments.length === 0) {
                return savedAttachments;
            }

            // Determine the folder path based on sender
            const senderDomain = this.extractDomain(senderEmail);
            const folderPath = getAttachmentPath(userId, senderDomain);

            // Ensure the folder exists
            await this.ensureFolderExists(folderPath);

            // Save each attachment
            for (const attachment of attachments) {
                // Skip if not a file attachment or exceeds size limit
                if (attachment['@odata.type'] !== '#microsoft.graph.fileAttachment') {
                    continue;
                }

                const sizeMB = (attachment.size || 0) / (1024 * 1024);
                if (sizeMB > courierConfig.limits.maxAttachmentSizeMB) {
                    console.warn(`Skipping attachment ${attachment.name}: exceeds size limit (${sizeMB.toFixed(2)}MB)`);
                    continue;
                }

                try {
                    const savedFile = await this.saveAttachment(
                        attachment,
                        folderPath,
                        senderEmail
                    );
                    savedAttachments.push(savedFile);
                } catch (error) {
                    console.error(`Failed to save attachment ${attachment.name}: ${error.message}`);
                }
            }

            return savedAttachments;
        } catch (error) {
            throw new Error(`Attachment handling failed: ${error.message}`);
        }
    }

    /**
     * Get attachments from an email
     */
    async getEmailAttachments(mailboxEmail, messageId) {
        const client = await this.graphClient.getClient();

        try {
            const response = await client
                .api(`/users/${mailboxEmail}/messages/${messageId}/attachments`)
                .get();

            return response.value || [];
        } catch (error) {
            throw new Error(`Failed to get attachments: ${error.message}`);
        }
    }

    /**
     * Save a single attachment to SharePoint
     */
    async saveAttachment(attachment, folderPath, senderEmail) {
        const client = await this.graphClient.getClient();

        // Generate filename with date prefix for uniqueness
        const date = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();
        const cleanName = this.sanitizeFilename(attachment.name);
        const fileName = `EmailTriage_${date}_${timestamp}_${cleanName}`;

        // Decode the attachment content
        const content = Buffer.from(attachment.contentBytes, 'base64');

        try {
            // Upload to SharePoint/OneDrive
            let uploadPath;
            
            if (this.siteId && this.driveId) {
                // Upload to SharePoint site
                uploadPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${folderPath}/${fileName}:/content`;
            } else if (this.siteId) {
                // Upload to SharePoint site default drive
                uploadPath = `/sites/${this.siteId}/drive/root:/${folderPath}/${fileName}:/content`;
            } else {
                // Fall back to user's OneDrive (using first configured mailbox)
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                uploadPath = `/users/${userEmail}/drive/root:/${folderPath}/${fileName}:/content`;
            }

            const result = await client
                .api(uploadPath)
                .put(content);

            return {
                name: fileName,
                originalName: attachment.name,
                path: folderPath,
                size: attachment.size,
                id: result.id,
                webUrl: result.webUrl
            };
        } catch (error) {
            throw new Error(`Upload failed for ${fileName}: ${error.message}`);
        }
    }

    /**
     * Ensure a folder path exists in SharePoint, creating if necessary
     */
    async ensureFolderExists(folderPath) {
        const client = await this.graphClient.getClient();
        const folders = folderPath.split('/').filter(f => f);

        let currentPath = '';

        for (const folder of folders) {
            const parentPath = currentPath || 'root';
            currentPath = currentPath ? `${currentPath}/${folder}` : folder;

            try {
                // Check if folder exists
                let checkPath;
                if (this.siteId && this.driveId) {
                    checkPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${currentPath}`;
                } else if (this.siteId) {
                    checkPath = `/sites/${this.siteId}/drive/root:/${currentPath}`;
                } else {
                    const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                    checkPath = `/users/${userEmail}/drive/root:/${currentPath}`;
                }

                await client.api(checkPath).get();
            } catch (error) {
                // Folder doesn't exist, create it
                if (error.statusCode === 404) {
                    await this.createFolder(parentPath, folder);
                }
            }
        }
    }

    /**
     * Create a folder in SharePoint
     */
    async createFolder(parentPath, folderName) {
        const client = await this.graphClient.getClient();

        try {
            let createPath;
            if (this.siteId && this.driveId) {
                createPath = parentPath === 'root'
                    ? `/sites/${this.siteId}/drives/${this.driveId}/root/children`
                    : `/sites/${this.siteId}/drives/${this.driveId}/root:/${parentPath}:/children`;
            } else if (this.siteId) {
                createPath = parentPath === 'root'
                    ? `/sites/${this.siteId}/drive/root/children`
                    : `/sites/${this.siteId}/drive/root:/${parentPath}:/children`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                createPath = parentPath === 'root'
                    ? `/users/${userEmail}/drive/root/children`
                    : `/users/${userEmail}/drive/root:/${parentPath}:/children`;
            }

            await client
                .api(createPath)
                .post({
                    name: folderName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'fail'
                });
        } catch (error) {
            // Ignore if folder already exists (race condition)
            if (!error.message?.includes('nameAlreadyExists')) {
                throw error;
            }
        }
    }

    /**
     * Extract domain from email address
     */
    extractDomain(email) {
        if (!email) return 'Unknown';
        
        const match = email.match(/@([^@]+)$/);
        if (match) {
            // Get domain without TLD for cleaner folder names
            const domain = match[1];
            const parts = domain.split('.');
            // Return company name (e.g., 'acmecorp' from 'acmecorp.com')
            return parts.length > 1 ? parts[0] : domain;
        }
        
        return 'Unknown';
    }

    /**
     * Sanitize filename for safe storage
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid characters
            .replace(/\s+/g, '_')            // Replace spaces with underscores
            .replace(/_+/g, '_')             // Collapse multiple underscores
            .substring(0, 100);              // Limit length
    }

    /**
     * Get list of saved attachments for a user
     */
    async listSavedAttachments(userId, senderDomain = null) {
        const client = await this.graphClient.getClient();
        
        let folderPath = `${courierConfig.sharePointConfig.basePaths.emailContacts}/${userId}`;
        if (senderDomain) {
            folderPath += `/${senderDomain}`;
        }

        try {
            let listPath;
            if (this.siteId && this.driveId) {
                listPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${folderPath}:/children`;
            } else if (this.siteId) {
                listPath = `/sites/${this.siteId}/drive/root:/${folderPath}:/children`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                listPath = `/users/${userEmail}/drive/root:/${folderPath}:/children`;
            }

            const response = await client.api(listPath).get();
            return response.value || [];
        } catch (error) {
            if (error.statusCode === 404) {
                return [];
            }
            throw error;
        }
    }
}

// Factory function
function createAttachmentHandler() {
    return new AttachmentHandler();
}

module.exports = { AttachmentHandler, createAttachmentHandler };
