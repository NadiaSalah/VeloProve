export class DynamicVariableStore {
  private variables: Map<string, unknown> = new Map();

  public set(key: string, value: unknown): void {
    this.variables.set(key, value);
  }

  public get(key: string): unknown {
    return this.variables.get(key);
  }

  public getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of this.variables.entries()) {
      result[k] = v;
    }
    return result;
  }

  public interpolate(template: string): string {
    return template.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      const val = this.variables.get(trimmed);
      return val !== undefined ? String(val) : `{{${trimmed}}}`;
    });
  }

  public extractFromResponse(body: any, mappings: Record<string, string>): void {
    if (!body || typeof body !== 'object') return;

    for (const [varName, pathExpression] of Object.entries(mappings)) {
      const value = this.extractJsonPath(body, pathExpression);
      if (value !== undefined) {
        this.set(varName, value);
      }
    }
  }

  private extractJsonPath(obj: any, pathExpr: string): unknown {
    const parts = pathExpr.replace(/^\$\.?/, '').split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
