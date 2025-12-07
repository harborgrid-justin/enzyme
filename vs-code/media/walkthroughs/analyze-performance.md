# Monitor Performance

Enzyme includes powerful performance analysis tools to keep your app fast.

## Performance Dashboard

The Performance Dashboard shows:
- **Render Times**: Component render performance
- **Bundle Sizes**: JavaScript bundle analysis
- **API Latency**: Network request timing
- **Memory Usage**: Heap and memory metrics

## Metrics Tracked

### Core Web Vitals
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint
- **FID**: First Input Delay
- **CLS**: Cumulative Layout Shift
- **TTFB**: Time to First Byte

### Custom Metrics
- Component mount/update times
- Route navigation timing
- API request/response times
- State update performance

## Performance Thresholds

Warnings and errors are shown when:
- Component renders > 16ms (warning) or > 50ms (error)
- Bundle size > 250KB (warning) or > 500KB (error)
- API calls > 1s (warning) or > 3s (error)

## Optimization Suggestions

The analyzer provides actionable suggestions:
- **Code Splitting**: Identify large bundles to split
- **Lazy Loading**: Components to lazy load
- **Memoization**: Components that should use React.memo
- **Debouncing**: Functions that need debouncing
- **Caching**: API calls that should be cached

## Performance Profiling

Record and analyze:
1. Start profiling session
2. Interact with your app
3. Stop recording
4. Review flame graph
5. Identify bottlenecks

## Export Reports

Generate detailed reports:
- PDF summary
- JSON data export
- CSV metrics
- Share with team

## Continuous Monitoring

Enable real-time monitoring:
```json
{
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.performance.sampling": 0.1
}
```
