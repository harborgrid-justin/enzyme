# Validate Configuration

Enzyme provides real-time validation for configuration and code.

## Configuration Validation

Validates `enzyme.config.ts`:
- **Structure**: Correct config shape
- **Types**: Type safety
- **Required Fields**: All necessary fields present
- **Routes**: Valid route paths
- **Features**: Proper feature definitions
- **Dependencies**: Required packages installed

## Route Validation

Checks route configuration:
- **Path Conflicts**: Duplicate or conflicting paths
- **Components**: Route components exist
- **Loaders**: Loader functions are valid
- **Actions**: Action functions are valid
- **Permissions**: Permission strings are defined
- **Nesting**: Proper route hierarchy

## Feature Validation

Validates feature modules:
- **Config File**: feature.config.ts exists
- **Structure**: Required folders present
- **Dependencies**: Feature dependencies available
- **Exports**: Proper exports in index.ts
- **Tests**: Test coverage

## Validation on Save

Enable automatic validation:
```json
{
  "enzyme.validation.onSave": true,
  "enzyme.validation.strict": false
}
```

## Strict Mode

Strict validation enforces:
- 100% TypeScript coverage
- No `any` types
- Complete JSDoc comments
- Full test coverage
- Accessibility compliance

## Problems Panel

Validation results appear in:
- Problems panel (Ctrl+Shift+M)
- Inline in editor (squiggles)
- Diagnostic Collection

## Quick Fixes

Many issues have automatic fixes:
- Click the light bulb icon
- Press `Ctrl+.` for quick fixes
- Select "Fix all auto-fixable issues"
