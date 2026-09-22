# Test Payloads and Assessment Matrices

This directory contains test matrices and baseline test data used to verify input validation, upload filtering, and data encoding.

## Structure

```
payloads/
├── uploads/             # Test matrices for MIME type and file extension validation
│   └── mime_matrix.json # Expected server responses for various file extensions
├── metadata/            # Test strings to check entity encoding in metadata readers
└── README.md
```

## Usage

1. **Upload Validation**:
   - Compare uploaded file types against `uploads/mime_matrix.json`.
   - Verify that the server strictly enforces allowed MIME types and extensions.

2. **Metadata Encoding**:
   - Verify that image metadata strings containing characters like `<`, `>`, `&`, `"`, and `'` are encoded as HTML entities when rendered in the viewfinder UI.
