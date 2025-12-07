import * as vscode from 'vscode';
import * as path from 'path';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

interface RouteInfo {
  path: string;
  file: string;
  line: number;
  pattern: string;
}

interface RouteConflict {
  route1: RouteInfo;
  route2: RouteInfo;
  type: 'duplicate' | 'ambiguous' | 'shadowed';
  description: string;
}

/**
 * Find Route Conflicts Command
 * Detect route conflicts and show diagnostics with quick fixes
 */
export class FindRouteConflictsCommand extends BaseCommand {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(
    context: vscode.ExtensionContext,
    outputChannel?: vscode.OutputChannel
  ) {
    super(context, outputChannel);
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('enzyme-routes');
    context.subscriptions.push(this.diagnosticCollection);
  }

  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.analysis.findRouteConflicts',
      title: 'Enzyme: Find Route Conflicts',
      category: 'Enzyme Analysis',
      icon: '$(warning)',
    };
  }

  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Find conflicts
    const conflicts = await this.withProgress(
      'Scanning for route conflicts...',
      async (progress) => {
        progress.report({ message: 'Finding route definitions...' });
        const routes = await this.findAllRoutes(workspaceFolder);

        progress.report({ message: 'Detecting conflicts...', increment: 50 });
        return this.detectConflicts(routes);
      }
    );

    // Clear previous diagnostics
    this.diagnosticCollection.clear();

    if (conflicts.length === 0) {
      await this.showInfo('No route conflicts found!');
      return;
    }

    // Create diagnostics
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

    for (const conflict of conflicts) {
      // Create diagnostic for route1
      this.addDiagnostic(diagnosticsMap, conflict.route1, conflict);

      // Create diagnostic for route2
      this.addDiagnostic(diagnosticsMap, conflict.route2, conflict);
    }

    // Apply diagnostics
    for (const [file, diagnostics] of diagnosticsMap) {
      this.diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
    }

    // Display results
    this.outputChannel.clear();
    this.outputChannel.show();
    this.displayConflicts(conflicts);

    await this.showWarning(
      `Found ${conflicts.length} route conflict(s). Check Problems panel for details.`,
      'View Problems'
    );
  }

  private async findAllRoutes(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');

    try {
      const routeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(srcPath, '**/routes/**/*.{ts,tsx,js,jsx}'),
        '**/node_modules/**'
      );

      for (const fileUri of routeFiles) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const text = document.getText();

        // Find path definitions
        const pathRegex = /path:\s*['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = pathRegex.exec(text)) !== null) {
          const routePath = match[1];
          const line = document.positionAt(match.index).line;

          routes.push({
            path: routePath,
            file: fileUri.fsPath,
            line,
            pattern: this.routeToPattern(routePath),
          });
        }
      }

      return routes;
    } catch (error) {
      this.log('error', 'Failed to find routes', error);
      return [];
    }
  }

  private routeToPattern(routePath: string): string {
    // Convert route path to a pattern for conflict detection
    return routePath
      .replace(/:\w+/g, ':param')  // Replace all params with :param
      .replace(/\*/g, '*wildcard'); // Normalize wildcards
  }

  private detectConflicts(routes: RouteInfo[]): RouteConflict[] {
    const conflicts: RouteConflict[] = [];

    // Check for duplicate routes
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        const route1 = routes[i];
        const route2 = routes[j];

        // Exact duplicates
        if (route1.path === route2.path) {
          conflicts.push({
            route1,
            route2,
            type: 'duplicate',
            description: `Duplicate route path: ${route1.path}`,
          });
          continue;
        }

        // Pattern conflicts (e.g., /users/:id and /users/:userId)
        if (route1.pattern === route2.pattern && route1.path !== route2.path) {
          conflicts.push({
            route1,
            route2,
            type: 'ambiguous',
            description: `Ambiguous routes: ${route1.path} and ${route2.path} will match the same URLs`,
          });
          continue;
        }

        // Shadowing (e.g., /users/admin shadowed by /users/:id)
        if (this.isShadowed(route1, route2)) {
          conflicts.push({
            route1,
            route2,
            type: 'shadowed',
            description: `Route ${route1.path} may be shadowed by ${route2.path}`,
          });
        }
      }
    }

    return conflicts;
  }

  private isShadowed(route1: RouteInfo, route2: RouteInfo): boolean {
    const parts1 = route1.path.split('/').filter(Boolean);
    const parts2 = route2.path.split('/').filter(Boolean);

    if (parts1.length !== parts2.length) {
      return false;
    }

    for (let i = 0; i < parts1.length; i++) {
      const part1 = parts1[i];
      const part2 = parts2[i];

      // If route2 has a param where route1 has a static segment
      if (!part1.startsWith(':') && part2.startsWith(':')) {
        return true;
      }

      // If parts are different and neither is a param
      if (part1 !== part2 && !part1.startsWith(':') && !part2.startsWith(':')) {
        return false;
      }
    }

    return false;
  }

  private addDiagnostic(
    diagnosticsMap: Map<string, vscode.Diagnostic[]>,
    route: RouteInfo,
    conflict: RouteConflict
  ): void {
    const diagnostics = diagnosticsMap.get(route.file) || [];

    const severity =
      conflict.type === 'duplicate'
        ? vscode.DiagnosticSeverity.Error
        : conflict.type === 'ambiguous'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(route.line, 0, route.line, 100),
      conflict.description,
      severity
    );

    diagnostic.source = 'Enzyme';
    diagnostic.code = `route-conflict-${conflict.type}`;

    // Add related information
    const otherRoute = conflict.route1 === route ? conflict.route2 : conflict.route1;
    diagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(
          vscode.Uri.file(otherRoute.file),
          new vscode.Position(otherRoute.line, 0)
        ),
        `Conflicts with route: ${otherRoute.path}`
      ),
    ];

    diagnostics.push(diagnostic);
    diagnosticsMap.set(route.file, diagnostics);
  }

  private displayConflicts(conflicts: RouteConflict[]): void {
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('ROUTE CONFLICTS DETECTED');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('');

    const duplicates = conflicts.filter((c) => c.type === 'duplicate');
    const ambiguous = conflicts.filter((c) => c.type === 'ambiguous');
    const shadowed = conflicts.filter((c) => c.type === 'shadowed');

    this.outputChannel.appendLine(`Total Conflicts: ${conflicts.length}`);
    this.outputChannel.appendLine(`  Duplicates: ${duplicates.length}`);
    this.outputChannel.appendLine(`  Ambiguous: ${ambiguous.length}`);
    this.outputChannel.appendLine(`  Shadowed: ${shadowed.length}`);
    this.outputChannel.appendLine('');

    if (duplicates.length > 0) {
      this.outputChannel.appendLine('DUPLICATE ROUTES:');
      for (const conflict of duplicates) {
        this.outputChannel.appendLine(`  ❌ ${conflict.route1.path}`);
        this.outputChannel.appendLine(`     ${conflict.route1.file}:${conflict.route1.line + 1}`);
        this.outputChannel.appendLine(`     ${conflict.route2.file}:${conflict.route2.line + 1}`);
        this.outputChannel.appendLine('');
      }
    }

    if (ambiguous.length > 0) {
      this.outputChannel.appendLine('AMBIGUOUS ROUTES:');
      for (const conflict of ambiguous) {
        this.outputChannel.appendLine(`  ⚠️  ${conflict.route1.path} ↔ ${conflict.route2.path}`);
        this.outputChannel.appendLine(`     ${conflict.route1.file}:${conflict.route1.line + 1}`);
        this.outputChannel.appendLine(`     ${conflict.route2.file}:${conflict.route2.line + 1}`);
        this.outputChannel.appendLine('');
      }
    }

    if (shadowed.length > 0) {
      this.outputChannel.appendLine('SHADOWED ROUTES:');
      for (const conflict of shadowed) {
        this.outputChannel.appendLine(`  ℹ️  ${conflict.route1.path} shadowed by ${conflict.route2.path}`);
        this.outputChannel.appendLine(`     ${conflict.route1.file}:${conflict.route1.line + 1}`);
        this.outputChannel.appendLine('');
      }
    }

    this.outputChannel.appendLine('='.repeat(80));
  }
}
