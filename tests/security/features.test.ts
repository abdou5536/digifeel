import { describe, expect, it } from 'vitest';
import { isLocalWorkspaceEnabled } from '../../src/lib/features';

describe('local workspace feature gate', () => {
  it('never enables localStorage workspaces in production', () => {
    expect(isLocalWorkspaceEnabled('production', '1')).toBe(false);
  });

  it('keeps legacy workspaces available outside production during migration', () => {
    expect(isLocalWorkspaceEnabled('development', '1')).toBe(true);
  });

  it('allows disabling the legacy workspace outside production', () => {
    expect(isLocalWorkspaceEnabled('development', '0')).toBe(false);
  });
});
