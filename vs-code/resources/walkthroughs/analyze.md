# Analyze Your Application

Enzyme provides powerful analysis tools to ensure your application is performant and secure.

## Performance Analysis

Run performance analysis to identify:
- **Bundle Size Issues:** Large dependencies and unused code
- **Render Performance:** Unnecessary re-renders and expensive computations
- **Memory Leaks:** Uncleaned event listeners and subscriptions
- **Load Time:** Critical path optimization opportunities

**Run Analysis:** [Analyze Performance](command:enzyme.analyze.performance)

**Shortcut:** `Ctrl+Alt+E P`

### Performance Monitoring

Open the Performance Monitor for real-time metrics:
- Component render times
- State update frequency
- API call latency
- Memory consumption

[Open Performance Monitor](command:enzyme.panel.showPerformance)

## Security Analysis

Scan for security vulnerabilities:
- **Dependency Vulnerabilities:** Outdated packages with known issues
- **Code Patterns:** Unsafe practices and potential XSS
- **Authentication:** Weak auth configuration
- **Environment Variables:** Exposed secrets

**Run Analysis:** [Analyze Security](command:enzyme.analyze.security)

**Shortcut:** `Ctrl+Alt+E Shift+S`

## Dependency Analysis

Understand your dependency tree:
- Package versions
- Duplicate dependencies
- Unused dependencies
- Update recommendations

**Run Analysis:** [Analyze Dependencies](command:enzyme.analyze.dependencies)

## Validation

Keep your configuration valid:

### Config Validation
Ensure enzyme.config.ts is properly structured:
[Validate Config](command:enzyme.validate.config)

### Route Validation
Check for route conflicts and issues:
[Validate Routes](command:enzyme.validate.routes)

### Feature Validation
Verify feature module integrity:
[Validate Features](command:enzyme.validate.features)

## Diagnostics

Enzyme automatically shows diagnostics in:
- **Problems Panel:** All issues in one place
- **Inline Warnings:** Contextual hints in code
- **Quick Fixes:** One-click solutions

Enable stricter validation in settings for more thorough checks.
