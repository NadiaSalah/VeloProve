# Contributing to VeloProve

We welcome contributions to VeloProve!

## Development Setup

1. Clone repository:
   ```bash
   git clone https://github.com/NadiaSalah/VeloProve.git
   cd VeloProve
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and test:
   ```bash
   npm run build
   npm test
   ```

## Code Guidelines
- Strict TypeScript with no implicit `any`.
- Domain logic must remain independent of external CLI/MCP interfaces.
- Always include automated unit and integration tests for new features.
