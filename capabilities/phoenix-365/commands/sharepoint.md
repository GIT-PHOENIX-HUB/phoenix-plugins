---
name: "sharepoint"
description: "SharePoint operations — browse sites, read lists, manage items, upload files for Phoenix Electric"
---

# /sharepoint — SharePoint Operations

## Instructions

When the user invokes `/sharepoint`, parse the sub-command and execute the appropriate operation using Microsoft Graph API via the phoenix-365 MCP tools.

### Sub-Commands

#### `/sharepoint` (no arguments) or `/sharepoint sites`

List all SharePoint sites accessible to the authenticated user.

**Graph endpoint:** `GET /sites?search=*&$select=id,displayName,webUrl,description`

**Display format:**
```
SharePoint Sites
================
1. [Site Name] — [description]
   URL: [webUrl]

2. [Site Name] — [description]
   URL: [webUrl]
```

If a specific site is known (e.g., "Phoenix Ops" or "Phoenix Electric"), highlight it.

#### `/sharepoint lists [site-name or site-id]`

List all lists within a SharePoint site.

**Steps:**
1. If site-name given (not an ID), resolve it: `GET /sites?search=[site-name]&$select=id,displayName`
2. Get lists: `GET /sites/{site-id}/lists?$select=id,displayName,description,lastModifiedDateTime,list`
3. Filter out hidden/system lists (where `list.hidden` is true)

**Display format:**
```
Lists in [Site Name]
====================
1. [List Name] — [description]
   Last modified: [date]  |  Items: [item count if available]
   Type: [list template type — generic list, document library, etc.]
```

#### `/sharepoint items [list-name] [--site site-name]`

Show items from a specific list.

**Steps:**
1. Resolve site (use default or specified site)
2. Resolve list by name: `GET /sites/{site-id}/lists?$filter=displayName eq '[list-name]'`
3. Get items: `GET /sites/{site-id}/lists/{list-id}/items?$expand=fields&$top=25`

**Display format:**
Present as a formatted table with the list's column headers. For job tracking lists, prioritize showing:
- Job/Project Name
- Status (Open, In Progress, Complete, Invoiced)
- Customer Name
- Address/Location
- Assigned Crew/Tech
- Date fields (scheduled, completed)
- Dollar amounts (estimate, invoice total)

If the list has more than 25 items, note the total count and offer to load more or filter.

#### `/sharepoint items [list-name] --filter [field=value]`

Filter list items by field values.

**Graph endpoint:** `GET /sites/{site-id}/lists/{list-id}/items?$expand=fields&$filter=fields/[fieldName] eq '[value]'`

Common filters for an electrical company:
- `--filter status=Open` — show only open jobs
- `--filter tech=Shane` — show jobs assigned to Shane
- `--filter customer="John Smith"` — show jobs for a specific customer
- `--filter date=today` — show jobs scheduled for today

#### `/sharepoint update [list-name] [item-id] [field=value]`

Update a specific item in a list.

**Graph endpoint:** `PATCH /sites/{site-id}/lists/{list-id}/items/{item-id}/fields`

**Request body:**
```json
{
  "[fieldName]": "[newValue]"
}
```

ALWAYS confirm before updating. Show the current value and the proposed new value:
```
Update Item #[id] in [List Name]:
  [Field]: [current value] -> [new value]

Confirm? (yes/no)
```

#### `/sharepoint create [list-name] [--site site-name]`

Create a new item in a list.

**Steps:**
1. Resolve site and list
2. Get list columns: `GET /sites/{site-id}/lists/{list-id}/columns?$select=name,displayName,description,required,defaultValue`
3. Walk the user through filling in required fields, then optional fields
4. Confirm the complete item before creating
5. Create: `POST /sites/{site-id}/lists/{list-id}/items` with fields in body

#### `/sharepoint upload [site-name] [library-name] [local-file-path]`

Upload a file to a SharePoint document library.

**Graph endpoint:** `PUT /sites/{site-id}/drives/{drive-id}/root:/[folder-path]/[filename]:/content`

**Steps:**
1. Resolve site
2. Resolve document library (get drive ID): `GET /sites/{site-id}/drives?$select=id,name`
3. Read the local file
4. Upload via Graph API
5. Confirm upload with the SharePoint URL to the file

For large files (>4MB), use upload session:
1. `POST /sites/{site-id}/drives/{drive-id}/root:/[path]:/createUploadSession`
2. Upload in chunks

### Phoenix Electric Context

SharePoint is likely used for:
- **Job Tracking** — Active jobs with status, customer, location, crew assignment, dates, costs
- **Customer Database** — Customer names, addresses, contact info, job history
- **Inventory/Materials** — Stock tracking, reorder points, supplier info
- **Document Libraries** — Proposals, contracts, permits, inspection reports, job photos, invoices
- **Price Book** — Service rates, material markup, labor rates (Titan, Rexel catalogs)
- **Crew/Employee Info** — Certifications, schedules, contact info

When displaying list data, format it for quick business decisions:
- Highlight overdue jobs (scheduled date in the past, status not complete)
- Flag items missing critical fields (no customer phone, no scheduled date)
- Summarize dollar totals when showing financial data

### Error Handling

- 401: "Token expired. Re-authentication needed."
- 403: "Insufficient permissions. The app may need Sites.Read.All or Sites.ReadWrite.All consent."
- 404 on site: "Site not found. Use `/sharepoint sites` to see available sites."
- 404 on list: "List not found. Use `/sharepoint lists [site]` to see available lists."
- Empty results: "No items found. Try adjusting your filter or check the list name."
