# QAForge AI Agent Configuration Guide

QAForge operates as a local MCP server over `stdio`, compatible with all major AI coding agents.

---

## 1. Cursor Configuration

Add QAForge to your Cursor MCP configuration (`.cursor/mcp.json` or Cursor Settings -> MCP):

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## 2. Claude Code Configuration

Configure Claude Code using the MCP command:

```bash
claude mcp add qaforge npx qaforge mcp
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## 3. Windsurf Configuration

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## 4. Cline (VS Code Extension)

In Cline MCP Settings (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```
