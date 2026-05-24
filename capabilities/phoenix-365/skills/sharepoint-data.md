---
name: "sharepoint-data"
description: "Triggers when user asks to look up, check, update, or manage SharePoint data — lists, items, documents, sites"
---

# SharePoint Data Operations Skill

## Trigger Patterns

Activate this skill when the user says anything like:
- "look up in SharePoint" / "check the list" / "check the [list name]"
- "update that item" / "mark that job as complete" / "change the status"
- "add a new job" / "create an entry for [customer]"
- "how many open jobs" / "show me all jobs for [customer]"
- "find the [document] on SharePoint" / "where's the [file]"
- "what's the status of [job/project]"
- "pull the customer list" / "get me [customer]'s info"
- Any reference to job tracking, customer data, or inventory in the context of a shared system

## Instructions

### Step 1: Identify the SharePoint Operation

Map the request to the correct operation type:

| User Intent | Operation | Graph Pattern |
|---|---|---|
| Browse/find sites | List sites | `GET /sites?search=*` |
| View list contents | Get items | `GET /sites/{id}/lists/{id}/items?$expand=fields` |
| Search for specific item | Filter items | `GET ...items?$filter=fields/[field] eq '[value]'` |
| Update an item | Patch fields | `PATCH /sites/{id}/lists/{id}/items/{id}/fields` |
| Create new item | Post item | `POST /sites/{id}/lists/{id}/items` |
| Find a document | Search drives | `GET /sites/{id}/drives/{id}/root/search(q='[query]')` |
| Get item details | Get single item | `GET /sites/{id}/lists/{id}/items/{id}?$expand=fields` |

### Step 2: Resolve Site and List

SharePoint queries require a site ID and list ID. Use this resolution chain:

1. **If site name is given:** Search sites: `GET /sites?search=[name]` and match by displayName
2. **If site name is NOT given:** Use the default/primary site (likely "Phoenix Ops" or the root site)
3. **If list name is given:** Search lists: `GET /sites/{id}/lists` and match by displayName
4. **If list name is implied:** Map common phrases to likely list names:
   - "jobs" / "work orders" / "projects" -> Job Tracking list
   - "customers" / "clients" -> Customer Database list
   - "inventory" / "materials" / "stock" -> Inventory list
   - "prices" / "rates" / "pricebook" -> Price Book list
   - "employees" / "crew" / "techs" -> Employee/Crew list

### Step 3: Execute via MCP Tools

Use the phoenix-365 MCP tools to execute the SharePoint operation. Handle pagination for large lists:
- Default page size: 25 items
- If more items exist, inform the user: "Showing 25 of [total]. Want to see more or filter?"

### Step 4: Present Data Intelligently

**For job/project lists, always show:**
```
Job Tracking — [count] items ([open] open, [complete] complete)
================================================================
#   Job Name              Customer        Status      Scheduled    Amount
1   Kitchen rewire        Smith, John     In Progress Mar 20       $3,200
2   Panel upgrade         ABC Corp        Open        Mar 22       $8,500
3   Outlet install        Jones, Mary     Complete    Mar 18       $450
```

**For customer lists:**
```
Customer Database — [count] records
====================================
Name              Phone           Email                 Jobs  Last Service
Smith, John       (555) 123-4567  john@email.com        3     Mar 18
ABC Corp          (555) 987-6543  contact@abc.com       7     Mar 15
```

**For inventory/materials:**
```
Inventory — [count] items ([low] at reorder point)
===================================================
Item                  Qty    Reorder At   Supplier     Unit Cost
12/2 NM-B 250ft       15     10           Rexel        $89.99
200A Main Breaker     3      2            Titan        $245.00
```

### Step 5: Smart Summaries and Flags

After presenting data, add a business intelligence summary:

- **Open jobs by age:** Flag any job open > 30 days without a status update
- **Revenue pipeline:** Sum of open job amounts = pending revenue
- **Overdue items:** Jobs past their scheduled date that are not marked complete
- **Low inventory:** Items at or below reorder point
- **Missing data:** Items with blank required fields (no phone number, no scheduled date)

### Step 6: Offer Contextual Actions

Based on what was displayed:
- "Want to update any of these items?"
- "Should I mark job #3 as invoiced?"
- "Want to filter by a specific status or customer?"
- "Need to add a new job entry?"

### Important Rules

- NEVER modify SharePoint data without explicit user confirmation
- When updating, show the before/after values clearly
- Preserve existing field values — only change what the user specifies
- If a field name is ambiguous (multiple columns with similar names), ask for clarification
- Handle column name mismatches gracefully (internal names vs display names)
- OData filter syntax: string values need single quotes, numbers do not
- Date fields: use ISO 8601 format in filters
