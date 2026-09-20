# shutter-shock

Security Testing and Vulnerability Assessment for [garvageart/viz](https://github.com/garvageart/viz).

## 1. Project Goal

This repository contains security testing artifacts, penetration test scripts, and fuzzing harnesses for [garvageart/viz](https://github.com/garvageart/viz).

The primary objectives are:

- Perform black-box and grey-box penetration testing against the viz REST API and viewfinder web interface.
- Test the security of file upload handling and image decoding routines.
- Build automated fuzzing tests for image parsing and EXIF metadata handling.
- Document identified vulnerabilities, potential severity scores, and remediation recommendations.

## 2. Scope of Testing

Testing covers two primary security areas:

### A. Penetration Testing and API Security

- **Authentication and Sessions**: Token issuance, expiration, password hashing with Argon2, and session revocation.
- **Authorization and Access Control**: Role-based access control, scope enforcement, and Broken Object Level Authorization (BOLA/IDOR).
- **Network and Headers**: CORS policy verification, Content Security Policy (CSP) headers, and transport security.
- **Input Validation**: SQL injection, Cross-Site Scripting (XSS), and command injection across all endpoints.

### B. File Upload and Parser Fuzzing

- **Upload Validation**: File extension validation, MIME-type checks, and path traversal in multipart uploads.
- **Image Processing Exploits**: Image decompression bombs (pixel bombs), SVG XML External Entity (XXE) injection, and polyglot files.
- **Metadata Handling**: EXIF injection payloads and memory safety verification in libvips CGO bindings.
- **Fuzz Testing**: Continuous fuzzing harnesses using Go native fuzzing to find crashes, memory leaks, and panics.

## 3. Technologies and Tools

| Category               | Tools and Technologies                | Purpose                                                          |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| **API & Web Testing**  | OWASP ZAP, Burp Suite Community, cURL | Intercept traffic, scan endpoints, and test authentication logic |
| **Fuzzing**            | Go Native Fuzzing (`go test -fuzz`)   | Fuzz image decode pipelines and data parsers                     |
| **Payload Generation** | ExifTool, ImageMagick, Gifsicle       | Craft malformed images, pixel bombs, and EXIF injection strings  |

## 4. Repository Structure

```
shutter-shock/
├── README.md               # Project overview and testing documentation
├── docs/                   # Penetration test reports and vulnerability writeups
├── fuzz/                   # Go fuzzing harnesses for parsers and image operations
├── payloads/               # Test images, pixel bombs, and metadata attack payloads
├── pocs/                   # Proof-of-Concept scripts demonstrating vulnerabilities
└── scripts/                # Automated test execution and helper scripts
```

## 5. How to Use This Repository

### Run Fuzz Tests

1. Navigate to the `fuzz/` directory.
2. Run target fuzz tests against local parser packages:

```bash
go test -fuzz=FuzzImageParser -fuzztime=30s
```

### Execute Proof-of-Concept Scripts

1. Start the target [garvageart/viz](https://github.com/garvageart/viz) test instance locally.
2. Execute the desired PoC script against the test server:

```bash
node pocs/test_eif_xss.js --target http://localhost:7770
```
