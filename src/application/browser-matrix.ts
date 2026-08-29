export type TargetBrowser = 'chromium' | 'firefox' | 'webkit';
export type DeviceProfile = 'desktop' | 'iphone_13' | 'pixel_7' | 'ipad_pro';

export interface MatrixDeviceConfig {
  name: string;
  browser: TargetBrowser;
  viewport: { width: number; height: number };
  isMobile: boolean;
  userAgent?: string;
}

export interface BrowserMatrixOptions {
  browsers?: TargetBrowser[];
  devices?: DeviceProfile[];
  baseURL?: string;
  outputPath?: string;
}

export interface BrowserMatrixResult {
  matrixCount: number;
  matrix: MatrixDeviceConfig[];
  playwrightProjectsSnippet: string;
  summary: string;
}

export class BrowserMatrixService {
  public static generateMatrix(options: BrowserMatrixOptions = {}): BrowserMatrixResult {
    const browsers: TargetBrowser[] = options.browsers && options.browsers.length > 0
      ? options.browsers
      : ['chromium', 'firefox', 'webkit'];

    const devices: DeviceProfile[] = options.devices && options.devices.length > 0
      ? options.devices
      : ['desktop', 'iphone_13', 'pixel_7'];

    const matrix: MatrixDeviceConfig[] = [];

    for (const b of browsers) {
      if (devices.includes('desktop')) {
        matrix.push({
          name: `Desktop ${b.toUpperCase()}`,
          browser: b,
          viewport: { width: 1280, height: 720 },
          isMobile: false
        });
      }
    }

    if (devices.includes('iphone_13')) {
      matrix.push({
        name: 'Mobile Safari (iPhone 13)',
        browser: 'webkit',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      });
    }

    if (devices.includes('pixel_7')) {
      matrix.push({
        name: 'Mobile Chrome (Pixel 7)',
        browser: 'chromium',
        viewport: { width: 412, height: 915 },
        isMobile: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
      });
    }

    if (devices.includes('ipad_pro')) {
      matrix.push({
        name: 'Tablet (iPad Pro 11)',
        browser: 'webkit',
        viewport: { width: 834, height: 1194 },
        isMobile: true
      });
    }

    const projectsCode = matrix.map(m => `    {
      name: '${m.name}',
      use: {
        browserName: '${m.browser}',
        viewport: { width: ${m.viewport.width}, height: ${m.viewport.height} },
        isMobile: ${m.isMobile}${m.userAgent ? `,\n        userAgent: '${m.userAgent}'` : ''}
      }
    }`).join(',\n');

    const playwrightProjectsSnippet = `// Playwright Cross-Browser & Mobile Matrix Projects
projects: [
${projectsCode}
]`;

    return {
      matrixCount: matrix.length,
      matrix,
      playwrightProjectsSnippet,
      summary: `Generated ${matrix.length} matrix targets across ${browsers.join(', ')} and ${devices.join(', ')} devices.`
    };
  }
}
