# 08_PERFORMANCE_BENCHMARK_PLAN.md — Performance Benchmark & Scalability Plan

This document establishes the benchmarking methodologies, workloads, datasets, and measurement criteria for QAForge.

---

## 1. Formal Performance SLA Statement
> *No explicit performance SLA is defined in the repository.*
> However, the internal benchmarks established below provide baseline empirical thresholds for local execution.

---

## 2. Benchmark Scenarios & Workload Profiles

### Workload 1: Large Codebase Project Scanning & AST Parsing
- **Dataset**: Synthetic project containing 1,000 TypeScript source files, 250 API endpoints, and 100 Next.js App Router pages.
- **Target Subsystem**: `ProjectScanner` & `RouteScanner` (`FEATURE-001`, `FEATURE-002`).
- **Metric**: Elapsed Wall-Clock Execution Time (ms) & Peak Memory Heap Usage (MB).
- **Measurement Method**: `process.hrtime.bigint()` and `process.memoryUsage().heapUsed`.
- **Target Empirical Baseline**:
  - Scanning duration: $< 1,500\text{ ms}$
  - Peak Heap Allocation: $< 120\text{ MB}$

### Workload 2: Postman Collection Execution (100 Requests with Chained Variables)
- **Dataset**: Postman v2.1 collection file containing 100 HTTP requests, environment variable replacements, and pre-request scripts.
- **Target Subsystem**: `PostmanRunnerService` (`FEATURE-010`).
- **Metric**: Total throughput (Requests Per Second) and P95 latency overhead.
- **Target Empirical Baseline**:
  - Execution overhead per request: $< 15\text{ ms}$
  - Variable evaluation: $< 0.1\text{ ms}$ per evaluation

### Workload 3: Change Impact Graph Resolution
- **Dataset**: Dependency graph with 5,000 interconnected modules and 500 test files.
- **Target Subsystem**: `GitDiffAnalyzer` & `DependencyGraph` (`FEATURE-004`).
- **Metric**: Graph traversal latency for single-file vs multi-file commit diffs.
- **Target Empirical Baseline**:
  - Isolation time: $< 250\text{ ms}$

### Workload 4: Local High-VU Load Testing Benchmarks
- **Target Subsystem**: `LoadTesterService` (`src/application/load-tester.ts`).
- **Configuration**: 50 Virtual Users (VU) for 10 seconds against local Mock Server.
- **Metrics**: RPS (Requests Per Second), P50/P95/P99 latency, Error Rate (%).

---

## 3. Profiling & Measurement Tools
- Node.js built-in profiler: `node --prof`
- Memory leak detection: `node --expose-gc`
- Benchmarking scripts: `tests/perf/`
