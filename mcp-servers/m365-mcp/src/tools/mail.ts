/**
 * Phoenix 365 — Mail Tools
 *
 * Graph API operations for Microsoft 365 mail (Outlook).
 * All functions accept a Graph client as the first parameter for testability
 * and to support multiple credential contexts.
 *
 * @module tools/mail
 */

import type { Client } from '@microsoft/microsoft-graph-client';

/** Recipient shape for sendMail */
export interface MailRecipient {
  emailAddress: {
    address: string;
    name?: string;
  };
}

/** Response shape from Graph API for message collections */
interface GraphMessageResponse {
  value: GraphMessage[];
}

/** Response shape from Graph API for mail folder collections */
interface GraphMailFolderResponse {
  value: GraphMailFolder[];
}

/** Single message from Graph API */
interface GraphMessage {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      address?: string;
      name?: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body?: {
    contentType: string;
    content: string;
  };
  toRecipients?: Array<{
    emailAddress?: {
      address?: string;
      name?: string;
    };
  }>;
  hasAttachments?: boolean;
  importance?: string;
}

/** Single mail folder from Graph API */
interface GraphMailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

/**
 * Lists messages in a user's mailbox.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN (e.g. "user@domain.com")
 * @param top - Maximum number of messages to return (default 25, max 1000)
 * @param filter - OData $filter expression (e.g. "isRead eq false")
 * @returns Array of mail messages
 */
export async function listMessages(
  client: Client,
  userId: string,
  top: number = 25,
  filter?: string,
): Promise<GraphMessage[]> {
  let request = client
    .api(`/users/${userId}/messages`)
    .top(top)
    .select('id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments,importance')
    .orderby('receivedDateTime desc');

  if (filter) {
    request = request.filter(filter);
  }

  const response: GraphMessageResponse = await request.get();
  return response.value;
}

/**
 * Gets a single message by ID with full body content.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param messageId - The message ID
 * @returns Full message object including body
 */
export async function getMessage(
  client: Client,
  userId: string,
  messageId: string,
): Promise<GraphMessage> {
  const message: GraphMessage = await client
    .api(`/users/${userId}/messages/${messageId}`)
    .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body,toRecipients,hasAttachments,importance')
    .get();

  return message;
}

/**
 * Sends an email on behalf of a user.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN of the sender
 * @param subject - Email subject line
 * @param body - Email body (HTML)
 * @param toRecipients - Array of recipient email addresses
 * @returns void — Graph API returns 202 Accepted with no body
 */
export async function sendMail(
  client: Client,
  userId: string,
  subject: string,
  body: string,
  toRecipients: string[],
): Promise<void> {
  const recipients: MailRecipient[] = toRecipients.map((address) => ({
    emailAddress: { address },
  }));

  const sendMailBody = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: body,
      },
      toRecipients: recipients,
    },
    saveToSentItems: true,
  };

  await client
    .api(`/users/${userId}/sendMail`)
    .post(sendMailBody);
}

/**
 * Lists mail folders for a user.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @returns Array of mail folders with counts
 */
export async function listMailFolders(
  client: Client,
  userId: string,
): Promise<GraphMailFolder[]> {
  const response: GraphMailFolderResponse = await client
    .api(`/users/${userId}/mailFolders`)
    .select('id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount')
    .get();

  return response.value;
}
