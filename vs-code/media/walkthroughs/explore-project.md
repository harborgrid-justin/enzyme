# Explore Project Structure

The Enzyme Explorer provides a visual overview of your entire project structure.

## Explorer Views

### Features View
Browse all feature modules with:
- Feature name and version
- Enabled/disabled status
- Component count
- Route count

### Routes View
Hierarchical view of your application routes:
- Route paths
- Protected routes (🔒)
- Loader/Action indicators
- Nested routes shown as tree

### Components View
All React components organized by:
- Pages
- Features
- Shared components
- Layouts

### State Stores View
Zustand stores with:
- Store name
- State shape preview
- Actions list
- Persistence status

### API Clients View
API integrations showing:
- Client name
- Base URL
- Available endpoints
- Request/response types

### Performance View
Real-time performance metrics:
- Component render times
- Bundle sizes
- API latency
- Memory usage

## Quick Actions

Right-click any item for:
- **Open File**: Jump to the source code
- **Generate Test**: Create test file
- **Show References**: Find all usages
- **Analyze**: Get detailed analysis

## Refresh

The explorer auto-refreshes on file changes. Manual refresh:
- Click the refresh icon in the view title
- Use command: `Enzyme: Refresh Explorer`
