import * as vscode from 'vscode';

/**
 * Command execution context with optional arguments and cancellation support
 *
 * @interface CommandContext
 * @property {unknown[]} [args] - Optional array of arguments passed to the command
 * @property {vscode.CancellationToken} [cancellationToken] - Optional cancellation token for long-running operations
 *
 * @example
 * ```typescript
 * const context: CommandContext = {
 *   args: ['arg1', 'arg2'],
 *   cancellationToken: token
 * };
 * ```
 */
export interface CommandContext {
  args?: unknown[];
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Command metadata for VS Code command registration
 *
 * @interface CommandMetadata
 * @property {string} id - Unique command identifier (e.g., 'enzyme.generate.component')
 * @property {string} title - Human-readable command title shown in command palette
 * @property {string} [category] - Optional command category for grouping in UI
 * @property {string} [icon] - Optional icon identifier using $(icon-name) syntax
 * @property {string} [enablement] - Optional when clause for conditional command availability
 * @property {object} [keybinding] - Optional keyboard shortcut configuration
 * @property {string} keybinding.key - Key combination for Windows/Linux
 * @property {string} [keybinding.mac] - Optional macOS-specific key combination
 * @property {string} [keybinding.when] - Optional context for keybinding activation
 *
 * @example
 * ```typescript
 * const metadata: CommandMetadata = {
 *   id: 'enzyme.generate.component',
 *   title: 'Generate Component',
 *   category: 'Enzyme',
 *   icon: '$(symbol-class)',
 *   enablement: 'enzyme:isEnzymeProject',
 *   keybinding: {
 *     key: 'ctrl+shift+g c',
 *     mac: 'cmd+shift+g c',
 *     when: 'editorTextFocus'
 *   }
 * };
 * ```
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
 * Telemetry event data structure for analytics and monitoring
 *
 * @interface TelemetryEvent
 * @property {string} eventName - Name of the telemetry event
 * @property {Record<string, string | number | boolean>} [properties] - Optional event properties
 * @property {Record<string, number>} [measurements] - Optional numeric measurements (e.g., duration, count)
 *
 * @example
 * ```typescript
 * const event: TelemetryEvent = {
 *   eventName: 'command.executed',
 *   properties: {
 *     commandId: 'enzyme.generate.component',
 *     status: 'success'
 *   },
 *   measurements: {
 *     duration: 1234
 *   }
 * };
 * ```
 */
export interface TelemetryEvent {
  eventName: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
}

/**
 * Abstract base class for all VS Code commands in the Enzyme extension
 *
 * Provides a robust foundation for command implementations with:
 * - Automatic error handling and user-friendly error messages
 * - Integrated telemetry for usage tracking
 * - Progress reporting for long-running operations
 * - Logging to output channel
 * - Helper methods for common VS Code interactions
 *
 * @abstract
 * @class BaseCommand
 *
 * @example
 * ```typescript
 * export class MyCommand extends BaseCommand {
 *   getMetadata(): CommandMetadata {
 *     return {
 *       id: 'enzyme.myCommand',
 *       title: 'My Command',
 *       category: 'Enzyme'
 *     };
 *   }
 *
 *   protected async executeCommand(context: CommandContext): Promise<void> {
 *     await this.showInfo('Command executed!');
 *   }
 * }
 * ```
 */
export abstract class BaseCommand {
  protected readonly outputChannel: vscode.OutputChannel;

  /**
   * Creates a new BaseCommand instance
   *
   * @param {vscode.ExtensionContext} context - The VS Code extension context
   * @param {vscode.OutputChannel} [outputChannel] - Optional output channel for logging.
   *                                                   If not provided, a new one will be created.
   *
   * @example
   * ```typescript
   * constructor(context: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel) {
   *   super(context, outputChannel);
   * }
   * ```
   */
  constructor(
    protected readonly context: vscode.ExtensionContext,
    outputChannel?: vscode.OutputChannel
  ) {
    this.outputChannel =
      outputChannel ||
      vscode.window.createOutputChannel('Enzyme Extension', { log: true });
  }

  /**
   * Get command metadata for registration with VS Code
   *
   * This method must be implemented by all command classes to provide
   * registration information including command ID, title, category, and keybindings.
   *
   * @abstract
   * @returns {CommandMetadata} The command metadata object
   *
   * @example
   * ```typescript
   * getMetadata(): CommandMetadata {
   *   return {
   *     id: 'enzyme.generate.component',
   *     title: 'Generate Component',
   *     category: 'Enzyme',
   *     icon: '$(symbol-class)'
   *   };
   * }
   * ```
   */
  abstract getMetadata(): CommandMetadata;

  /**
   * Execute the command logic
   *
   * This is the main method that implementations override to provide
   * command-specific functionality. Error handling, telemetry, and
   * progress reporting are managed by the base class.
   *
   * @abstract
   * @protected
   * @param {CommandContext} context - The command execution context with arguments
   * @returns {Promise<void>} A promise that resolves when the command completes
   * @throws {Error} May throw errors which will be caught and handled by the base class
   *
   * @example
   * ```typescript
   * protected async executeCommand(context: CommandContext): Promise<void> {
   *   const workspaceFolder = await this.ensureWorkspaceFolder();
   *   await this.showInfo('Command executed successfully!');
   * }
   * ```
   */
  protected abstract executeCommand(context: CommandContext): Promise<void>;

  /**
   * Public execute method with comprehensive error handling and telemetry
   *
   * This method wraps the executeCommand implementation with:
   * - Telemetry events for command start, success, and failure
   * - Automatic error handling and user-friendly error messages
   * - Execution duration tracking
   * - Detailed logging
   *
   * @param {...unknown[]} args - Variable arguments passed to the command
   * @returns {Promise<void>} A promise that resolves when command execution completes
   *
   * @example
   * ```typescript
   * // Called automatically by VS Code when command is invoked
   * await command.execute('arg1', 'arg2');
   * ```
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
   *
   * Wraps a long-running operation with VS Code's progress UI, showing
   * progress updates to the user and supporting cancellation.
   *
   * @template T - The return type of the task
   * @protected
   * @param {string} title - The title shown in the progress notification
   * @param {Function} task - The async task to execute with progress updates
   * @param {object} [options] - Optional progress configuration
   * @param {vscode.ProgressLocation} [options.location=Notification] - Where to show progress
   * @param {boolean} [options.cancellable=true] - Whether the operation can be cancelled
   * @returns {Promise<T>} The result of the task execution
   *
   * @example
   * ```typescript
   * const result = await this.withProgress(
   *   'Generating component...',
   *   async (progress, token) => {
   *     progress.report({ message: 'Creating files...', increment: 50 });
   *     const path = await this.generateFiles();
   *     progress.report({ message: 'Done!', increment: 100 });
   *     return path;
   *   },
   *   { cancellable: true }
   * );
   * ```
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
   *
   * Displays an information message notification with optional action buttons.
   *
   * @protected
   * @param {string} message - The information message to display
   * @param {...string[]} items - Optional action button labels
   * @returns {Promise<string | undefined>} The label of the clicked button, or undefined if dismissed
   *
   * @example
   * ```typescript
   * const action = await this.showInfo('File created!', 'Open', 'Close');
   * if (action === 'Open') {
   *   await this.openFile(fileUri);
   * }
   * ```
   */
  protected async showInfo(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show warning message to user
   *
   * Displays a warning message notification with optional action buttons.
   *
   * @protected
   * @param {string} message - The warning message to display
   * @param {...string[]} items - Optional action button labels
   * @returns {Promise<string | undefined>} The label of the clicked button, or undefined if dismissed
   *
   * @example
   * ```typescript
   * const action = await this.showWarning('No workspace found', 'Open Folder');
   * if (action === 'Open Folder') {
   *   await vscode.commands.executeCommand('vscode.openFolder');
   * }
   * ```
   */
  protected async showWarning(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Show error message to user with optional details
   *
   * Displays an error message notification with automatic "Show Details" button
   * that opens the output channel when clicked.
   *
   * @protected
   * @param {string} message - The error message to display
   * @param {unknown} [error] - Optional error object for detailed logging
   * @param {...string[]} items - Optional additional action button labels
   * @returns {Promise<string | undefined>} The label of the clicked button, or undefined if dismissed
   *
   * @example
   * ```typescript
   * try {
   *   await this.performOperation();
   * } catch (error) {
   *   await this.showError('Operation failed', error, 'Retry');
   * }
   * ```
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
   * @param items - Array of quick pick items or promise that resolves to items
   * @param options - Optional quick pick configuration options
   * @returns Promise resolving to selected item or undefined if cancelled
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
   * @param options - Optional input box configuration options
   * @returns Promise resolving to input string or undefined if cancelled
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
   * @returns The active workspace folder or undefined if none available
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
   * @returns Promise resolving to the workspace folder
   * @throws Error if no workspace folder is open
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
   * @returns The currently active text editor or undefined if none
   */
  protected getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * Open file in editor
   * @param uri - The file URI to open
   * @param options - Optional document show options
   * @returns Promise resolving to the text editor
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
   * @param level - Log level (info, warn, error, debug)
   * @param message - Log message
   * @param data - Optional additional data to log
   * @returns void
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
   * @param event - The telemetry event to send
   * @returns void
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
   * @returns Disposable for the command registration
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
