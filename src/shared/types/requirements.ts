export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export type RequirementSourceType = 
  | 'prd' 
  | 'readme' 
  | 'openapi' 
  | 'route' 
  | 'schema' 
  | 'code_comment' 
  | 'doc'
  | 'inferred';

export interface DiscoveredRequirement {
  id: string;
  title: string;
  description: string;
  source: RequirementSourceType;
  sourceLocation: {
    file: string;
    line?: number;
  };
  priority: RequirementPriority;
  confidence: number; // 0.0 - 1.0
  category?: 'functional' | 'security' | 'auth' | 'error_handling' | 'validation' | 'edge_case';
  relatedModules: string[];
  relatedRoutes: string[];
  relatedEndpoints: string[];
  acceptanceCriteria?: string[];
  testCoverageStatus: 'uncovered' | 'partial' | 'covered';
  assignedTestIds?: string[];
}

export interface FeatureUseCases {
  featureId: string;
  title: string;
  description: string;
  sourceFile?: string;
  useCases: Array<{
    id: string;
    title: string;
    description: string;
    requirementId?: string;
    expectedBehavior: string;
    flowSteps?: string[];
  }>;
}

export interface FeatureMap {
  features: FeatureUseCases[];
  unmappedRequirements: DiscoveredRequirement[];
  generatedAt: string;
}
