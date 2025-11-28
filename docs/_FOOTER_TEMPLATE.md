# Documentation Navigation Footer Template

> **Instructions**: Copy the appropriate footer section below and add it to the end of your documentation file. Replace the placeholder links with actual page references.

---

## Standard Footer (Most Documents)

```markdown
---

## Navigation

**Previous:** [Previous Topic](./previous-topic.md) | **Next:** [Next Topic](./next-topic.md) | **Up:** [Documentation Index](./INDEX.md)

## Related Topics

- [Related Topic 1](./related-1.md) - Brief description
- [Related Topic 2](./related-2.md) - Brief description
- [Related Topic 3](./related-3.md) - Brief description

## Examples

- [Example 1](../src/lib/docs/examples/example-file.md#example-1) - What this example shows
- [Example 2](../src/lib/docs/examples/example-file.md#example-2) - What this example shows

---

<p align="center">
  <strong>Document Title</strong><br>
  Brief tagline or description
</p>
```

---

## Guide Footer (Tutorial/How-To Documents)

```markdown
---

## What You Learned

In this guide, you learned:

- ✅ Concept 1 - Brief description
- ✅ Concept 2 - Brief description
- ✅ Concept 3 - Brief description

## Next Steps

Now that you understand [topic], you can:

1. **[Next Action 1](./next-doc.md)** - What to do next
2. **[Next Action 2](./another-doc.md)** - Alternative path
3. **[Advanced Topic](./advanced-doc.md)** - Deep dive

## Navigation

**Previous:** [Previous Guide](./previous.md) | **Next:** [Next Guide](./next.md) | **Up:** [Guide Index](./INDEX.md)

## Related Resources

- [Core Concept](./concept.md) - Foundational knowledge
- [API Reference](./api.md) - Technical reference
- [Examples](../src/lib/docs/examples/) - Code examples

---

<p align="center">
  <strong>Guide Title</strong><br>
  Step-by-step guide
</p>
```

---

## Reference Footer (API/Technical Reference)

```markdown
---

## See Also

### Related API

- [Related Function](./api.md#related-function) - Description
- [Related Hook](./hooks.md#related-hook) - Description
- [Related Component](./components.md#related-component) - Description

### Guides

- [Usage Guide](./guide.md) - How to use this API
- [Best Practices](./best-practices.md) - Recommended patterns
- [Examples](../src/lib/docs/examples/) - Practical examples

### Architecture

- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Design Patterns](./patterns.md) - Common patterns

## Navigation

**Up:** [API Reference Index](./INDEX.md) | **Home:** [Documentation](./INDEX.md)

---

<p align="center">
  <strong>API Reference</strong><br>
  Technical documentation
</p>
```

---

## Getting Started Footer (Beginner Documents)

```markdown
---

## What's Next?

You've completed the [Document Name]. Here's what to explore next:

### Recommended Path

1. **[Next Doc](./next-doc.md)** - Builds on what you learned
2. **[Core Concept](./concept.md)** - Understand the fundamentals
3. **[Hands-On Tutorial](./tutorial.md)** - Practice with examples

### Alternative Paths

- **Want to learn [Topic]?** → [Related Guide](./guide.md)
- **Need to [Action]?** → [How-To Guide](./howto.md)
- **Looking for examples?** → [Examples Directory](../src/lib/docs/examples/)

## Navigation

**Previous:** [Intro](./intro.md) | **Next:** [Next Steps](./next.md) | **Up:** [Getting Started](./GETTING_STARTED.md)

## Need Help?

- **Questions?** Check the [FAQ](./FAQ.md)
- **Issues?** See [Troubleshooting](./TROUBLESHOOTING.md)
- **Examples?** Browse [Examples](../src/lib/docs/examples/)

---

<p align="center">
  <strong>Getting Started</strong><br>
  Welcome to Harbor React
</p>
```

---

## Minimal Footer (Short Documents)

```markdown
---

## See Also

- [Related Doc 1](./doc1.md)
- [Related Doc 2](./doc2.md)
- [Documentation Index](./INDEX.md)

---
```

---

## Library Documentation Footer (src/lib/docs/)

```markdown
---

## Navigation

**Previous:** [Previous Topic](./previous.md) | **Next:** [Next Topic](./next.md) | **Up:** [Library Index](./INDEX.md)

## Related Library Docs

- [Related Module](./related.md) - Module description
- [Integration Guide](../docs/integration/guide.md) - How to integrate
- [Examples](./examples/) - Code examples

## Template Documentation

- [Template Guide](../../docs/GUIDE.md) - Using this in the template
- [Architecture](../../docs/ARCHITECTURE.md) - How this fits in
- [Configuration](../../docs/CONFIGURATION.md) - Configuration options

---

<p align="center">
  <strong>Harbor React Library</strong><br>
  Internal library documentation
</p>
```

---

## Examples Page Footer

```markdown
---

## More Examples

### In This Category

- [Example 1](#example-1) - Description
- [Example 2](#example-2) - Description
- [Example 3](#example-3) - Description

### Other Categories

- [Auth Examples](./auth-examples.md) - Authentication patterns
- [Routing Examples](./routing-examples.md) - Routing patterns
- [State Examples](./state-examples.md) - State management
- [Performance Examples](./performance-examples.md) - Optimization

## Related Documentation

- [Guide](../GUIDE.md) - Conceptual overview
- [API Reference](../API.md) - Technical reference
- [Best Practices](../BEST_PRACTICES.md) - Recommended patterns

## Contributing Examples

Found a useful pattern? [Contribute an example](../CONTRIBUTING.md)!

---

<p align="center">
  <strong>Harbor React Examples</strong><br>
  Learn by doing
</p>
```

---

## Usage Instructions

### 1. Choose the Right Footer

Select the footer template that matches your document type:
- **Standard** - General documentation
- **Guide** - Tutorial or how-to
- **Reference** - API or technical reference
- **Getting Started** - Beginner-friendly docs
- **Minimal** - Short documents
- **Library** - Internal library docs
- **Examples** - Example collections

### 2. Copy the Template

Copy the markdown from the appropriate section above.

### 3. Customize Links

Replace placeholder links with actual references:
- Update `[Previous Topic](./previous-topic.md)` with the actual previous page
- Update `[Next Topic](./next-topic.md)` with the actual next page
- Add relevant "Related Topics" links
- Link to relevant examples

### 4. Update Metadata

- Change "Document Title" to your actual document title
- Update the tagline to describe your document
- Adjust the center-aligned footer if needed

### 5. Add to Your Document

Paste the customized footer at the end of your document, before the final closing line.

---

## Footer Checklist

Before finalizing your footer:

- [ ] Previous/Next links are correct
- [ ] All links work (no 404s)
- [ ] Related topics are relevant
- [ ] Examples are linked appropriately
- [ ] Document title matches
- [ ] Tagline is descriptive
- [ ] Footer matches document type

---

## Best Practices

### Do's

- ✅ **Link to relevant docs** - Help readers navigate
- ✅ **Provide next steps** - Guide the learning path
- ✅ **Include examples** - Show practical usage
- ✅ **Be consistent** - Use same footer style across similar docs
- ✅ **Test links** - Ensure all links work

### Don'ts

- ❌ **Don't over-link** - 3-5 related links is enough
- ❌ **Don't create circular references** - Avoid A→B→A loops
- ❌ **Don't link to unrelated docs** - Keep it relevant
- ❌ **Don't forget to update** - Keep links current

---

## Examples of Good Footers

### Example 1: Architecture.md

```markdown
---

## See Also

### Core Architecture
- [Streaming Guide](./STREAMING.md) - HTML streaming
- [Hydration Guide](./HYDRATION.md) - Component hydration
- [Performance Guide](./PERFORMANCE.md) - Optimization

### Getting Started
- [Quick Start](./QUICKSTART.md) - 5-minute setup
- [Documentation Index](./INDEX.md) - All docs

---

<p align="center">
  <strong>Harbor React Architecture</strong><br>
  Built for scale and performance
</p>
```

### Example 2: Authentication.md

```markdown
---

## Navigation

**Previous:** [Configuration](./CONFIGURATION.md) | **Next:** [Routing](./ROUTING.md) | **Up:** [Index](./INDEX.md)

## Related Topics

- [RBAC Guide](./RBAC.md) - Role-based access control
- [Security Guide](../../docs/SECURITY.md) - Security best practices
- [API Guide](../../docs/API.md) - API authentication

## Examples

- [Basic Login](./examples/auth-examples.md#basic-login) - Simple auth
- [SSO Integration](./examples/auth-examples.md#sso) - Enterprise SSO

---

<p align="center">
  <strong>Authentication Guide</strong><br>
  Complete auth system reference
</p>
```

---

## See Also

- [Documentation Index](./INDEX.md) - All documentation
- [Contributing Guide](../src/lib/CONTRIBUTING.md) - How to contribute
- [Style Guide](../src/lib/docs/BEST_PRACTICES.md) - Documentation standards

---

<p align="center">
  <strong>Footer Template</strong><br>
  Consistent navigation for all docs
</p>
