#!/usr/bin/env node

/**
 * Phoenix 365 — MCP Server
 *
 * Model Context Protocol server exposing Microsoft 365 Graph API operations
 * as tools for AI agents. Communicates over stdio transport.
 *
 * Tool domains:
 *   - mail_*       — Outlook mail operations
 *   - calendar_*   — Calendar and event operations
 *   - sharepoint_* — SharePoint sites, lists, and items
 *   - onedrive_*   — OneDrive file management
 *   - users_*      — Azure AD user directory
 *
 * @module index
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getGatewayGraphClient, getSharePointGraphClient } from './graph-client.js';

import { listMessages, getMessage, sendMail, listMailFolders } from './tools/mail.js';
import { listEvents, createEvent, listCalendars } from './tools/calendar.js';
import type { CreateEventInput } from './tools/calendar.js';
import { listSites, getSite, listLists, getListItems, createListItem } from './tools/sharepoint.js';
import { listDriveItems, getDriveItem, searchDrive, downloadFile } from './tools/onedrive.js';
import { listUsers, getUser, getMe } from './tools/users.js';

// =============================================================================
// Tool Definitions — JSON Schema for each MCP tool
// =============================================================================

const TOOL_DEFINITIONS = [
  // ── Mail ──────────────────────────────────────────────────────────────────
  {
    name: 'mail_list_messages',
    description:
      'List email messages in a user\'s mailbox. Returns subject, sender, date, read status, and preview. ' +
      'Supports OData filtering (e.g. "isRead eq false", "from/emailAddress/address eq \'someone@example.com\'").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        top: {
          type: 'number',
          description: 'Maximum number of messages to return (default 25, max 1000)',
        },
        filter: {
          type: 'string',
          description: 'OData $filter expression',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'mail_get_message',
    description:
      'Get a single email message with full body content by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        messageId: {
          type: 'string',
          description: 'The message ID',
        },
      },
      required: ['userId', 'messageId'],
    },
  },
  {
    name: 'mail_send',
    description:
      'Send an email on behalf of a user. Body content is HTML.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN) of the sender',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content (HTML)',
        },
        toRecipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recipient email addresses',
        },
      },
      required: ['userId', 'subject', 'body', 'toRecipients'],
    },
  },
  {
    name: 'mail_list_folders',
    description:
      'List mail folders for a user (Inbox, Sent Items, Drafts, etc.) with unread and total counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
      },
      required: ['userId'],
    },
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  {
    name: 'calendar_list_events',
    description:
      'List calendar events within a date/time range. Expands recurring events into individual instances. ' +
      'Dates must be ISO 8601 format (e.g. "2026-03-19T00:00:00Z").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        startDateTime: {
          type: 'string',
          description: 'Start of date range (ISO 8601)',
        },
        endDateTime: {
          type: 'string',
          description: 'End of date range (ISO 8601)',
        },
      },
      required: ['userId', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'calendar_create_event',
    description:
      'Create a new calendar event for a user. Times must include timezone. ' +
      'Optionally include attendees, location, and online meeting settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        subject: {
          type: 'string',
          description: 'Event subject/title',
        },
        startDateTime: {
          type: 'string',
          description: 'Event start date/time (e.g. "2026-03-20T09:00:00")',
        },
        startTimeZone: {
          type: 'string',
          description: 'Start timezone (e.g. "America/Chicago")',
        },
        endDateTime: {
          type: 'string',
          description: 'Event end date/time',
        },
        endTimeZone: {
          type: 'string',
          description: 'End timezone (e.g. "America/Chicago")',
        },
        body: {
          type: 'string',
          description: 'Event body/description (HTML)',
        },
        location: {
          type: 'string',
          description: 'Event location name',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of attendee email addresses',
        },
        isOnlineMeeting: {
          type: 'boolean',
          description: 'Whether to create an online (Teams) meeting',
        },
      },
      required: ['userId', 'subject', 'startDateTime', 'startTimeZone', 'endDateTime', 'endTimeZone'],
    },
  },
  {
    name: 'calendar_list_calendars',
    description:
      'List all calendars for a user, including shared calendars.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
      },
      required: ['userId'],
    },
  },

  // ── SharePoint ────────────────────────────────────────────────────────────
  {
    name: 'sharepoint_list_sites',
    description:
      'Search for SharePoint sites by keyword. Returns site name, ID, and URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        search: {
          type: 'string',
          description: 'Search query (e.g. "Phoenix" to find sites containing that name)',
        },
      },
      required: ['search'],
    },
  },
  {
    name: 'sharepoint_get_site',
    description:
      'Get details of a specific SharePoint site by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        siteId: {
          type: 'string',
          description: 'SharePoint site ID (e.g. "contoso.sharepoint.com,guid,guid")',
        },
      },
      required: ['siteId'],
    },
  },
  {
    name: 'sharepoint_list_lists',
    description:
      'List all lists in a SharePoint site.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        siteId: {
          type: 'string',
          description: 'SharePoint site ID',
        },
      },
      required: ['siteId'],
    },
  },
  {
    name: 'sharepoint_get_list_items',
    description:
      'Get items from a SharePoint list with their field values. Supports OData filtering.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        siteId: {
          type: 'string',
          description: 'SharePoint site ID',
        },
        listId: {
          type: 'string',
          description: 'SharePoint list ID',
        },
        top: {
          type: 'number',
          description: 'Maximum number of items to return (default 100)',
        },
        filter: {
          type: 'string',
          description: 'OData $filter expression',
        },
      },
      required: ['siteId', 'listId'],
    },
  },
  {
    name: 'sharepoint_create_list_item',
    description:
      'Create a new item in a SharePoint list. Pass field values as key-value pairs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        siteId: {
          type: 'string',
          description: 'SharePoint site ID',
        },
        listId: {
          type: 'string',
          description: 'SharePoint list ID',
        },
        fields: {
          type: 'object',
          description: 'Field values for the new item (column name -> value)',
          additionalProperties: true,
        },
      },
      required: ['siteId', 'listId', 'fields'],
    },
  },

  // ── OneDrive ──────────────────────────────────────────────────────────────
  {
    name: 'onedrive_list_items',
    description:
      'List files and folders in a OneDrive folder. Use folderId="root" for the drive root.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        folderId: {
          type: 'string',
          description: 'Folder ID, or "root" for drive root (default "root")',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'onedrive_get_item',
    description:
      'Get metadata for a specific file or folder in OneDrive.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        itemId: {
          type: 'string',
          description: 'Drive item ID',
        },
      },
      required: ['userId', 'itemId'],
    },
  },
  {
    name: 'onedrive_search',
    description:
      'Search a user\'s OneDrive for files matching a query string.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['userId', 'query'],
    },
  },
  {
    name: 'onedrive_download',
    description:
      'Download a file from OneDrive. Returns base64-encoded content. ' +
      'For large files (>10MB), prefer using the webUrl from onedrive_get_item instead.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID or email address (UPN)',
        },
        itemId: {
          type: 'string',
          description: 'Drive item ID',
        },
      },
      required: ['userId', 'itemId'],
    },
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  {
    name: 'users_list',
    description:
      'List users in the Azure AD directory. Supports OData filtering ' +
      '(e.g. "department eq \'Electrical\'", "accountEnabled eq true").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        top: {
          type: 'number',
          description: 'Maximum number of users to return (default 25, max 999)',
        },
        filter: {
          type: 'string',
          description: 'OData $filter expression',
        },
      },
      required: [],
    },
  },
  {
    name: 'users_get',
    description:
      'Get a specific user\'s profile by ID or email address (UPN).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (GUID) or email address (UPN)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'users_get_me',
    description:
      'Get the signed-in user\'s profile. Note: only works with delegated auth, ' +
      'not with app-only client credentials. Use users_get with a specific userId for app-only.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const;

// =============================================================================
// Tool Handler — Routes MCP tool calls to the appropriate function
// =============================================================================

/**
 * Resolves the appropriate Graph client for a tool call.
 * SharePoint tools use the SharePoint Director credential set.
 * Everything else uses the Gateway credential set.
 */
async function resolveClient(toolName: string) {
  if (toolName.startsWith('sharepoint_')) {
    return getSharePointGraphClient();
  }
  return getGatewayGraphClient();
}

/**
 * Handles a single tool call, routing to the correct function and returning
 * a JSON-serialized result.
 */
async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const client = await resolveClient(name);

  switch (name) {
    // ── Mail ──
    case 'mail_list_messages':
      return listMessages(
        client,
        args.userId as string,
        (args.top as number) ?? 25,
        args.filter as string | undefined,
      );

    case 'mail_get_message':
      return getMessage(
        client,
        args.userId as string,
        args.messageId as string,
      );

    case 'mail_send':
      await sendMail(
        client,
        args.userId as string,
        args.subject as string,
        args.body as string,
        args.toRecipients as string[],
      );
      return { success: true, message: 'Email sent successfully' };

    case 'mail_list_folders':
      return listMailFolders(client, args.userId as string);

    // ── Calendar ──
    case 'calendar_list_events':
      return listEvents(
        client,
        args.userId as string,
        args.startDateTime as string,
        args.endDateTime as string,
      );

    case 'calendar_create_event': {
      const eventInput: CreateEventInput = {
        subject: args.subject as string,
        start: {
          dateTime: args.startDateTime as string,
          timeZone: args.startTimeZone as string,
        },
        end: {
          dateTime: args.endDateTime as string,
          timeZone: args.endTimeZone as string,
        },
      };

      if (args.body) {
        eventInput.body = {
          contentType: 'HTML',
          content: args.body as string,
        };
      }
      if (args.location) {
        eventInput.location = {
          displayName: args.location as string,
        };
      }
      if (args.attendees && Array.isArray(args.attendees)) {
        eventInput.attendees = (args.attendees as string[]).map((email) => ({
          emailAddress: { address: email },
          type: 'required',
        }));
      }
      if (args.isOnlineMeeting) {
        eventInput.isOnlineMeeting = true;
        eventInput.onlineMeetingProvider = 'teamsForBusiness';
      }

      return createEvent(client, args.userId as string, eventInput);
    }

    case 'calendar_list_calendars':
      return listCalendars(client, args.userId as string);

    // ── SharePoint ──
    case 'sharepoint_list_sites':
      return listSites(client, args.search as string);

    case 'sharepoint_get_site':
      return getSite(client, args.siteId as string);

    case 'sharepoint_list_lists':
      return listLists(client, args.siteId as string);

    case 'sharepoint_get_list_items':
      return getListItems(
        client,
        args.siteId as string,
        args.listId as string,
        (args.top as number) ?? 100,
        args.filter as string | undefined,
      );

    case 'sharepoint_create_list_item':
      return createListItem(
        client,
        args.siteId as string,
        args.listId as string,
        args.fields as Record<string, unknown>,
      );

    // ── OneDrive ──
    case 'onedrive_list_items':
      return listDriveItems(
        client,
        args.userId as string,
        (args.folderId as string) ?? 'root',
      );

    case 'onedrive_get_item':
      return getDriveItem(
        client,
        args.userId as string,
        args.itemId as string,
      );

    case 'onedrive_search':
      return searchDrive(
        client,
        args.userId as string,
        args.query as string,
      );

    case 'onedrive_download':
      return downloadFile(
        client,
        args.userId as string,
        args.itemId as string,
      );

    // ── Users ──
    case 'users_list':
      return listUsers(
        client,
        (args.top as number) ?? 25,
        args.filter as string | undefined,
      );

    case 'users_get':
      return getUser(client, args.userId as string);

    case 'users_get_me':
      return getMe(client);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// =============================================================================
// Server Bootstrap
// =============================================================================

/**
 * Creates and starts the MCP server with all tools registered.
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: 'phoenix-365',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ── List Tools Handler ──
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // ── Call Tool Handler ──
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, (args ?? {}) as Record<string, unknown>);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      // Extract Graph API error details if available
      let details = '';
      if (
        error instanceof Error &&
        'statusCode' in error &&
        'body' in error
      ) {
        const graphError = error as Error & { statusCode: number; body: string };
        details = ` (HTTP ${graphError.statusCode}: ${graphError.body})`;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: errorMessage + details,
              tool: name,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // ── Start Server ──
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it does not interfere with stdio MCP transport
  console.error('Phoenix 365 MCP server started — listening on stdio');
}

main().catch((error: unknown) => {
  console.error('Fatal error starting Phoenix 365 MCP server:', error);
  process.exit(1);
});
