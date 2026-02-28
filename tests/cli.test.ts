// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('CLI', () => {
  it('should parse default command (no args)', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('default');
    expect(result.port).toBe(19876);
  });

  it('should parse server command with port', () => {
    const result = parseArgs(['server', '--port', '3000']);
    expect(result.command).toBe('server');
    expect(result.port).toBe(3000);
  });

  it('should parse tui command', () => {
    const result = parseArgs(['tui']);
    expect(result.command).toBe('tui');
  });

  it('should parse web command with port', () => {
    const result = parseArgs(['web', '--port', '8080']);
    expect(result.command).toBe('web');
    expect(result.port).toBe(8080);
  });

  it('should parse status command', () => {
    const result = parseArgs(['status']);
    expect(result.command).toBe('status');
  });

  it('should parse help flag', () => {
    const result = parseArgs(['--help']);
    expect(result.command).toBe('help');
  });
});
