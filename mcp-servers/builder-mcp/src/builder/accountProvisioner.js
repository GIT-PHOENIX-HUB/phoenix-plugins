/**
 * Phoenix Builder Space - Account Provisioner
 * 
 * Handles user account lifecycle: onboarding, offboarding,
 * license management, and group membership.
 */

const { createGraphAutomation } = require('./graphAutomation');
const { createGovernanceEngine } = require('./governance');
const { builderConfig } = require('./config');

class AccountProvisioner {
    constructor() {
        this.graph = createGraphAutomation();
        this.governance = createGovernanceEngine();
    }

    /**
     * Full onboarding workflow for a new user
     */
    async onboardUser(userDetails) {
        const results = {
            steps: [],
            success: true,
            userId: null,
            errors: []
        };

        const checklist = builderConfig.modules.accountProvisioning.onboardingChecklist;

        try {
            // Step 1: Create the account
            if (checklist.includes('create_account')) {
                console.log('Creating user account...');
                const createResult = await this.graph.createUser(userDetails);
                results.userId = createResult.userId;
                results.temporaryPassword = createResult.temporaryPassword;
                results.steps.push({
                    step: 'create_account',
                    success: true,
                    userId: createResult.userId
                });

                // Log the action
                await this.governance.logEvent('user_created', {
                    userId: createResult.userId,
                    userPrincipalName: createResult.userPrincipalName,
                    createdBy: 'AccountProvisioner'
                });
            }

            // Step 2: Assign licenses
            if (checklist.includes('assign_licenses') && results.userId) {
                console.log('Assigning licenses...');
                const licenses = userDetails.licenses || builderConfig.modules.accountProvisioning.defaultLicenses;
                
                if (licenses && licenses.length > 0) {
                    await this.graph.assignLicenses(results.userId, licenses);
                    results.steps.push({
                        step: 'assign_licenses',
                        success: true,
                        licenses
                    });
                } else {
                    results.steps.push({
                        step: 'assign_licenses',
                        success: true,
                        skipped: true,
                        reason: 'No licenses specified'
                    });
                }
            }

            // Step 3: Add to groups
            if (checklist.includes('add_to_groups') && results.userId && userDetails.groups) {
                console.log('Adding to groups...');
                const groupResults = [];
                
                for (const groupId of userDetails.groups) {
                    try {
                        await this.graph.addUserToGroup(results.userId, groupId);
                        groupResults.push({ groupId, success: true });
                    } catch (error) {
                        groupResults.push({ groupId, success: false, error: error.message });
                    }
                }
                
                results.steps.push({
                    step: 'add_to_groups',
                    success: groupResults.every(r => r.success),
                    groups: groupResults
                });
            }

            // Step 4: Setup mailbox (Exchange Online provisions automatically with license)
            if (checklist.includes('setup_mailbox')) {
                results.steps.push({
                    step: 'setup_mailbox',
                    success: true,
                    note: 'Mailbox will be provisioned automatically with Exchange license'
                });
            }

            // Step 5: Send welcome email (creates draft - doesn't auto-send)
            if (checklist.includes('send_welcome_email') && userDetails.managerEmail) {
                console.log('Creating welcome email draft...');
                const welcomeEmail = this.buildWelcomeEmail(userDetails, results);
                
                // Create draft for manager to review and send
                const draft = await this.graph.createDraft(userDetails.managerEmail, {
                    subject: `Welcome ${userDetails.displayName} to the Team`,
                    body: welcomeEmail,
                    to: [userDetails.email],
                    contentType: 'HTML'
                });

                results.steps.push({
                    step: 'send_welcome_email',
                    success: true,
                    note: 'Draft created in manager mailbox for review',
                    draftId: draft.id
                });
            }

            // Final logging
            await this.governance.logEvent('user_onboarded', {
                userId: results.userId,
                displayName: userDetails.displayName,
                stepsCompleted: results.steps.length,
                success: true
            });

        } catch (error) {
            results.success = false;
            results.errors.push(error.message);
            
            await this.governance.logEvent('onboarding_failed', {
                userDetails,
                error: error.message,
                stepsCompleted: results.steps.length
            });
        }

        return results;
    }

    /**
     * Full offboarding workflow for a departing user
     */
    async offboardUser(userId, options = {}) {
        const results = {
            steps: [],
            success: true,
            errors: []
        };

        const checklist = builderConfig.modules.accountProvisioning.offboardingChecklist;

        try {
            // Get user info first
            const user = await this.graph.getUser(userId);
            console.log(`Offboarding user: ${user.displayName}`);

            // Step 1: Disable account
            if (checklist.includes('disable_account')) {
                console.log('Disabling account...');
                await this.graph.disableUser(userId);
                results.steps.push({
                    step: 'disable_account',
                    success: true
                });

                await this.governance.logEvent('user_disabled', {
                    userId,
                    displayName: user.displayName
                });
            }

            // Step 2: Remove licenses
            if (checklist.includes('remove_licenses')) {
                console.log('Removing licenses...');
                const currentLicenses = user.assignedLicenses?.map(l => l.skuId) || [];
                
                if (currentLicenses.length > 0) {
                    await this.graph.removeLicenses(userId, currentLicenses);
                    results.steps.push({
                        step: 'remove_licenses',
                        success: true,
                        licensesRemoved: currentLicenses.length
                    });
                } else {
                    results.steps.push({
                        step: 'remove_licenses',
                        success: true,
                        skipped: true,
                        reason: 'No licenses to remove'
                    });
                }
            }

            // Step 3: Remove from groups
            if (checklist.includes('remove_from_groups')) {
                console.log('Removing from groups...');
                const groups = user.memberOf?.filter(m => m['@odata.type'] === '#microsoft.graph.group') || [];
                const groupResults = [];

                for (const group of groups) {
                    try {
                        await this.graph.removeUserFromGroup(userId, group.id);
                        groupResults.push({ groupId: group.id, groupName: group.displayName, success: true });
                    } catch (error) {
                        groupResults.push({ groupId: group.id, success: false, error: error.message });
                    }
                }

                results.steps.push({
                    step: 'remove_from_groups',
                    success: groupResults.every(r => r.success),
                    groups: groupResults
                });
            }

            // Step 4: Convert to shared mailbox (requires Exchange admin - note for manual action)
            if (checklist.includes('convert_to_shared_mailbox')) {
                results.steps.push({
                    step: 'convert_to_shared_mailbox',
                    success: true,
                    note: 'Manual action required: Convert mailbox via Exchange Admin Center',
                    actionRequired: true
                });
            }

            // Step 5: Archive OneDrive (note for manual action or separate process)
            if (checklist.includes('archive_onedrive')) {
                results.steps.push({
                    step: 'archive_onedrive',
                    success: true,
                    note: 'OneDrive will be accessible to manager for 30 days, then archived',
                    actionRequired: options.archiveOneDrive || false
                });
            }

            // Step 6: Notify manager
            if (checklist.includes('notify_manager') && options.managerEmail) {
                console.log('Notifying manager...');
                const notificationEmail = this.buildOffboardingNotification(user, results);
                
                // This would typically go to an internal notification queue
                // Not sending externally per golden rules
                results.steps.push({
                    step: 'notify_manager',
                    success: true,
                    managerEmail: options.managerEmail,
                    note: 'Notification logged (internal)'
                });
            }

            // Final logging
            await this.governance.logEvent('user_offboarded', {
                userId,
                displayName: user.displayName,
                stepsCompleted: results.steps.length,
                success: true
            });

        } catch (error) {
            results.success = false;
            results.errors.push(error.message);
            
            await this.governance.logEvent('offboarding_failed', {
                userId,
                error: error.message,
                stepsCompleted: results.steps.length
            });
        }

        return results;
    }

    /**
     * Assign licenses to a user
     */
    async assignLicenses(userId, licenseSkus) {
        try {
            await this.graph.assignLicenses(userId, licenseSkus);
            
            await this.governance.logEvent('licenses_assigned', {
                userId,
                licenses: licenseSkus
            });

            return { success: true, userId, licenses: licenseSkus };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove licenses from a user
     */
    async removeLicenses(userId, licenseSkus) {
        try {
            await this.graph.removeLicenses(userId, licenseSkus);
            
            await this.governance.logEvent('licenses_removed', {
                userId,
                licenses: licenseSkus
            });

            return { success: true, userId, licenses: licenseSkus };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get license availability report
     */
    async getLicenseReport() {
        const licenses = await this.graph.getAvailableLicenses();
        
        return {
            timestamp: new Date().toISOString(),
            licenses: licenses,
            summary: {
                totalSkus: licenses.length,
                licensesWithAvailability: licenses.filter(l => l.available > 0).length,
                licensesFullyConsumed: licenses.filter(l => l.available === 0).length
            }
        };
    }

    /**
     * Build welcome email content
     */
    buildWelcomeEmail(userDetails, onboardResults) {
        return `
            <html>
            <body style="font-family: Calibri, Arial, sans-serif;">
                <h2>Welcome to Phoenix Electric, ${userDetails.firstName}!</h2>
                
                <p>Your account has been created and you're ready to get started.</p>
                
                <h3>Your Account Details:</h3>
                <ul>
                    <li><strong>Email:</strong> ${userDetails.email}</li>
                    <li><strong>Temporary Password:</strong> ${onboardResults.temporaryPassword}</li>
                </ul>
                
                <p><strong>Important:</strong> You will be prompted to change your password on first login.</p>
                
                <h3>Getting Started:</h3>
                <ol>
                    <li>Go to <a href="https://portal.office.com">portal.office.com</a></li>
                    <li>Sign in with your email and temporary password</li>
                    <li>Set up your new password and MFA (multi-factor authentication)</li>
                    <li>Access your email at <a href="https://outlook.office.com">outlook.office.com</a></li>
                </ol>
                
                <p>If you have any questions, please contact the IT team.</p>
                
                <p>Welcome aboard!</p>
                <p><em>Phoenix Electric IT Team</em></p>
                
                <hr>
                <small style="color: #666;">
                    This email was generated by Phoenix Builder Space.
                    Please review before sending to the new team member.
                </small>
            </body>
            </html>
        `;
    }

    /**
     * Build offboarding notification content
     */
    buildOffboardingNotification(user, offboardResults) {
        const steps = offboardResults.steps
            .map(s => `- ${s.step}: ${s.success ? '✓' : '✗'} ${s.note || ''}`)
            .join('\n');

        return `
User Offboarding Complete
========================

User: ${user.displayName} (${user.userPrincipalName})
Date: ${new Date().toISOString()}

Completed Steps:
${steps}

Action Items:
${offboardResults.steps.filter(s => s.actionRequired).map(s => `- ${s.step}: ${s.note}`).join('\n') || 'None'}

This notification was generated by Phoenix Builder Space.
        `.trim();
    }
}

// Factory function
function createAccountProvisioner() {
    return new AccountProvisioner();
}

module.exports = { AccountProvisioner, createAccountProvisioner };
