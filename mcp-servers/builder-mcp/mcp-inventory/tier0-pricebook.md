# Tier 0: Excel/PDF MCP Servers - Pricebook Ready

**Generated:** 2025-12-21
**Purpose:** Immediate integration for pricebook project

---

## Quick Reference

| Repo | Lang | Entry Point | Install |
|------|------|-------------|---------|
| excel-mcp-server | Python | `excel-mcp-server` CLI | `uv pip install -e .` |
| excel-mcp-alt | Go+Node | `npx @negokaz/excel-mcp-server` | `npm install` |
| mcp_pdf_forms | Python | `mcp-pdf-forms` CLI | `uv pip install -e .` |
| pdfco-mcp | Python | `uvx pdfco-mcp` | `uv pip install -e .` |
| document-edit-mcp | Python | `python run.py` | `./setup.sh` |
| excel-to-pdf-mcp | Node.js | `npx excel-to-pdf-mcp` | `npm install` |

---

## 1. excel-mcp-server (haris-musa)
**Location:** `tools/documents/excel-mcp-server`
**Language:** Python 3.10+
**Entry Point:** `excel-mcp-server` (CLI after install)

### Dependencies
```
mcp[cli]>=1.10.1
fastmcp>=2.0.0
openpyxl>=3.1.5
typer>=0.16.0
```

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/excel-mcp-server
uv pip install -e .
```

### Claude Code Config
```bash
claude mcp add excel-server -- excel-mcp-server
```

### Tools Exposed (30+)
**Workbook:**
- `create_workbook` - Create new Excel file
- `create_worksheet` - Add sheet to workbook
- `get_workbook_metadata` - Get sheets and ranges info

**Data:**
- `write_data_to_excel` - Write data to cells
- `read_data_from_excel` - Read cell data with preview

**Formatting:**
- `format_range` - Apply styles (bold, colors, borders, etc.)
- `merge_cells` / `unmerge_cells` - Merge operations
- `get_merged_cells` - List merged ranges

**Formulas:**
- `apply_formula` - Apply Excel formulas
- `validate_formula_syntax` - Check formula validity

**Charts & Tables:**
- `create_chart` - Line, bar, pie, scatter, area
- `create_pivot_table` - With aggregation functions
- `create_table` - Native Excel tables

**Structure:**
- `copy_worksheet` / `delete_worksheet` / `rename_worksheet`
- `copy_range` / `delete_range`
- `insert_rows` / `insert_columns`
- `delete_sheet_rows` / `delete_sheet_columns`

**Validation:**
- `validate_excel_range` - Check range validity
- `get_data_validation_info` - Get validation rules

---

## 2. excel-mcp-alt (negokaz)
**Location:** `tools/documents/excel-mcp-alt`
**Language:** Go + Node.js
**Entry Point:** `dist/launcher.js` / `npx @negokaz/excel-mcp-server`

### Dependencies
- Node.js 20.x+
- Go 1.23.0+ (for build)

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/excel-mcp-alt
npm install
npm run build
```

### Claude Code Config
```json
{
  "mcpServers": {
    "excel": {
      "command": "npx",
      "args": ["@negokaz/excel-mcp-server"],
      "env": { "EXCEL_MCP_PAGING_CELLS_LIMIT": "4000" }
    }
  }
}
```

### Tools Exposed (7)
- `excel_describe_sheets` - List all sheets
- `excel_read_sheet` - Read with pagination
- `excel_write_to_sheet` - Write values/formulas
- `excel_create_table` - Create Excel tables
- `excel_copy_sheet` - Copy sheets
- `excel_format_range` - Apply cell styles
- `excel_screen_capture` - **Windows only** - screenshot

### Special Features
- Live editing on Windows (OLE automation)
- Pagination for large datasets (4000 cells default)
- Supports xlsx, xlsm, xltx, xltm

---

## 3. mcp_pdf_forms (Wildebeest)
**Location:** `tools/documents/mcp_pdf_forms`
**Language:** Python 3.11+
**Entry Point:** `mcp-pdf-forms` CLI

### Dependencies
```
mcp[cli]>=1.3.0
pymupdf>=1.25.3
pillow>=11.1.0
```

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/mcp_pdf_forms
uv pip install -e .
```

### Claude Code Config
```bash
claude mcp add pdf-forms mcp-pdf-forms .
```

### Tools Exposed (3)
- **PDF Discovery** - Find PDFs in directories
- **Form Field Extraction** - Get field info (name, type, position)
- **Field Highlight Visualization** - Highlight form fields visually

### Use Case
Best for: Analyzing existing PDF forms, finding fillable fields

---

## 4. pdfco-mcp (PDF.co)
**Location:** `tools/documents/pdfco-mcp`
**Language:** Python 3.10+
**Entry Point:** `pdfco-mcp` (via uvx)

### Dependencies
```
fastmcp>=2.6.1
httpx>=0.28.1
mcp[cli]>=1.6.0
```

### Environment Required
```
X_API_KEY=<your-pdf.co-api-key>
```

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/pdfco-mcp
uv pip install -e .
```

### Claude Code Config
```json
{
  "mcpServers": {
    "pdfco": {
      "command": "uvx",
      "args": ["pdfco-mcp"],
      "env": { "X_API_KEY": "YOUR_KEY" }
    }
  }
}
```

### Tools Exposed (30+)
**PDF Conversion:**
- `pdf_to_json`, `pdf_to_csv`, `pdf_to_text`
- `pdf_to_xls`, `pdf_to_xlsx`, `pdf_to_xml`, `pdf_to_html`
- `pdf_to_image` (JPG/PNG/WebP/TIFF)

**To PDF:**
- `document_to_pdf` (DOC/DOCX/RTF/TXT/XLS/XLSX/CSV/HTML/images)
- `csv_to_pdf`, `image_to_pdf`, `webpage_to_pdf`, `html_to_pdf`, `email_to_pdf`

**Excel Conversion:**
- `excel_to_csv`, `excel_to_json`, `excel_to_html`
- `excel_to_txt`, `excel_to_xml`, `excel_to_pdf`

**PDF Editing:**
- `pdf_add_annotations_images_fields` - Add text/images/forms
- `pdf_merge` - Combine PDFs
- `pdf_split` - Split by pages

**PDF Forms:**
- `read_pdf_forms_info` - Get field info
- `fill_pdf_forms` - Fill form fields
- `create_fillable_forms` - Add new form elements

**Search & Analysis:**
- `find_text` - Search with regex
- `find_table` - Detect table coordinates
- `ai_invoice_parser` - AI invoice extraction
- `pdf_info_reader` - Metadata, pages, security

**Security:**
- `pdf_add_password`, `pdf_remove_password`
- `pdf_make_searchable` (OCR), `pdf_make_unsearchable`

**File Management:**
- `upload_file`, `get_job_check`, `wait_job_completion`

---

## 5. document-edit-mcp (alejandroBallesterosC)
**Location:** `tools/documents/document-edit-mcp`
**Language:** Python 3.10+
**Entry Point:** `python run.py` or `./setup.sh`

### Dependencies
```
mcp[cli]>=1.5.0
python-docx>=0.8.11
pandas>=2.0.0
openpyxl>=3.1.0
reportlab>=3.6.0
pdf2docx>=0.5.6
docx2pdf>=0.1.8
```

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/document-edit-mcp
./setup.sh
```

### Tools Exposed (9)
**Word:**
- `create_word_document` - Create from text
- `edit_word_document` - Add/edit/delete paragraphs
- `convert_txt_to_word` - TXT to DOCX

**Excel:**
- `create_excel_file` - Create from JSON/CSV
- `edit_excel_file` - Update cells, add/delete rows/cols/sheets
- `convert_csv_to_excel` - CSV to XLSX

**PDF:**
- `create_pdf_file` - Create from text
- `convert_word_to_pdf` - DOCX to PDF

---

## 6. excel-to-pdf-mcp (kmexnx)
**Location:** `tools/documents/excel-to-pdf-mcp`
**Language:** Node.js 16+
**Entry Point:** `dist/index.js` / `npx excel-to-pdf-mcp`

### Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.8.0",
  "libreoffice-convert": "^1.4.1",
  "xlsx": "^0.18.5",
  "zod": "^3.22.4"
}
```

### System Requirement
**LibreOffice must be installed:**
```bash
# macOS
brew install libreoffice

# Ubuntu
apt-get install libreoffice
```

### Install
```bash
cd ~/GitHub/MCP_VAULT/tools/documents/excel-to-pdf-mcp
npm install
npm run build
```

### Claude Code Config
```json
{
  "mcpServers": {
    "excel-to-pdf-mcp": {
      "command": "npx",
      "args": ["excel-to-pdf-mcp"]
    }
  }
}
```

### Tools Exposed (2)
- `convert_excel_to_pdf` - XLS/XLSX to PDF
- `convert_numbers_to_pdf` - Apple Numbers to PDF

---

## Recommended for Pricebook

### Primary Choice: `excel-mcp-server` (haris-musa)
**Why:** Most comprehensive Excel tool set (30+ operations), pure Python, works with openpyxl which is production-stable.

### For PDF Generation: `pdfco-mcp`
**Why:** Cloud API with full-featured PDF operations including Excel-to-PDF conversion. Requires API key but handles everything.

### Alternative if offline needed: `document-edit-mcp`
**Why:** Local PDF creation, Word/Excel editing, no external API required.

---

## Quick Start Commands

```bash
# Install the primary Excel server
cd ~/GitHub/MCP_VAULT/tools/documents/excel-mcp-server
uv venv
source .venv/bin/activate
uv pip install -e .

# Add to Claude Code
claude mcp add excel -- excel-mcp-server

# Test it works
excel-mcp-server --help
```
