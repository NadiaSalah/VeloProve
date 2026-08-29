import type { DiscoveredRequirement } from '../../shared/types/requirements.js';
import type { RouteDefinition, ApiEndpoint, SourceModule } from '../../shared/types/project.js';

export class RiskScorer {
  public static calculateRequirementRisk(req: DiscoveredRequirement): number {
    let score = 30; // base score

    if (req.priority === 'critical') score += 40;
    else if (req.priority === 'high') score += 25;
    else if (req.priority === 'medium') score += 10;

    if (req.category === 'security' || req.category === 'auth') score += 20;
    if (req.category === 'error_handling' || req.category === 'edge_case') score += 15;

    if (req.testCoverageStatus === 'uncovered') score += 20;
    else if (req.testCoverageStatus === 'partial') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  public static calculateRouteRisk(route: RouteDefinition): number {
    let score = 25;
    if (route.path === '/' || route.path.includes('checkout') || route.path.includes('payment') || route.path.includes('login')) {
      score += 45;
    }
    if (route.authRequired) score += 20;
    if (route.isDynamic) score += 10;
    return Math.min(100, Math.max(0, score));
  }

  public static calculateEndpointRisk(ep: ApiEndpoint): number {
    let score = 30;
    if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'DELETE') {
      score += 25; // Data mutation
    }
    if (ep.authRequired || ep.path.includes('auth') || ep.path.includes('token') || ep.path.includes('secret')) {
      score += 35;
    }
    return Math.min(100, Math.max(0, score));
  }
}
