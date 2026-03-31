/**
 * OpenAI Function Definitions
 * These schemas define the tools available to ChatGPT via function calling
 */

const functionDefinitions = [
    // ==================== SERVICETITAN - JOBS ====================
    {
        name: 'getDailyJobSummary',
        description: 'Get a summary of jobs for a specific date including scheduled jobs, completed jobs, invoices, and revenue',
        parameters: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'The date to get the summary for in YYYY-MM-DD format. Defaults to today if not specified.'
                }
            },
            required: []
        }
    },
    {
        name: 'getScheduledJobs',
        description: 'Get all jobs scheduled for a specific date',
        parameters: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'The date to get scheduled jobs for in YYYY-MM-DD format'
                }
            },
            required: ['date']
        }
    },
    {
        name: 'getJobDetails',
        description: 'Get detailed information about a specific job by its ID',
        parameters: {
            type: 'object',
            properties: {
                jobId: {
                    type: 'string',
                    description: 'The ServiceTitan job ID'
                }
            },
            required: ['jobId']
        }
    },
    {
        name: 'getCompletedJobs',
        description: 'Get all jobs completed within a date range',
        parameters: {
            type: 'object',
            properties: {
                startDate: {
                    type: 'string',
                    description: 'Start date in YYYY-MM-DD format'
                },
                endDate: {
                    type: 'string',
                    description: 'End date in YYYY-MM-DD format'
                }
            },
            required: ['startDate', 'endDate']
        }
    },
    {
        name: 'addJobNote',
        description: 'Add a note to a specific job. Requires confirmation before executing.',
        parameters: {
            type: 'object',
            properties: {
                jobId: {
                    type: 'string',
                    description: 'The ServiceTitan job ID'
                },
                noteText: {
                    type: 'string',
                    description: 'The text of the note to add'
                }
            },
            required: ['jobId', 'noteText']
        }
    },
    {
        name: 'updateJobStatus',
        description: 'Update the status of a job. Requires confirmation before executing.',
        parameters: {
            type: 'object',
            properties: {
                jobId: {
                    type: 'string',
                    description: 'The ServiceTitan job ID'
                },
                status: {
                    type: 'string',
                    description: 'The new status for the job',
                    enum: ['Scheduled', 'Dispatched', 'Working', 'Hold', 'Completed', 'Canceled']
                }
            },
            required: ['jobId', 'status']
        }
    },

    // ==================== SERVICETITAN - CUSTOMERS ====================
    {
        name: 'searchCustomers',
        description: 'Search for customers by name or phone number',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query (customer name or phone)'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'getCustomerDetails',
        description: 'Get detailed information about a specific customer',
        parameters: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: 'The ServiceTitan customer ID'
                }
            },
            required: ['customerId']
        }
    },

    // ==================== SERVICETITAN - TECHNICIANS ====================
    {
        name: 'getTechnicians',
        description: 'Get a list of all active technicians',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'getTechnicianSchedule',
        description: 'Get the schedule/appointments for a specific technician on a given date',
        parameters: {
            type: 'object',
            properties: {
                technicianId: {
                    type: 'string',
                    description: 'The technician ID'
                },
                date: {
                    type: 'string',
                    description: 'The date in YYYY-MM-DD format'
                }
            },
            required: ['technicianId', 'date']
        }
    },

    // ==================== SERVICETITAN - FINANCIAL ====================
    {
        name: 'getInvoices',
        description: 'Get invoices created within a date range',
        parameters: {
            type: 'object',
            properties: {
                startDate: {
                    type: 'string',
                    description: 'Start date in YYYY-MM-DD format'
                },
                endDate: {
                    type: 'string',
                    description: 'End date in YYYY-MM-DD format'
                }
            },
            required: ['startDate', 'endDate']
        }
    },
    {
        name: 'getOpenEstimates',
        description: 'Get all open/pending estimates',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'getTodayTimesheets',
        description: 'Get all timesheet entries for today',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },

    // ==================== EMAIL OPERATIONS ====================
    {
        name: 'getUnreadEmails',
        description: 'Get a summary of unread emails in the inbox',
        parameters: {
            type: 'object',
            properties: {
                count: {
                    type: 'number',
                    description: 'Maximum number of emails to retrieve (default 20)'
                }
            },
            required: []
        }
    },
    {
        name: 'getEmailSummary',
        description: 'Get a structured summary of unread emails for triage purposes',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'getRecentEmails',
        description: 'Get emails received in the last N hours',
        parameters: {
            type: 'object',
            properties: {
                hours: {
                    type: 'number',
                    description: 'Number of hours to look back (default 24)'
                }
            },
            required: []
        }
    },
    {
        name: 'moveEmail',
        description: 'Move an email to a specific folder. Requires confirmation.',
        parameters: {
            type: 'object',
            properties: {
                messageId: {
                    type: 'string',
                    description: 'The email message ID'
                },
                folderName: {
                    type: 'string',
                    description: 'The name of the destination folder'
                }
            },
            required: ['messageId', 'folderName']
        }
    },
    {
        name: 'createDraftReply',
        description: 'Create a draft reply to an email',
        parameters: {
            type: 'object',
            properties: {
                messageId: {
                    type: 'string',
                    description: 'The email message ID to reply to'
                },
                replyContent: {
                    type: 'string',
                    description: 'The HTML content of the reply'
                }
            },
            required: ['messageId', 'replyContent']
        }
    },
    {
        name: 'sendEmail',
        description: 'Send an email. Requires confirmation for external recipients.',
        parameters: {
            type: 'object',
            properties: {
                to: {
                    type: 'string',
                    description: 'Recipient email address(es), comma-separated if multiple'
                },
                subject: {
                    type: 'string',
                    description: 'Email subject'
                },
                body: {
                    type: 'string',
                    description: 'Email body content (HTML supported)'
                }
            },
            required: ['to', 'subject', 'body']
        }
    },

    // ==================== CALENDAR OPERATIONS ====================
    {
        name: 'getTodayEvents',
        description: 'Get all calendar events for today',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'getCalendarEvents',
        description: 'Get calendar events for a specific date range',
        parameters: {
            type: 'object',
            properties: {
                startDate: {
                    type: 'string',
                    description: 'Start date/time in ISO format'
                },
                endDate: {
                    type: 'string',
                    description: 'End date/time in ISO format'
                }
            },
            required: ['startDate', 'endDate']
        }
    },
    {
        name: 'createCalendarEvent',
        description: 'Create a new calendar event. Requires confirmation.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Event title/subject'
                },
                startDateTime: {
                    type: 'string',
                    description: 'Start date/time in ISO format'
                },
                endDateTime: {
                    type: 'string',
                    description: 'End date/time in ISO format'
                },
                location: {
                    type: 'string',
                    description: 'Event location (optional)'
                },
                attendees: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of attendee email addresses (optional)'
                },
                description: {
                    type: 'string',
                    description: 'Event description/notes (optional)'
                }
            },
            required: ['title', 'startDateTime', 'endDateTime']
        }
    },

    // ==================== TEAMS OPERATIONS ====================
    {
        name: 'postToTeams',
        description: 'Post a message to the configured Teams channel',
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'The message to post (supports Markdown)'
                },
                title: {
                    type: 'string',
                    description: 'Optional title for the message card'
                }
            },
            required: ['message']
        }
    },

    // ==================== FILE OPERATIONS ====================
    {
        name: 'saveEmailAttachments',
        description: 'Save attachments from an email to OneDrive/SharePoint',
        parameters: {
            type: 'object',
            properties: {
                messageId: {
                    type: 'string',
                    description: 'The email message ID'
                },
                targetFolder: {
                    type: 'string',
                    description: 'The destination folder path'
                }
            },
            required: ['messageId', 'targetFolder']
        }
    },
    {
        name: 'listFiles',
        description: 'List files in a OneDrive/SharePoint folder',
        parameters: {
            type: 'object',
            properties: {
                folderPath: {
                    type: 'string',
                    description: 'The folder path to list'
                }
            },
            required: ['folderPath']
        }
    },

    // ==================== TASK OPERATIONS ====================
    {
        name: 'createTask',
        description: 'Create a new To-Do task',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Task title'
                },
                dueDate: {
                    type: 'string',
                    description: 'Due date in ISO format (optional)'
                },
                notes: {
                    type: 'string',
                    description: 'Task notes/description (optional)'
                }
            },
            required: ['title']
        }
    }
];

// Functions that require user confirmation before execution
const writeOperations = [
    'addJobNote',
    'updateJobStatus',
    'moveEmail',
    'sendEmail',
    'createCalendarEvent',
    'saveEmailAttachments',
    'createTask'
];

// Convert to OpenAI tools format
const tools = functionDefinitions.map(fn => ({
    type: 'function',
    function: fn
}));

module.exports = { 
    functionDefinitions, 
    tools,
    writeOperations,
    isWriteOperation: (fnName) => writeOperations.includes(fnName)
};
