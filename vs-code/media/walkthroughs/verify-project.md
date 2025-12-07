# Verify Your Enzyme Project

The Enzyme extension automatically activates when it detects an Enzyme project in your workspace.

## Detection Criteria

The extension looks for:

- **Config Files**: `enzyme.config.ts` or `enzyme.config.js`
- **Dependencies**: `@missionfabric-js/enzyme` in package.json
- **Directory**: `.enzyme/` folder in your project root

## Status Indicator

Look for the Enzyme status bar item in the bottom right:
- 🧪 Enzyme - Indicates an active Enzyme project
- Click it to open documentation

## Troubleshooting

If Enzyme isn't detected:
1. Ensure you have an enzyme config file
2. Check that Enzyme is in your dependencies
3. Try reloading the window (`Ctrl+Shift+P` > "Reload Window")
