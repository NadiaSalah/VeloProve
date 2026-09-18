export type AlertProvider = 'slack' | 'discord' | 'teams' | 'generic';

export interface WebhookAlertPayload {
  projectName: string;
  verdict: 'PASSED' | 'FAILED' | 'READY' | 'NOT_READY';
  score?: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  securityIssuesCount?: number;
  detailsUrl?: string;
  authorOrCommit?: string;
  /** Git branch for cross-branch regression alerts */
  branch?: string;
  /** Mean time to recover in hours (when available) */
  mttrHours?: number | null;
  /** Pass-rate delta vs previous run on the same branch */
  velocityDelta?: number | null;
  regressionAlert?: boolean;
}

export interface WebhookDispatchOptions {
  webhookUrl: string;
  provider?: AlertProvider;
  payload: WebhookAlertPayload;
  timeoutMs?: number;
}

export interface WebhookDispatchResult {
  success: boolean;
  httpStatus: number;
  provider: AlertProvider;
  durationMs: number;
  message: string;
}

export class WebhookAlertService {
  public static async sendAlert(options: WebhookDispatchOptions): Promise<WebhookDispatchResult> {
    const provider = options.provider || this.detectProvider(options.webhookUrl);
    const p = options.payload;
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 5000;

    let bodyPayload: Record<string, unknown>;

    const isSuccess = p.verdict === 'PASSED' || p.verdict === 'READY';
    const colorHex = isSuccess ? '#34d399' : '#f87171';
    const emoji = isSuccess ? '✅' : '❌';

    switch (provider) {
      case 'slack':
        bodyPayload = {
          text: `${emoji} *VeloProve Test Run Verdict: ${p.verdict}* for *${p.projectName}*`,
          attachments: [
            {
              color: colorHex,
              fields: [
                { title: 'Passed Tests', value: `${p.passedCount} / ${p.totalTests}`, short: true },
                { title: 'Failed Tests', value: `${p.failedCount}`, short: true },
                { title: 'Quality Score', value: `${p.score !== undefined ? p.score + '/100' : 'N/A'}`, short: true },
                { title: 'Security Issues', value: `${p.securityIssuesCount || 0}`, short: true },
                ...(p.branch ? [{ title: 'Branch', value: p.branch, short: true }] : []),
                ...(p.mttrHours != null
                  ? [{ title: 'MTTR (h)', value: String(p.mttrHours), short: true }]
                  : []),
                ...(p.regressionAlert
                  ? [{ title: 'Regression', value: `Pass-rate Δ ${p.velocityDelta ?? '?'} pp`, short: true }]
                  : [])
              ],
              footer: 'VeloProve Autonomous QA Engine'
            }
          ]
        };
        break;

      case 'discord':
        bodyPayload = {
          content: `${emoji} **VeloProve QA Alert**: \`${p.projectName}\` verdict is **${p.verdict}**`,
          embeds: [
            {
              title: `Execution Summary (${p.passedCount}/${p.totalTests} Passed)`,
              color: isSuccess ? 0x34d399 : 0xf87171,
              fields: [
                { name: 'Failed Tests', value: `${p.failedCount}`, inline: true },
                { name: 'Quality Score', value: `${p.score !== undefined ? p.score + '/100' : '100%'}`, inline: true }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        };
        break;

      case 'teams':
        bodyPayload = {
          '@type': 'MessageCard',
          summary: `VeloProve ${p.verdict} for ${p.projectName}`,
          themeColor: isSuccess ? '34D399' : 'F87171',
          title: `${emoji} VeloProve Verdict: ${p.verdict} (${p.projectName})`,
          text: `Passed: ${p.passedCount}/${p.totalTests} | Failed: ${p.failedCount} | Score: ${p.score || 100}/100`
        };
        break;

      case 'generic':
      default:
        bodyPayload = {
          event: 'veloprove.run.completed',
          timestamp: new Date().toISOString(),
          ...p
        };
        break;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      const success = res.ok;

      return {
        success,
        httpStatus: res.status,
        provider,
        durationMs,
        message: success ? `Alert successfully dispatched to ${provider}` : `Webhook returned HTTP ${res.status}`
      };
    } catch (err: any) {
      return {
        success: false,
        httpStatus: 0,
        provider,
        durationMs: Date.now() - startTime,
        message: `Failed to dispatch webhook: ${err.message}`
      };
    }
  }

  private static detectProvider(url: string): AlertProvider {
    const u = url.toLowerCase();
    if (u.includes('slack.com')) return 'slack';
    if (u.includes('discord.com') || u.includes('discordapp.com')) return 'discord';
    if (u.includes('office.com') || u.includes('webhook.office.com')) return 'teams';
    return 'generic';
  }
}
