import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface ArchGraphNode {
  id: string;
  label: string;
  type: 'FRONTEND_UI' | 'BACKEND_API' | 'DATABASE' | 'CACHE_QUEUE' | 'EXTERNAL_SERVICE' | 'AUTHENTICATION';
  technology?: string;
  sourceFiles: string[];
}

export interface ArchGraphEdge {
  from: string;
  to: string;
  protocol: 'HTTP_REST' | 'GRAPHQL' | 'WEBSOCKET' | 'SQL_ORM' | 'IPC' | 'SDK_CLIENT';
  label?: string;
}

export interface ArchitectureGraphReport {
  timestamp: string;
  nodesCount: number;
  edgesCount: number;
  nodes: ArchGraphNode[];
  edges: ArchGraphEdge[];
  mermaidDiagram: string;
  summary: {
    frontendFrameworks: string[];
    backendFrameworks: string[];
    databases: string[];
    externalIntegrations: string[];
  };
}

export class ArchitectureGraphService {
  public static generateGraph(guard: WorkspaceGuard): ArchitectureGraphReport {
    const root = guard.getRoot();
    const nodes: ArchGraphNode[] = [];
    const edges: ArchGraphEdge[] = [];

    const detectedNodesMap = new Map<string, ArchGraphNode>();
    const edgeSet = new Set<string>();

    const addNode = (node: ArchGraphNode) => {
      if (detectedNodesMap.has(node.id)) {
        const existing = detectedNodesMap.get(node.id)!;
        existing.sourceFiles = Array.from(new Set([...existing.sourceFiles, ...node.sourceFiles]));
      } else {
        detectedNodesMap.set(node.id, node);
      }
    };

    const addEdge = (edge: ArchGraphEdge) => {
      const key = `${edge.from}->${edge.to}:${edge.protocol}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(edge);
      }
    };

    // 1. Core Frontends
    addNode({ id: 'app_ui', label: 'User Interface / Client', type: 'FRONTEND_UI', technology: 'Web / Desktop', sourceFiles: [] });

    // 2. Scan project dependencies & source files
    let pkgJson: any = {};
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      } catch {
        // ignore
      }
    }

    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {})
    };

    const externalServicesDetected: string[] = [];
    const databasesDetected: string[] = [];
    const frontendsDetected: string[] = [];
    const backendsDetected: string[] = [];

    // Check DBs
    if (allDeps['pg'] || allDeps['postgres'] || allDeps['typeorm'] || allDeps['@prisma/client'] || allDeps['drizzle-orm']) {
      databasesDetected.push('PostgreSQL / Relational DB');
      addNode({ id: 'db_postgres', label: 'PostgreSQL Database', type: 'DATABASE', technology: 'Postgres / SQL', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'db_postgres', protocol: 'SQL_ORM', label: 'Queries & Mutations' });
    }
    if (allDeps['mongoose'] || allDeps['mongodb']) {
      databasesDetected.push('MongoDB');
      addNode({ id: 'db_mongo', label: 'MongoDB Database', type: 'DATABASE', technology: 'Document DB', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'db_mongo', protocol: 'SQL_ORM', label: 'Mongoose ODM' });
    }
    if (allDeps['redis'] || allDeps['ioredis']) {
      databasesDetected.push('Redis Cache');
      addNode({ id: 'cache_redis', label: 'Redis Cache & Queue', type: 'CACHE_QUEUE', technology: 'In-Memory Key-Value', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'cache_redis', protocol: 'SDK_CLIENT', label: 'Session / Cache' });
    }

    // Check External Services
    if (allDeps['stripe'] || allDeps['@stripe/stripe-js']) {
      externalServicesDetected.push('Stripe Payments');
      addNode({ id: 'ext_stripe', label: 'Stripe Payments API', type: 'EXTERNAL_SERVICE', technology: 'Payment Gateway', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'ext_stripe', protocol: 'HTTP_REST', label: 'Webhooks & Charges' });
    }
    if (allDeps['openai'] || allDeps['@anthropic-ai/sdk'] || allDeps['langchain']) {
      externalServicesDetected.push('AI / LLM Provider');
      addNode({ id: 'ext_ai', label: 'AI LLM API (OpenAI / Anthropic)', type: 'EXTERNAL_SERVICE', technology: 'Generative AI', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'ext_ai', protocol: 'HTTP_REST', label: 'Completions' });
    }
    if (allDeps['aws-sdk'] || allDeps['@aws-sdk/client-s3']) {
      externalServicesDetected.push('AWS S3 Storage');
      addNode({ id: 'ext_s3', label: 'AWS S3 Cloud Storage', type: 'EXTERNAL_SERVICE', technology: 'Object Store', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'ext_s3', protocol: 'SDK_CLIENT', label: 'Asset Uploads' });
    }

    // Backend server
    addNode({ id: 'api_server', label: 'Backend API Gateway & Services', type: 'BACKEND_API', technology: 'Node.js / REST', sourceFiles: [] });
    addEdge({ from: 'app_ui', to: 'api_server', protocol: 'HTTP_REST', label: 'REST API / IPC' });

    // Fallback DB if none detected
    if (databasesDetected.length === 0) {
      addNode({ id: 'db_local', label: 'Local SQLite / Storage', type: 'DATABASE', technology: 'Local File DB', sourceFiles: [] });
      addEdge({ from: 'api_server', to: 'db_local', protocol: 'SQL_ORM', label: 'Local Store' });
      databasesDetected.push('Local Store / SQLite');
    }

    const allNodesList = Array.from(detectedNodesMap.values());

    // Generate Mermaid Diagram
    let mermaid = 'graph TD\n';
    mermaid += '  subgraph ClientTier [Frontend & UI Layer]\n';
    mermaid += '    app_ui["🖥️ Web & Desktop UI"]\n';
    mermaid += '  end\n\n';

    mermaid += '  subgraph AppTier [Application & Microservices Layer]\n';
    mermaid += '    api_server["⚙️ API Gateway & Backend Services"]\n';
    mermaid += '  end\n\n';

    mermaid += '  subgraph DataTier [Storage & Caching Layer]\n';
    for (const n of allNodesList.filter(x => x.type === 'DATABASE' || x.type === 'CACHE_QUEUE')) {
      mermaid += `    ${n.id}["🗄️ ${n.label}"]\n`;
    }
    mermaid += '  end\n\n';

    if (allNodesList.some(x => x.type === 'EXTERNAL_SERVICE')) {
      mermaid += '  subgraph ExtTier [External Cloud & Third-Party APIs]\n';
      for (const n of allNodesList.filter(x => x.type === 'EXTERNAL_SERVICE')) {
        mermaid += `    ${n.id}["🌐 ${n.label}"]\n`;
      }
      mermaid += '  end\n\n';
    }

    for (const e of edges) {
      mermaid += `  ${e.from} -->|${e.label || e.protocol}| ${e.to}\n`;
    }

    return {
      timestamp: new Date().toISOString(),
      nodesCount: allNodesList.length,
      edgesCount: edges.length,
      nodes: allNodesList,
      edges,
      mermaidDiagram: mermaid,
      summary: {
        frontendFrameworks: frontendsDetected.length > 0 ? frontendsDetected : ['React / Modern Web'],
        backendFrameworks: backendsDetected.length > 0 ? backendsDetected : ['Node.js Express / Native HTTP'],
        databases: databasesDetected,
        externalIntegrations: externalServicesDetected
      }
    };
  }
}
