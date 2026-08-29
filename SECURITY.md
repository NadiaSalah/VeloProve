# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within QAForge, please report it privately via **GitHub Private Vulnerability Reporting** (under the repository's Security tab) instead of opening a public issue.

## Local-First Security & Privacy Principles

QAForge is designed with local-first security:
- **No Forced Telemetry or Code Upload**: Core test execution runs entirely on the local machine. Source code, credentials, and test results are not transmitted to external cloud servers unless you explicitly configure a remote URL, companion bridge, or alert webhook.
- **Workspace Containment**: `WorkspaceGuard` prevents directory traversal outside the configured project root.
- **Safe Command Invocation**: Commands execute with explicit argument vectors rather than unescaped shell strings.
- **Secret Redaction**: Automatic masking of sensitive tokens, passwords, bearer authorization headers, and database connection strings in logs and MCP output.
