import * as vscode from 'vscode';

/**
 * Command execution context with optional arguments
 */
export interface CommandContext {
  args?: unknown[];
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Command metadata for registration
 */
export interface CommandMetadata {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string; // When clause for command enablement
  keybinding?: {
    key: string;
    mac?: string;
    when?: string;
  };
}

/**
 * Telemetry event data
 */
export interface TelemetryEvent {
  eventName: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
}

/**
 * Abstract base class for all VS Code commands
 * Provides error handling, telemetry, and progress notification support
 */
export abstract class BaseCommand {
  protected readonly outputChannel: vscode.OutputChannel;

  constructor(
    protected readonly context: vscode.ExtensionContext,
    outputChannel?: vscode.OutputChannel
  ) {
    this.outputChannel =
      outputChannel ||
      vscode.window.createOutputChannel('Enzyme Extension', { log: true });
  }

  /**
   * Get command metadata for registration
   */
  abstract getMetadata(): CommandMetadata;

  /**
   * Execute the command logic
   * Implementations should focus on business logic, error handling is managed by the base class
   */
  protected abstract executeCommand(context: CommandContext): Promise<void>;

  /**
   * Public execute method with error handling and telemetry
   */
  async execute(...args: unknown[]): Promise<void> {
    const metadata = this.getMetadata();
    const startTime = Date.now();

    try {
      this.log('info', `Executing command: ${metadata.id}`);

      // Send telemetry event for command start
      this.sendTelemetry({
        eventName: `${metadata.id}/started`,
        properties: {
          commandId: metadata.id,
        },
      });

      // Execute the command
      await this.executeCommand({
        args,
      });

      // Send telemetry event for command success
      const duration = Date.now() - startTime;
      this.sendTelemetry({
        eventName: `${metadata.id}/completed`,
        properties: {
          commandId: metadata.id,
          status: 'success',
        },
        measurements: {
          duration,
        },
      });

      this.log('info', `Command completed: ${metadata.id} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      this.log('error', `Command failed: ${metadata.id}`, error);

      // Send telemetry event for command failure
      this.sendTelemetry({
        eventName: `${metadata.id}/failed`,
        properties: {
          commandId: metadata.id,
          status: 'error',
          error: errorMessage,
        },
        measurements: {
          duration,
        },
      });

      // Show error message to user
      await this.showError(`Failed to execute ${metadata.title}`, error);
    }
  }

  /**
   * Execute command with progress notification
   */
  protected async withProgress<T>(
    title: string,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>,
    options?: {
      location?: vscode.ProgressLocation;
      cancellable?: boolean;
    }
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: options?.location ?? vscode.ProgressLocation.Notification,
        title,
        cancellable: options?.cancellable ?? true,
      },
      task
    );
  }

  /**
   * Show information message to user
   */
  protected async showInfo(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show warning message to user
   */
  protected async showWarning(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Show error message to user with details
   */
  protected async showError(
    message: string,
    error?: unknown,
    ...items: string[]
  ): Promise<string | undefined> {
    const errorMessage =
      error instanceof Error ? error.message : error ? String(error) : '';
    const fullMessage = errorMessage
      ? `${message}: ${errorMessage}`
      : message;

    const showDetails = 'Show Details';
    const result = await vscode.window.showErrorMessage(
      fullMessage,
      showDetails,
      ...items
    );

    if (result === showDetails && error) {
      this.outputChannel.show();
    }

    return result === showDetails ? undefined : result;
  }

  /**
   * Show quick pick selection
   */
  protected async showQuickPick<T extends vscode.QuickPickItem>(
    items: T[] | Promise<T[]>,
    options?: vscode.QuickPickOptions
  ): Promise<T | undefined> {
    return vscode.window.showQuickPick(items, {
      ignoreFocusOut: true,
      ...options,
    });
  }

  /**
   * Show input box
   */
  protected async showInputBox(
    options?: vscode.InputBoxOptions
  ): Promise<string | undefined> {
    return vscode.window.showInputBox({
      ignoreFocusOut: true,
      ...options,
    });
  }

  /**
   * Get workspace folder
   */
  protected getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    return folders.length === 1
      ? folders[0]
      : vscode.window.activeTextEditor?.document.uri
        ? vscode.workspace.getWorkspaceFolder(
            vscode.window.activeTextEditor.document.uri
          )
        : folders[0];
  }

  /**
   * Ensure workspace folder exists
   */
  protected async ensureWorkspaceFolder(): Promise<vscode.WorkspaceFolder> {
    const folder = this.getWorkspaceFolder();
    if (!folder) {
      throw new Error('No workspace folder is open');
    }
    return folder;
  }

  /**
   * Get active text editor
   */
  protected getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * Open file in editor
   */
  protected async openFile(
    uri: vscode.Uri,
    options?: vscode.TextDocumentShowOptions
  ): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument(uri);
    return vscode.window.showTextDocument(document, options);
  }

  /**
   * Log message to output channel
   */
  protected log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: unknown
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      this.outputChannel.appendLine(logMessage);
      if (data instanceof Error) {
        this.outputChannel.appendLine(`  Error: ${data.message}`);
        if (data.stack) {
          this.outputChannel.appendLine(`  Stack: ${data.stack}`);
        }
      } else {
        this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
      }
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Send telemetry event
   * Override this method to integrate with your telemetry provider
   */
  protected sendTelemetry(event: TelemetryEvent): void {
    // Log telemetry event for debugging
    this.log('debug', `Telemetry: ${event.eventName}`, {
      properties: event.properties,
      measurements: event.measurements,
    });

    // TODO: Integrate with actual telemetry provider (e.g., Application Insights)
    // Example:
    // telemetryReporter.sendTelemetryEvent(
    //   event.eventName,
    //   event.properties,
    //   event.measurements
    // );
  }

  /**
   * Register this command with VS Code
   */
  register(): vscode.Disposable {
    const metadata = this.getMetadata();
    this.log('info', `Registering command: ${metadata.id}`);

    return vscode.commands.registerCommand(
      metadata.id,
      this.execute.bind(this)
    );
  }
}
