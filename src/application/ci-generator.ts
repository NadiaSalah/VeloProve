import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export class CiGeneratorService {
  public static generateGitHubWorkflow(guard: WorkspaceGuard): string {
    const workflowDir = path.join(guard.getRoot(), '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }

    const workflowContent = `name: VeloProve Autonomous Quality Gate

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master ]

jobs:
  veloprove-verification:
    name: Run VeloProve Validation & Release Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci || npm install

      - name: Initialize & Inspect VeloProve
        run: npx veloprove inspect

      - name: Run Test Suites
        run: npx veloprove test

      - name: Evaluate Release Confidence
        run: npx veloprove release --ci
`;

    const targetFile = path.join(workflowDir, 'veloprove-ci.yml');
    fs.writeFileSync(targetFile, workflowContent, 'utf8');

    return targetFile;
  }
}
