import type { DiscoveredRequirement, FeatureMap, FeatureUseCases } from '../../shared/types/requirements.js';
import type { ProjectProfile } from '../../shared/types/project.js';

export class FeatureMapBuilder {
  public static build(requirements: DiscoveredRequirement[], profile: ProjectProfile): FeatureMap {
    const featureMap: Record<string, FeatureUseCases> = {};
    const unmapped: DiscoveredRequirement[] = [];

    // Group requirements by feature or module
    for (const req of requirements) {
      let featureKey = 'Core';

      // Infer feature key from category or title
      if (req.category === 'auth' || req.title.toLowerCase().includes('auth') || req.title.toLowerCase().includes('login')) {
        featureKey = 'Authentication';
      } else if (req.title.toLowerCase().includes('cart') || req.title.toLowerCase().includes('checkout')) {
        featureKey = 'Checkout & Cart';
      } else if (req.source === 'openapi' || req.relatedEndpoints.length > 0) {
        featureKey = 'API Services';
      } else if (req.relatedRoutes.length > 0) {
        featureKey = 'UI Navigation';
      } else {
        const words = req.title.split(' ');
        if (words.length > 0) {
          featureKey = words[0];
        }
      }

      if (!featureMap[featureKey]) {
        featureMap[featureKey] = {
          featureId: `FEAT-${featureKey.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
          title: featureKey,
          description: `Feature capabilities for ${featureKey}`,
          useCases: []
        };
      }

      featureMap[featureKey].useCases.push({
        id: `UC-${req.id}`,
        title: req.title,
        description: req.description,
        requirementId: req.id,
        expectedBehavior: req.description.split('\n')[0] || req.title,
        flowSteps: req.acceptanceCriteria && req.acceptanceCriteria.length > 0
          ? req.acceptanceCriteria
          : [`Navigate or invoke ${req.title}`, 'Verify expected outcome and status']
      });
    }

    return {
      features: Object.values(featureMap),
      unmappedRequirements: unmapped,
      generatedAt: new Date().toISOString()
    };
  }
}
