/**
 * Shared healable-file policy for HealTestService and VisualAutoHealService.
 * Never rewrite unmarked developer tests.
 */
export function isHealableTestContent(content: string): boolean {
  return (
    content.includes('@veloprove-generated') || content.includes('// @veloprove-healable')
  );
}

export const HEALABLE_POLICY_REASON =
  'Heal skipped: test is not @veloprove-generated or @veloprove-healable';
