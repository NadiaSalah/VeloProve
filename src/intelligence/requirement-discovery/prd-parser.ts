import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredRequirement, RequirementPriority } from '../../shared/types/requirements.js';

export class PrdParser {
  public static parseFile(filePath: string, root: string): DiscoveredRequirement[] {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(root, filePath).replace(/\\/g, '/');
    const requirements: DiscoveredRequirement[] = [];

    const lines = content.split('\n');
    let currentReq: Partial<DiscoveredRequirement> | null = null;
    let reqIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Heading 1 or 2 as feature/requirement boundary
      const sectionMatch = trimmed.match(/^#{1,3}\s+(?:(\d+(?:\.\d+)?)\s+)?(.+)/);

      if (sectionMatch) {
        if (currentReq && currentReq.title && currentReq.description) {
          requirements.push(this.finalizeRequirement(currentReq, reqIndex++, relPath));
        }

        const rawTitle = sectionMatch[2].trim();
        const priority = this.inferPriority(rawTitle, trimmed);
        const category = this.inferCategory(rawTitle);

        currentReq = {
          title: rawTitle,
          description: '',
          source: relPath.toLowerCase().includes('prd') ? 'prd' : 'doc',
          sourceLocation: { file: relPath, line: i + 1 },
          priority,
          confidence: 0.9,
          category,
          relatedModules: [],
          relatedRoutes: [],
          relatedEndpoints: [],
          acceptanceCriteria: []
        };
      } else if (currentReq) {
        // Collect bullet points or descriptions
        if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('* [ ]')) {
          const criterion = trimmed.replace(/^[-*]\s*\[[ x]\]\s*/, '');
          currentReq.acceptanceCriteria = currentReq.acceptanceCriteria || [];
          currentReq.acceptanceCriteria.push(criterion);
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bullet = trimmed.replace(/^[-*]\s*/, '');
          currentReq.description = (currentReq.description ? currentReq.description + '\n' : '') + bullet;
        } else if (trimmed.length > 0 && !trimmed.startsWith('```')) {
          currentReq.description = (currentReq.description ? currentReq.description + ' ' : '') + trimmed;
        }
      }
    }

    if (currentReq && currentReq.title && currentReq.description) {
      requirements.push(this.finalizeRequirement(currentReq, reqIndex++, relPath));
    }

    return requirements;
  }

  private static finalizeRequirement(
    partial: Partial<DiscoveredRequirement>,
    index: number,
    file: string
  ): DiscoveredRequirement {
    const slug = partial.title
      ? partial.title
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .slice(0, 20)
      : 'REQ';
    const id = `REQ-${slug}-${String(index).padStart(3, '0')}`;

    return {
      id,
      title: partial.title || 'Untitled Requirement',
      description: partial.description || partial.title || '',
      source: partial.source || 'doc',
      sourceLocation: partial.sourceLocation || { file, line: 1 },
      priority: partial.priority || 'medium',
      confidence: partial.confidence || 0.85,
      category: partial.category || 'functional',
      relatedModules: partial.relatedModules || [],
      relatedRoutes: partial.relatedRoutes || [],
      relatedEndpoints: partial.relatedEndpoints || [],
      acceptanceCriteria: partial.acceptanceCriteria || [],
      testCoverageStatus: 'uncovered'
    };
  }

  private static inferPriority(title: string, line: string): RequirementPriority {
    const lower = `${title} ${line}`.toLowerCase();
    if (lower.includes('security') || lower.includes('auth') || lower.includes('critical') || lower.includes('payment')) {
      return 'critical';
    }
    if (lower.includes('must') || lower.includes('core') || lower.includes('important') || lower.includes('error')) {
      return 'high';
    }
    if (lower.includes('optional') || lower.includes('future') || lower.includes('nice to have')) {
      return 'low';
    }
    return 'medium';
  }

  private static inferCategory(title: string): DiscoveredRequirement['category'] {
    const lower = title.toLowerCase();
    if (lower.includes('auth') || lower.includes('login') || lower.includes('token')) return 'auth';
    if (lower.includes('security') || lower.includes('secret') || lower.includes('guard')) return 'security';
    if (lower.includes('error') || lower.includes('fail') || lower.includes('timeout')) return 'error_handling';
    if (lower.includes('validate') || lower.includes('schema')) return 'validation';
    if (lower.includes('edge') || lower.includes('corner') || lower.includes('boundary')) return 'edge_case';
    return 'functional';
  }
}
