# 🚀 QAForge Future Roadmap & Next-Gen TODOs

This document tracks planned features, architectural innovations, and upcoming improvements for future QAForge releases (**v1.1.0**, **v1.2.0**, and **v2.0.0+**).

---

## 📌 Milestone: QAForge v1.1.0 — Smart Insights & Interactive Experience

### 1. 📊 QA Trends, Historical Metrics & Quality Analytics
- [ ] **Historical Execution Persistence**: Automatically store structured test results and health metrics in `.qaforge/state/history.json` over time.
- [ ] **Dashboard Trend Visualizer**: Add interactive charts (Recharts / Chart.js) in the Dashboard UI displaying pass rates, execution times, flakiness variance, and code coverage over time.
- [ ] **Regression Velocity Alerts**: Highlight regressions that occurred across Git branches or recent pull requests.

### 2. 🎬 Visual Scenario Recorder Extension / Bookmarklet
- [ ] **Browser Event Interceptor**: Create a lightweight browser snippet / bookmarklet or Chrome extension that listens to user interactions (clicks, inputs, navigations).
- [ ] **Direct Playwright Spec Generator**: Synthesize recorded browser actions into robust Playwright test files directly from the Live Dashboard UI with one click.
- [ ] **Accessibility-First Selector Synthesizer**: Auto-map recorded DOM elements to ARIA roles (`getByRole`, `getByLabelText`) during recording.

### 3. 📄 Enterprise Reporting Standards (JUnit XML / Allure / PDF)
- [ ] **JUnit XML Exporter**: Generate standard `junit.xml` test reports compatible with Jenkins, GitLab CI, CircleCI, and Azure DevOps.
- [ ] **Allure Report Integration**: Support Allure lifecycle data generation for visual enterprise test dashboards.
- [ ] **Printable PDF QA Executive Summary**: Add a button in the Dashboard and CLI (`qaforge export-report -f pdf`) for clean PDF generation.

### 4. 📬 Advanced API Studio & Environment Management
- [ ] **Multi-Environment Variables**: Support environment switcher in the Dashboard (Local, Staging, Production) with secure secret masking.
- [ ] **API Response Mocking from Schema**: One-click generate realistic mock responses directly from OpenAPI / Swagger definitions.
- [ ] **Chained Request Flows & Assertions**: Allow building multi-step API workflows where response tokens from step 1 automatically feed into headers for step 2.

---

## 📌 Milestone: QAForge v1.2.0 — Multi-Model AI Benchmarks & Distributed Testing

### 1. 🤖 Multi-LLM Benchmark & Comparative QA Evaluator
- [ ] **LLM Evaluation Matrix**: Run side-by-side test generation and failure diagnosis comparisons across different models (Local Ollama, OpenAI GPT, Claude, Gemini).
- [ ] **Token & Cost Efficiency Tracker**: Measure prompt latency, token consumption, and generation accuracy per AI model.
- [ ] **Local Offline LLM Provider**: Native integration with local Ollama models for 100% offline air-gapped test synthesis.

### 2. ⚡ Distributed Load & Stress Testing Script Exporter
- [ ] **k6 Script Compiler**: Automatically compile discovered routes and `qaforge load-test` scenarios into standard k6 JavaScript scripts.
- [ ] **Artillery / Locust Export**: Export API stress test scenarios to YAML/Python configurations for distributed cloud load testing.
- [ ] **SLO & Latency Gate Enforcement**: Fail CI pipelines if p95 latency exceeds user-defined service-level objectives (SLOs).

### 3. 🛡️ Advanced Dynamic Security & DAST Probing
- [ ] **Interactive CSRF & XSS Probe Generator**: Generate automated headless browser tests probing input forms for stored and reflected XSS.
- [ ] **JWT & Session Tampering Auditor**: Test backend route security against expired tokens, algorithm confusion (`none` alg), and permission elevation.
- [ ] **Subresource Integrity (SRI) Validator**: Check third-party CDNs and script tags for missing integrity hashes.

---

## 📌 Milestone: QAForge v2.0.0 — Autonomous Self-Operating QA Platform

### 1. 🔄 Continuous Background Autonomous Healing Daemon
- [ ] **Zero-Intervention Watcher**: Run background daemon that automatically patches brittle locators upon detecting application DOM updates.
- [ ] **AI Pull Request Bot**: Generate ready-to-merge GitHub pull requests with healed tests and bug fix patches.
- [ ] **Git Hook Pre-Commit Integration**: Instant micro-evaluations on `git commit` to block commits with broken tests or security flaws.

### 2. 🌐 Multi-Language Engine Support (Beyond JS/TS)
- [ ] **Python Ecosystem**: Native test generation and execution for `pytest` and `unittest` (FastAPI, Django, Flask).
- [ ] **Java & Go Ecosystems**: Native adapters for JUnit 5 (Spring Boot) and `go test` (Gin, Fiber).
- [ ] **Universal AST Parser Engine**: Tree-sitter powered multilingual route and requirement extraction.

### 3. 🧩 Plugin & Custom Adapter SDK
- [ ] **Custom Adapter SDK**: Allow developers to write custom adapters for proprietary in-house test runners and private cloud infrastructures.
- [ ] **Community Plugin Marketplace**: Modular plugin architecture for custom security checkers, linter rules, and export formats.

---

*Last Updated: August 2026 — Maintained by NadiaSalah & the QAForge Community.*
