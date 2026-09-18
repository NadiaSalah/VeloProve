import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export type DatabaseServiceType = 'postgres' | 'redis' | 'mongodb' | 'mysql';

export interface DockerEnvironmentConfig {
  services: DatabaseServiceType[];
  appPort?: number;
  envVars?: Record<string, string>;
  projectName?: string;
  outputPath?: string;
}

export interface GeneratedDockerConfigResult {
  composeFile: string;
  dockerfile: string;
  envFile: string;
  savedComposePath?: string;
  servicesIncluded: string[];
  instructions: string;
}

export class DockerOrchestratorService {
  /**
   * Generate isolated containerized testing environments and docker-compose files
   */
  public static generateTestEnvironment(
    guard: WorkspaceGuard,
    config: DockerEnvironmentConfig
  ): GeneratedDockerConfigResult {
    const services = config.services && config.services.length > 0 ? config.services : ['postgres', 'redis'];
    const appPort = config.appPort || 3000;
    const projectName = config.projectName || 'veloprove-test-env';

    const composeServices: string[] = [];
    const envEntries: string[] = [`NODE_ENV=test`, `PORT=${appPort}`];

    for (const s of services) {
      switch (s) {
        case 'postgres':
          composeServices.push(`  postgres:
    image: postgres:16-alpine
    container_name: ${projectName}-postgres
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: test_db
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d test_db"]
      interval: 3s
      timeout: 3s
      retries: 5`);
          envEntries.push(`DATABASE_URL=postgresql://test_user:test_password@localhost:5433/test_db`);
          break;

        case 'redis':
          composeServices.push(`  redis:
    image: redis:7-alpine
    container_name: ${projectName}-redis
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 5`);
          envEntries.push(`REDIS_URL=redis://localhost:6380`);
          break;

        case 'mongodb':
          composeServices.push(`  mongodb:
    image: mongo:7-jammy
    container_name: ${projectName}-mongodb
    ports:
      - "27018:27017"
    environment:
      MONGO_INITDB_DATABASE: test_db`);
          envEntries.push(`MONGODB_URI=mongodb://localhost:27018/test_db`);
          break;

        case 'mysql':
          composeServices.push(`  mysql:
    image: mysql:8-oracle
    container_name: ${projectName}-mysql
    environment:
      MYSQL_ROOT_PASSWORD: test_root_pw
      MYSQL_DATABASE: test_db
      MYSQL_USER: test_user
      MYSQL_PASSWORD: test_password
    ports:
      - "3307:3306"`);
          envEntries.push(`DATABASE_URL=mysql://test_user:test_password@localhost:3307/test_db`);
          break;
      }
    }

    const composeFile = `version: '3.8'

# VeloProve Autonomous Isolated Test Environment
# Generated automatically for zero-leak local & CI testing

services:
${composeServices.join('\n\n')}
`;

    const dockerfile = `# VeloProve Containerized Test Runner
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=test
CMD ["npm", "run", "test"]
`;

    const envFile = `# VeloProve Automated Test Environment Variables\n${envEntries.join('\n')}\n`;

    let savedComposePath: string | undefined;
    if (config.outputPath) {
      savedComposePath = guard.resolveSafePath(config.outputPath);
      const dir = path.dirname(savedComposePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(savedComposePath, composeFile, 'utf8');
      fs.writeFileSync(path.join(dir, '.env.test'), envFile, 'utf8');
    }

    const instructions = `Run "docker compose -f ${config.outputPath || 'docker-compose.test.yml'} up -d" to spin up isolated test dependencies, then execute tests. Run "... down -v" when done.`;

    return {
      composeFile,
      dockerfile,
      envFile,
      savedComposePath,
      servicesIncluded: services,
      instructions
    };
  }
}
