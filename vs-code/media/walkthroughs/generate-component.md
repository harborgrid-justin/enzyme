# Generate Components

Create React components with full TypeScript support and best practices built-in.

## Component Generator

The component generator creates:
- **TypeScript Interface**: Props definition
- **Component Function**: Functional or arrow function style
- **Styling**: Integrated with your chosen CSS framework
- **Exports**: Named and default exports
- **Tests**: Optional test file with Vitest or Jest

## Generator Options

Choose:
- **Name**: Component name (PascalCase recommended)
- **Location**: Where to create the component
- **Style**: Function declaration or arrow function
- **Props**: Define component props interactively
- **Tests**: Include test file
- **Stories**: Include Storybook story (optional)

## Example Output

```typescript
import React from 'react';

interface UserCardProps {
  name: string;
  email: string;
  role?: string;
}

export function UserCard({ name, email, role }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      {role && <span>{role}</span>}
    </div>
  );
}

export default UserCard;
```

## Best Practices

- Use descriptive names
- Keep components small and focused
- Define prop types with TypeScript
- Include test coverage
