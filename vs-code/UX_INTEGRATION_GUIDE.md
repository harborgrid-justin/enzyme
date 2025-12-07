# UX Enhancements - Quick Integration Guide

This guide shows how to integrate the new UX utilities into the existing codebase.

## Step 1: Import UX Utilities

Add to `/home/user/enzyme/vs-code/src/extension.ts`:

```typescript
import { UXUtils } from './core/ux-utils';
import { registerKeyboardShortcutsCommand } from './core/keyboard-shortcuts';
import { tooltipProvider } from './core/tooltip-provider';
```

## Step 2: Initialize UX Utilities in Extension Activation

Update `initializeFullFunctionality()`:

```typescript
async function initializeFullFunctionality(context: vscode.ExtensionContext): Promise<void> {
  const enzymeContext = EnzymeExtensionContext.initialize(context);

  // Initialize UX utilities
  const uxUtils = new UXUtils(enzymeContext);

  // Register keyboard shortcuts command
  enzymeContext.registerDisposable(registerKeyboardShortcutsCommand(context));

  // Register commands with UX error handling
  registerCommands(enzymeContext, uxUtils);

  // ... rest of initialization
}
```

## Step 3: Update Command Registration

Modify `registerCommands()` signature and usage:

```typescript
function registerCommands(
  enzymeContext: EnzymeExtensionContext,
  uxUtils: UXUtils
): void {
  // Wrap commands with enhanced error handling
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(
      COMMANDS.GENERATE_COMPONENT,
      wrapCommandHandler(
        COMMANDS.GENERATE_COMPONENT,
        async () => {
          // Command implementation
        },
        uxUtils
      )
    )
  );

  // Repeat for all commands...
}
```

## Step 4: Update Command Wrapper

Modify `wrapCommandHandler()`:

```typescript
function wrapCommandHandler(
  commandId: string,
  handler: (...args: unknown[]) => Promise<void>,
  uxUtils: UXUtils
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      // Track feature usage
      await uxUtils.firstRun.markFeatureUsed(commandId);

      await handler(...args);
    } catch (error) {
      // Use enhanced error handling
      await uxUtils.errors.handleError(error, `Command '${commandId}'`);
    }
  };
}
```

## Step 5: Add First-Run Experience

Add after workspace initialization:

```typescript
// Handle first-run experience
async function handleFirstRunExperience(
  enzymeContext: EnzymeExtensionContext,
  uxUtils: UXUtils
): Promise<void> {
  const isEnzymeWorkspace = await detectEnzymeProject();
  await uxUtils.initialize(isEnzymeWorkspace);
}

// Call during activation
setImmediate(async () => {
  await handleFirstRunExperience(enzymeContext, uxUtils);
});
```

## Step 6: Use Progress Indicators

Replace existing progress calls:

```typescript
// OLD:
await enzymeContext.withProgress('Loading...', async (progress) => {
  // work
});

// NEW:
await uxUtils.progress.withProgress(
  {
    title: 'Loading Enzyme project',
    cancellable: true,
    initialMessage: 'Scanning files...'
  },
  async (progress, token) => {
    progress.report({ message: 'Analyzing...', increment: 25 });
    // work
    progress.report({ message: 'Complete', increment: 100 });
  }
);
```

## Step 7: Enhance Status Bar Items

Update status bar tooltips:

```typescript
const statusBarItem = enzymeContext.getStatusBarItem('enzyme-status', {
  text: '$(beaker) Enzyme',
  tooltip: tooltipProvider.getStatusBarTooltip(
    'Enzyme Framework',
    `v${workspace.enzymeVersion}\nClick for documentation`,
    COMMANDS.DOCS_OPEN
  ),
  command: COMMANDS.DOCS_OPEN,
});
```

## Step 8: Add Package.json Command

Add to `/home/user/enzyme/vs-code/package.json` commands array:

```json
{
  "command": "enzyme.showKeyboardShortcuts",
  "title": "Show Keyboard Shortcuts",
  "category": "Enzyme",
  "icon": "$(keyboard)"
}
```

## Step 9: Test Integration

Run these tests:
1. Fresh install → verify welcome experience
2. Trigger error → verify actionable message
3. Long operation → verify progress indicator
4. Hover over commands → verify tooltips
5. Press `Ctrl+Alt+E ?` → verify shortcuts quick pick

## Step 10: Optional Enhancements

### Add Contextual Tips

```typescript
// Show tip when user opens empty project
if (workspace.features.length === 0) {
  await uxUtils.help.showQuickTip(
    'empty-project',
    'Start by creating your first feature with Ctrl+Alt+E F',
    [
      {
        label: 'Create Feature',
        action: async () => {
          await vscode.commands.executeCommand('enzyme.generate.feature');
        }
      }
    ]
  );
}
```

### Enhanced Error Examples

```typescript
// Instead of:
throw new Error('Component generation failed');

// Use:
await uxUtils.errors.showActionableError({
  message: 'Failed to generate component',
  details: 'Component name already exists',
  actions: [
    {
      label: 'Choose Different Name',
      action: async () => {
        await vscode.commands.executeCommand('enzyme.generate.component');
      },
      primary: true
    },
    {
      label: 'Open Existing Component',
      action: async () => {
        const uri = vscode.Uri.file(existingComponentPath);
        await vscode.window.showTextDocument(uri);
      }
    }
  ],
  docsUrl: `${URLS.DOCUMENTATION}/guides/generating-components`
});
```

## Complete Example: Enhanced Command

```typescript
async function handleGenerateFeature(
  enzymeContext: EnzymeExtensionContext,
  uxUtils: UXUtils
): Promise<void> {
  try {
    // Get feature name from user
    const featureName = await vscode.window.showInputBox({
      prompt: 'Enter feature name',
      placeHolder: 'user-authentication',
      validateInput: (value) => {
        if (!value) return 'Feature name is required';
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return null;
      }
    });

    if (!featureName) return;

    // Generate with progress
    await uxUtils.progress.withProgress(
      {
        title: `Generating Feature: ${featureName}`,
        cancellable: true
      },
      async (progress, token) => {
        progress.report({ message: 'Creating directory structure...', increment: 20 });
        await createDirectories(featureName);

        if (token.isCancellationRequested) {
          throw new Error('Generation cancelled by user');
        }

        progress.report({ message: 'Generating components...', increment: 40 });
        await generateComponents(featureName);

        progress.report({ message: 'Creating routes...', increment: 60 });
        await createRoutes(featureName);

        progress.report({ message: 'Setting up state...', increment: 80 });
        await setupState(featureName);

        progress.report({ message: 'Complete!', increment: 100 });
      }
    );

    // Success feedback
    const result = await vscode.window.showInformationMessage(
      `✅ Feature "${featureName}" generated successfully!`,
      'Open Feature',
      'Add Another',
      'View Dashboard'
    );

    // Handle user choice
    if (result === 'Open Feature') {
      const uri = vscode.Uri.file(`${workspaceRoot}/features/${featureName}`);
      await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
    } else if (result === 'Add Another') {
      await handleGenerateFeature(enzymeContext, uxUtils);
    } else if (result === 'View Dashboard') {
      await vscode.commands.executeCommand('enzyme.panel.showFeatureDashboard');
    }

    // Track usage
    await uxUtils.firstRun.markFeatureUsed('generate.feature');

    // Show helpful tip for first feature
    const features = await getProjectFeatures();
    if (features.length === 1) {
      await uxUtils.help.showQuickTip(
        'first-feature-created',
        'Great! Now add routes and components to your feature',
        [
          {
            label: 'Learn More',
            action: async () => {
              await uxUtils.help.showFeatureHelp('features');
            }
          }
        ]
      );
    }

  } catch (error) {
    // Enhanced error handling
    await uxUtils.errors.handleError(error, 'Feature generation');
  }
}
```

---

## Summary

The new UX utilities provide:

1. **`uxUtils.firstRun`** - First-run detection and onboarding
2. **`uxUtils.progress`** - Progress indicators and loading states
3. **`uxUtils.errors`** - Actionable error messages
4. **`uxUtils.help`** - Contextual help and tips
5. **`tooltipProvider`** - Rich tooltips for UI elements
6. **`keyboard-shortcuts`** - Keyboard shortcut utilities

All modules are fully documented with JSDoc and include usage examples.
