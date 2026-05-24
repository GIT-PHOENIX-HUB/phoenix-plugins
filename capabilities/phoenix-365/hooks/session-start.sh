#!/bin/bash
# Phoenix 365 — Session Start Hook
# Checks M365 connection status and reports to the user.
# Runs on every Claude Code session start when the phoenix-365 plugin is active.

# ─── Color codes for output ───
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}Phoenix 365 — M365 Connection Check${NC}"
echo "───────────────────────────────────────"

STATUS="not_configured"
DETAILS=""

# ─── Check Azure Key Vault URI ───
if [ -n "$AZURE_KEY_VAULT_URI" ]; then
    DETAILS="${DETAILS}  Azure Key Vault: ${GREEN}configured${NC} (${AZURE_KEY_VAULT_URI})\n"
else
    DETAILS="${DETAILS}  Azure Key Vault: ${YELLOW}not set${NC} (AZURE_KEY_VAULT_URI)\n"
fi

# ─── Check M365 App Registration ───
if [ -n "$M365_CLIENT_ID" ] && [ -n "$M365_TENANT_ID" ]; then
    DETAILS="${DETAILS}  App Registration: ${GREEN}configured${NC} (Client: ${M365_CLIENT_ID:0:8}...)\n"
    STATUS="credentials_available"
elif [ -n "$M365_CLIENT_ID" ]; then
    DETAILS="${DETAILS}  App Registration: ${YELLOW}partial${NC} (Client ID set, Tenant ID missing)\n"
elif [ -n "$M365_TENANT_ID" ]; then
    DETAILS="${DETAILS}  App Registration: ${YELLOW}partial${NC} (Tenant ID set, Client ID missing)\n"
else
    DETAILS="${DETAILS}  App Registration: ${RED}not configured${NC} (M365_CLIENT_ID, M365_TENANT_ID)\n"
fi

# ─── Check M365 Client Secret / Certificate ───
if [ -n "$M365_CLIENT_SECRET" ]; then
    DETAILS="${DETAILS}  Client Secret:    ${GREEN}set${NC}\n"
elif [ -n "$M365_CERTIFICATE_PATH" ]; then
    DETAILS="${DETAILS}  Certificate:      ${GREEN}set${NC} (${M365_CERTIFICATE_PATH})\n"
else
    DETAILS="${DETAILS}  Auth Credential:  ${YELLOW}not set${NC} (M365_CLIENT_SECRET or M365_CERTIFICATE_PATH)\n"
fi

# ─── Check for cached token ───
TOKEN_CACHE="$HOME/.phoenix-365/token-cache.json"
if [ -f "$TOKEN_CACHE" ]; then
    # Check if token file was modified within the last hour (3600 seconds)
    if [ "$(uname)" = "Darwin" ]; then
        FILE_AGE=$(( $(date +%s) - $(stat -f %m "$TOKEN_CACHE") ))
    else
        FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$TOKEN_CACHE") ))
    fi

    if [ "$FILE_AGE" -lt 3600 ]; then
        DETAILS="${DETAILS}  Token Cache:      ${GREEN}fresh${NC} (${FILE_AGE}s old)\n"
        STATUS="connected"
    else
        DETAILS="${DETAILS}  Token Cache:      ${YELLOW}stale${NC} ($(( FILE_AGE / 3600 ))h old — may need refresh)\n"
        if [ "$STATUS" != "not_configured" ]; then
            STATUS="credentials_available"
        fi
    fi
else
    DETAILS="${DETAILS}  Token Cache:      ${YELLOW}none${NC} (no cached token found)\n"
fi

# ─── Check Graph API environment overrides ───
if [ -n "$GRAPH_API_BASE_URL" ]; then
    DETAILS="${DETAILS}  Graph Endpoint:   ${CYAN}custom${NC} (${GRAPH_API_BASE_URL})\n"
fi

# ─── Report status ───
echo -e "$DETAILS"

case "$STATUS" in
    "connected")
        echo -e "Status: ${GREEN}CONNECTED${NC} — M365 credentials configured, token cached."
        echo "  Use /365 for the full dashboard, or ask about email, calendar, or SharePoint."
        ;;
    "credentials_available")
        echo -e "Status: ${YELLOW}CREDENTIALS AVAILABLE${NC} — M365 env vars set but no active token."
        echo "  Authentication may be needed. Use /365 to check full status."
        ;;
    "not_configured")
        echo -e "Status: ${RED}NOT CONFIGURED${NC} — M365 environment variables not found."
        echo "  Required: M365_CLIENT_ID, M365_TENANT_ID, and auth credentials."
        echo "  Optional: AZURE_KEY_VAULT_URI for vault-based credential management."
        ;;
esac

echo "───────────────────────────────────────"
echo ""
