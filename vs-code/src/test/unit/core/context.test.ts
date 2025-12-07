/**
 * @file EnzymeExtensionContext Unit Tests
 * @description Comprehensive unit tests for the EnzymeExtensionContext class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode');

import { EnzymeExtensionContext } from '../../../core/context';
import { MockExtensionContext } from '../../helpers/vscode-mock';

describe('EnzymeExtensionContext', () => {
  let mockContext: MockExtensionContext;
  let enzymeContext: EnzymeExtensionContext;

  beforeEach(() => {
    mockContext = new MockExtensionContext();
    enzymeContext = EnzymeExtensionContext.initialize(mockContext as any);
  });

  afterEach(() => {
    enzymeContext.dispose();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should create a singleton instance', () => {
      const instance = EnzymeExtensionContext.getInstance();
      expect(instance).toBe(enzymeContext);
    });

    it('should throw error if initialized twice', () => {
      const newContext = new MockExtensionContext();

      expect(() => {
        EnzymeExtensionContext.initialize(newContext as any);
      }).toThrow('EnzymeExtensionContext already initialized');
    });

    it('should throw error if getInstance called before initialize', () => {
      enzymeContext.dispose();

      expect(() => {
        EnzymeExtensionContext.getInstance();
      }).toThrow('EnzymeExtensionContext not initialized');
    });

    it('should allow reinitialization after dispose', () => {
      enzymeContext.dispose();

      const newContext = new MockExtensionContext();
      const newInstance = EnzymeExtensionContext.initialize(newContext as any);

      expect(newInstance).toBeDefined();
      expect(newInstance).not.toBe(enzymeContext);

      newInstance.dispose();
    });
  });

  describe('Context Access', () => {
    it('should provide access to VS Code context', () => {
      const context = enzymeContext.getContext();
      expect(context).toBe(mockContext);
    });

    it('should provide access to logger', () => {
      const logger = enzymeContext.getLogger();
      expect(logger).toBeDefined();
    });

    it('should provide access to output channel', () => {
      const channel = enzymeContext.getOutputChannel();
      expect(channel).toBeDefined();
    });

    it('should provide access to diagnostic collection', () => {
      const diagnostics = enzymeContext.getDiagnosticCollection();
      expect(diagnostics).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should provide workspace state', () => {
      const state = enzymeContext.getWorkspaceState();
      expect(state).toBe(mockContext.workspaceState);
    });

    it('should provide global state', () => {
      const state = enzymeContext.getGlobalState();
      expect(state).toBe(mockContext.globalState);
    });

    it('should provide secrets storage', () => {
      const secrets = enzymeContext.getSecrets();
      expect(secrets).toBe(mockContext.secrets);
    });
  });

  describe('Path Access', () => {
    it('should provide extension path', () => {
      const path = enzymeContext.getExtensionPath();
      expect(path).toBe('/mock/extension/path');
    });

    it('should provide extension URI', () => {
      const uri = enzymeContext.getExtensionUri();
      expect(uri).toBeDefined();
      expect(uri.scheme).toBe('file');
    });

    it('should provide storage path', () => {
      const path = enzymeContext.getStoragePath();
      expect(path).toBe('/mock/storage/path');
    });

    it('should provide global storage path', () => {
      const path = enzymeContext.getGlobalStoragePath();
      expect(path).toBe('/mock/global/storage');
    });

    it('should provide log path', () => {
      const path = enzymeContext.getLogPath();
      expect(path).toBe('/mock/log');
    });
  });

  describe('Extension Mode', () => {
    it('should provide extension mode', () => {
      const mode = enzymeContext.getExtensionMode();
      expect(mode).toBe(3); // Production mode
    });
  });

  describe('First Activation', () => {
    it('should detect first activation', async () => {
      const isFirst = await enzymeContext.isFirstActivation();
      expect(isFirst).toBe(true);
    });

    it('should not be first activation on second call', async () => {
      await enzymeContext.isFirstActivation();
      const isFirst = await enzymeContext.isFirstActivation();

      expect(isFirst).toBe(false);
    });
  });

  describe('Status Bar Items', () => {
    it('should create status bar item', () => {
      const item = enzymeContext.getStatusBarItem('test-status');
      expect(item).toBeDefined();
    });

    it('should return same status bar item for same id', () => {
      const item1 = enzymeContext.getStatusBarItem('test-status');
      const item2 = enzymeContext.getStatusBarItem('test-status');

      expect(item1).toBe(item2);
    });

    it('should create different items for different ids', () => {
      const item1 = enzymeContext.getStatusBarItem('status-1');
      const item2 = enzymeContext.getStatusBarItem('status-2');

      expect(item1).not.toBe(item2);
    });

    it('should configure status bar item with config', () => {
      const item = enzymeContext.getStatusBarItem('configured-status', {
        text: '$(beaker) Test',
        tooltip: 'Test tooltip',
        command: 'test.command',
      });

      expect(item.text).toBe('$(beaker) Test');
      expect(item.tooltip).toBe('Test tooltip');
      expect(item.command).toBe('test.command');
    });

    it('should remove status bar item', () => {
      const item = enzymeContext.getStatusBarItem('removable-status');
      const disposeSpy = vi.spyOn(item, 'dispose');

      enzymeContext.removeStatusBarItem('removable-status');

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Workspace Management', () => {
    const mockWorkspace = {
      isEnzymeProject: true,
      features: [{ name: 'Auth' }, { name: 'Dashboard' }],
      routes: [{ path: '/' }, { path: '/about' }],
      enzymeVersion: '1.0.0',
      packageJson: {},
      enzymeConfig: {},
      rootPath: '/test/path',
    };

    it('should set workspace', () => {
      enzymeContext.setWorkspace(mockWorkspace as any);
      const workspace = enzymeContext.getWorkspace();

      expect(workspace).toBe(mockWorkspace);
    });

    it('should detect Enzyme workspace', () => {
      expect(enzymeContext.isEnzymeWorkspace()).toBe(false);

      enzymeContext.setWorkspace(mockWorkspace as any);
      expect(enzymeContext.isEnzymeWorkspace()).toBe(true);
    });

    it('should get Enzyme config', () => {
      enzymeContext.setWorkspace(mockWorkspace as any);
      const config = enzymeContext.getEnzymeConfig();

      expect(config).toBe(mockWorkspace.enzymeConfig);
    });

    it('should get package.json', () => {
      enzymeContext.setWorkspace(mockWorkspace as any);
      const packageJson = enzymeContext.getPackageJson();

      expect(packageJson).toBe(mockWorkspace.packageJson);
    });

    it('should get Enzyme version', () => {
      enzymeContext.setWorkspace(mockWorkspace as any);
      const version = enzymeContext.getEnzymeVersion();

      expect(version).toBe('1.0.0');
    });

    it('should get workspace path', () => {
      const mockVscode = require('vscode');
      mockVscode.workspace.workspaceFolders = [
        { uri: { fsPath: '/workspace/path' } },
      ];

      const path = enzymeContext.getWorkspacePath();
      expect(path).toBe('/workspace/path');
    });

    it('should return undefined if no workspace folders', () => {
      const mockVscode = require('vscode');
      mockVscode.workspace.workspaceFolders = undefined;

      const path = enzymeContext.getWorkspacePath();
      expect(path).toBeUndefined();
    });
  });

  describe('Event Management', () => {
    it('should emit and receive events', () => {
      const listener = vi.fn();
      const disposable = enzymeContext.onEvent(listener);

      enzymeContext.emitEvent('test-event');

      expect(listener).toHaveBeenCalledWith('test-event');

      disposable.dispose();
    });

    it('should stop receiving events after disposal', () => {
      const listener = vi.fn();
      const disposable = enzymeContext.onEvent(listener);

      disposable.dispose();
      enzymeContext.emitEvent('test-event');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit workspace changed event', () => {
      const listener = vi.fn();
      enzymeContext.onEvent(listener);

      const mockWorkspace = {
        isEnzymeProject: true,
        features: [],
        routes: [],
      };

      enzymeContext.setWorkspace(mockWorkspace as any);

      expect(listener).toHaveBeenCalledWith('workspace:changed');
    });
  });

  describe('Disposables Management', () => {
    it('should register single disposable', () => {
      const disposable = { dispose: vi.fn() };
      enzymeContext.registerDisposable(disposable);

      expect(mockContext.subscriptions).toContain(disposable);
    });

    it('should register multiple disposables', () => {
      const d1 = { dispose: vi.fn() };
      const d2 = { dispose: vi.fn() };
      const d3 = { dispose: vi.fn() };

      enzymeContext.registerDisposables(d1, d2, d3);

      expect(mockContext.subscriptions).toContain(d1);
      expect(mockContext.subscriptions).toContain(d2);
      expect(mockContext.subscriptions).toContain(d3);
    });
  });

  describe('User Messages', () => {
    it('should show info message', async () => {
      const mockVscode = require('vscode');
      mockVscode.window.showInformationMessage.mockResolvedValue('OK');

      const result = await enzymeContext.showInfo('Test message', 'OK', 'Cancel');

      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Test message',
        'OK',
        'Cancel'
      );
      expect(result).toBe('OK');
    });

    it('should show warning message', async () => {
      const mockVscode = require('vscode');
      mockVscode.window.showWarningMessage.mockResolvedValue('Yes');

      const result = await enzymeContext.showWarning('Warning!', 'Yes', 'No');

      expect(mockVscode.window.showWarningMessage).toHaveBeenCalled();
      expect(result).toBe('Yes');
    });

    it('should show error message', async () => {
      const mockVscode = require('vscode');
      mockVscode.window.showErrorMessage.mockResolvedValue('Retry');

      const result = await enzymeContext.showError('Error!', 'Retry', 'Cancel');

      expect(mockVscode.window.showErrorMessage).toHaveBeenCalled();
      expect(result).toBe('Retry');
    });
  });

  describe('Progress Indicator', () => {
    it('should execute task with progress', async () => {
      const mockVscode = require('vscode');
      mockVscode.window.withProgress.mockImplementation((options, task) => {
        return task({ report: vi.fn() }, { isCancellationRequested: false });
      });

      const result = await enzymeContext.withProgress('Loading...', async () => {
        return 'completed';
      });

      expect(result).toBe('completed');
      expect(mockVscode.window.withProgress).toHaveBeenCalled();
    });
  });

  describe('Diagnostics Management', () => {
    it('should clear all diagnostics', () => {
      const diagnostics = enzymeContext.getDiagnosticCollection();
      const clearSpy = vi.spyOn(diagnostics, 'clear');

      enzymeContext.clearDiagnostics();

      expect(clearSpy).toHaveBeenCalled();
    });

    it('should set diagnostics for a file', () => {
      const mockVscode = require('vscode');
      const uri = mockVscode.Uri.file('/test/file.ts');
      const diagnostics = enzymeContext.getDiagnosticCollection();
      const setSpy = vi.spyOn(diagnostics, 'set');

      const testDiagnostics: any[] = [
        {
          message: 'Test error',
          range: {},
          severity: 0,
        },
      ];

      enzymeContext.setDiagnostics(uri, testDiagnostics);

      expect(setSpy).toHaveBeenCalledWith(uri, testDiagnostics);
    });
  });

  describe('Configuration Management', () => {
    it('should get configuration value', () => {
      const mockVscode = require('vscode');
      const mockConfig = mockVscode.workspace.getConfiguration();
      mockConfig.setConfig('enzyme.test.setting', 'test-value');

      const value = enzymeContext.getConfig('enzyme.test.setting', 'default');

      expect(value).toBe('test-value');
    });

    it('should return default value if config not set', () => {
      const value = enzymeContext.getConfig('enzyme.nonexistent', 'default-value');

      expect(value).toBe('default-value');
    });

    it('should update configuration value', async () => {
      const mockVscode = require('vscode');
      const mockConfig = mockVscode.workspace.getConfiguration();
      const updateSpy = vi.spyOn(mockConfig, 'update');

      await enzymeContext.updateConfig('enzyme.test.setting', 'new-value');

      expect(updateSpy).toHaveBeenCalledWith('enzyme.test.setting', 'new-value', 1);
    });

    it('should update configuration with custom target', async () => {
      const mockVscode = require('vscode');
      const mockConfig = mockVscode.workspace.getConfiguration();
      const updateSpy = vi.spyOn(mockConfig, 'update');

      await enzymeContext.updateConfig(
        'enzyme.test.setting',
        'value',
        mockVscode.ConfigurationTarget.Workspace
      );

      expect(updateSpy).toHaveBeenCalledWith('enzyme.test.setting', 'value', 2);
    });
  });

  describe('Disposal', () => {
    it('should dispose all resources', () => {
      const statusItem = enzymeContext.getStatusBarItem('test');
      const statusDisposeSpy = vi.spyOn(statusItem, 'dispose');

      const outputChannel = enzymeContext.getOutputChannel();
      const channelDisposeSpy = vi.spyOn(outputChannel, 'dispose');

      enzymeContext.dispose();

      expect(statusDisposeSpy).toHaveBeenCalled();
      expect(channelDisposeSpy).toHaveBeenCalled();
    });

    it('should reset singleton instance on dispose', () => {
      enzymeContext.dispose();

      expect(() => {
        EnzymeExtensionContext.getInstance();
      }).toThrow('EnzymeExtensionContext not initialized');
    });

    it('should dispose all status bar items', () => {
      const item1 = enzymeContext.getStatusBarItem('item1');
      const item2 = enzymeContext.getStatusBarItem('item2');

      const spy1 = vi.spyOn(item1, 'dispose');
      const spy2 = vi.spyOn(item2, 'dispose');

      enzymeContext.dispose();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });
});
