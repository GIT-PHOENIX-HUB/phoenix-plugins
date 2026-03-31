---
description: "Customer lookup and management — search, view details, create new customers"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Customer Operations

Search, view, or create customers in Service Fusion.

## Instructions

Ask the user what they need:
- **Search:** Use `servicefusion_search_customers` with the user's query (name)
- **View details:** Use `servicefusion_get_customer` with customer ID
- **Equipment:** Use `servicefusion_get_customer_equipment` for their equipment list
- **Create new:** Use `servicefusion_create_customer` — gather customer_name, email, phone, and address fields. Confirm before creating (write operation).
- **Job history:** Use `servicefusion_list_jobs` with `filters[customer_id]`
- **Estimates:** Use `servicefusion_list_estimates` with `filters[customer_id]`
- **Invoices:** Use `servicefusion_list_invoices` with `filters[customer_id]`

## Limitations

The following are NOT available via the SF v1 API:
- **Service locations** — embedded in customer records, not a separate endpoint
- **Memberships** — check SF web UI
- **Bookings** — check SF web UI

Present customer info in a readable format with address, contacts, and recent job/estimate summary.
