# Security Specifications & Audit Declarations

## Development Dependencies Advisory Override

When running `npm audit`, you may encounter the following transitive vulnerability warnings originating from the `vite` and `esbuild` development server stacks:
- **`esbuild` (< 0.24.2)**: Moderate - Development server context cross-origin validation flaw.
- **`nanoid` (< 3.3.17)**: High - Index generation infinite loop flaw inside internal `postcss` hashing tools.

### Operational Guidelines
> [!WARNING]  
> **DO NOT RUN `npm audit fix --force` UNDER ANY CIRCUMSTANCES.**  
> Running a forced audit modification pass inside this monorepo workspace environment will break package tree resolution parameters by trying to downgrade Vite components to incompatible baseline targets.

### Impact Analysis
These advisory components are exclusively utilized within the local development environment pipeline tools. They are completely excluded from final compiled distribution assets (`/packages/frontend/dist`), posing **zero risk** to production builds or external end users. The packages will automatically resolve once upstream ecosystem updates are pushed by the Vite maintenance teams.
