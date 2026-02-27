#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * Provides command-line argument parsing and entry point for claude-monitor.
 */

/**
 * CLI options parsed from command line arguments
 */
export interface CliOptions {
  /** Command to execute */
  command: 'default' | 'server' | 'tui' | 'web' | 'status' | 'help';
  /** Port number for server/web commands */
  port: number;
  /** Host address for server */
  host: string;
}

/**
 * Default CLI options
 */
const DEFAULT_OPTIONS: CliOptions = {
  command: 'default',
  port: 19876,
  host: 'localhost',
};

/**
 * Valid commands
 */
const VALID_COMMANDS = ['default', 'server', 'tui', 'web', 'status', 'help'] as const;

/**
 * Parse command line arguments
 *
 * @param argv - Command line arguments (without node and script path)
 * @returns Parsed CLI options
 */
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_OPTIONS };

  // Check for help flag first
  if (argv.includes('--help') || argv.includes('-h')) {
    return { ...options, command: 'help' };
  }

  // Parse command
  const firstArg = argv[0];
  if (firstArg && !firstArg.startsWith('-')) {
    if (VALID_COMMANDS.includes(firstArg as typeof VALID_COMMANDS[number])) {
      options.command = firstArg as CliOptions['command'];
    } else {
      // Invalid command - log warning and fall back to default
      console.warn(`Warning: Unknown command '${firstArg}'. Falling back to default.`);
    }
  }

  // Parse options
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--port' || arg === '-p') {
      const portStr = argv[++i];
      if (portStr) {
        const port = parseInt(portStr, 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          options.port = port;
        }
      }
    } else if (arg === '--host' || arg === '-H') {
      const host = argv[++i];
      if (host) {
        options.host = host;
      }
    }
  }

  return options;
}

/**
 * Print help message to stdout
 */
export function printHelp(): void {
  console.log(`
claude-monitor - Monitor multiple Claude Code CLI instances

USAGE:
  claude-monitor [COMMAND] [OPTIONS]

COMMANDS:
  default   Start monitor with default settings (server + TUI)
  server    Start only the WebSocket server
  tui       Start only the TUI client
  web       Start the web UI
  status    Show status of running instances
  help      Show this help message

OPTIONS:
  -p, --port <PORT>   Port number (default: 19876)
  -H, --host <HOST>   Host address (default: localhost)
  -h, --help          Show this help message

EXAMPLES:
  claude-monitor                  Start with default settings
  claude-monitor server           Start only the server
  claude-monitor tui              Start only the TUI client
  claude-monitor web --port 8080  Start web UI on port 8080
`);
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  // Skip node and script path from process.argv
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);

  switch (options.command) {
    case 'help':
      printHelp();
      break;

    case 'default':
      console.log('Starting monitor with default settings...');
      console.log(`Port: ${options.port}, Host: ${options.host}`);
      // TODO: Implement default command (server + TUI)
      break;

    case 'server':
      console.log('Starting WebSocket server...');
      console.log(`Port: ${options.port}, Host: ${options.host}`);
      // TODO: Implement server command
      break;

    case 'tui':
      console.log('Starting TUI client...');
      console.log(`Port: ${options.port}, Host: ${options.host}`);
      // TODO: Implement TUI command
      break;

    case 'web':
      console.log('Starting Web UI...');
      console.log(`Port: ${options.port}, Host: ${options.host}`);
      // TODO: Implement web command
      break;

    case 'status':
      console.log('Checking status...');
      // TODO: Implement status command
      break;
  }
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
