/**
 * README Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateReadme(context: TemplateContext): string {
  const { projectName, template, features, packageManager } = context;

  const runCmd = packageManager === 'npm' ? 'npm run' : packageManager;
  const installCmd = packageManager === 'npm' ? 'npm install' : packageManager === 'yarn' ? 'yarn' : `${packageManager} install`;

  return `# ${projectName}

A modern React application built with [Enzyme](https://github.com/harborgrid-justin/enzyme) framework.

## Template

This project was created with the **${template}** template.

## Features

${features.map(f => `- ${f.charAt(0).toUpperCase() + f.slice(1)}`).join('\n')}

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- ${packageManager} (package manager)

### Installation

\`\`\`bash
${installCmd}
\`\`\`

### Development

Start the development server:

\`\`\`bash
${runCmd} dev
\`\`\`

The application will open at [http://localhost:3000](http://localhost:3000).

### Build

Build for production:

\`\`\`bash
${runCmd} build
\`\`\`

### Preview

Preview the production build:

\`\`\`bash
${runCmd} preview
\`\`\`

## Scripts

- \`${runCmd} dev\` - Start development server
- \`${runCmd} build\` - Build for production
- \`${runCmd} preview\` - Preview production build
- \`${runCmd} typecheck\` - Run TypeScript type checking
- \`${runCmd} lint\` - Lint code with ESLint
- \`${runCmd} lint:fix\` - Fix ESLint issues automatically
- \`${runCmd} format\` - Format code with Prettier
- \`${runCmd} format:check\` - Check code formatting

## Project Structure

\`\`\`
${projectName}/
├── public/          # Static assets
├── src/
│   ├── routes/      # Route components
│   ├── components/  # Reusable components
│   ├── config/      # Configuration files
│   ├── providers/   # Provider orchestration
${features.includes('state') ? '│   ├── store/       # State management\n' : ''}${features.includes('auth') ? '│   ├── lib/auth/    # Authentication logic\n' : ''}${features.includes('monitoring') ? '│   ├── lib/monitoring/ # Monitoring utilities\n' : ''}${features.includes('realtime') ? '│   ├── lib/realtime/   # Real-time connections\n' : ''}│   ├── App.tsx      # Root component
│   ├── main.tsx     # Entry point
│   └── index.css    # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
\`\`\`

## Learn More

- [Enzyme Documentation](https://github.com/harborgrid-justin/enzyme)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## License

MIT
`;
}
