import path from 'node:path';
import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile, RouteDefinition } from '../shared/types/project.js';

export interface DiscoveredInteractiveElement {
  tag: string;
  role?: string;
  name?: string;
  text?: string;
  href?: string;
  selector: string;
  isClickable: boolean;
  isInput: boolean;
}

export interface ExploredScreen {
  routePath: string;
  sourceFile: string;
  title: string;
  elements: DiscoveredInteractiveElement[];
  discoveredLinks: string[];
  inferredUseCases: string[];
}

export interface SiteExplorationResult {
  baseURL: string;
  screens: ExploredScreen[];
  totalRoutes: number;
  totalInteractiveElements: number;
  explorationGraph: Array<{ from: string; to: string }>;
  timestamp: string;
}

export class AppExplorationService {
  public static async explore(
    profile: ProjectProfile,
    guard: WorkspaceGuard,
    options: { baseURL?: string } = {}
  ): Promise<SiteExplorationResult> {
    const baseURL = options.baseURL || 'http://localhost:5173';
    const screens: ExploredScreen[] = [];
    const explorationGraph: Array<{ from: string; to: string }> = [];

    // Crawl routes and synthesize interactive element maps from routes & source files
    for (const route of profile.routes) {
      const screen = this.exploreRoute(route, guard);
      screens.push(screen);

      for (const link of screen.discoveredLinks) {
        explorationGraph.push({
          from: route.path,
          to: link
        });
      }
    }

    // If no routes discovered, explore root route
    if (screens.length === 0) {
      screens.push({
        routePath: '/',
        sourceFile: 'src/App.tsx',
        title: 'Home Page',
        elements: [
          {
            tag: 'button',
            role: 'button',
            name: 'Submit',
            selector: "page.getByRole('button', { name: /submit/i })",
            isClickable: true,
            isInput: false
          }
        ],
        discoveredLinks: [],
        inferredUseCases: ['Load home page and verify primary action']
      });
    }

    const totalElements = screens.reduce((acc, s) => acc + s.elements.length, 0);

    const result: SiteExplorationResult = {
      baseURL,
      screens,
      totalRoutes: screens.length,
      totalInteractiveElements: totalElements,
      explorationGraph,
      timestamp: new Date().toISOString()
    };

    // Save site exploration map to .veloprove/
    const savePath = path.join(guard.getVeloProveDirectory(), 'cache', 'site-exploration.json');
    fs.writeFileSync(savePath, JSON.stringify(result, null, 2), 'utf8');

    return result;
  }

  private static exploreRoute(route: RouteDefinition, guard: WorkspaceGuard): ExploredScreen {
    const fullSourcePath = guard.resolveSafePath(route.sourceFile);
    let sourceContent = '';
    if (fs.existsSync(fullSourcePath)) {
      sourceContent = fs.readFileSync(fullSourcePath, 'utf8');
    }

    const elements: DiscoveredInteractiveElement[] = [];
    const discoveredLinks: string[] = [];
    const inferredUseCases: string[] = [];

    // 1. Detect buttons
    const btnMatches = sourceContent.matchAll(/<button[^>]*>(.*?)<\/button>/g);
    for (const match of btnMatches) {
      const btnText = match[1].replace(/<[^>]+>/g, '').trim() || 'Button';
      elements.push({
        tag: 'button',
        role: 'button',
        name: btnText,
        text: btnText,
        selector: `page.getByRole('button', { name: /${btnText}/i })`,
        isClickable: true,
        isInput: false
      });
      inferredUseCases.push(`Click "${btnText}" on ${route.path}`);
    }

    // 2. Detect Inputs
    const inputMatches = sourceContent.matchAll(/<(?:input|textarea)[^>]*placeholder=['"]([^'"]+)['"]/g);
    for (const match of inputMatches) {
      const placeholder = match[1];
      elements.push({
        tag: 'input',
        role: 'textbox',
        name: placeholder,
        selector: `page.getByPlaceholder('${placeholder}')`,
        isClickable: false,
        isInput: true
      });
      inferredUseCases.push(`Fill in "${placeholder}" field`);
    }

    // 3. Detect Navigation Links
    const linkMatches = sourceContent.matchAll(/href=['"](\/[^'"]*)['"]/g);
    for (const match of linkMatches) {
      const href = match[1];
      if (!discoveredLinks.includes(href)) {
        discoveredLinks.push(href);
      }
      elements.push({
        tag: 'a',
        role: 'link',
        href,
        selector: `page.locator('a[href="${href}"]')`,
        isClickable: true,
        isInput: false
      });
    }

    return {
      routePath: route.path,
      sourceFile: route.sourceFile,
      title: `${route.path} View`,
      elements,
      discoveredLinks,
      inferredUseCases
    };
  }
}
