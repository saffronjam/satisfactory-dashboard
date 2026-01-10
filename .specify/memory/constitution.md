<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.0.1 (PATCH: Added prepare-for-commit reference)
Modified principles: N/A
Modified sections:
  - Development Workflow: Updated Pre-Commit Checklist to reference make prepare-for-commit
Added sections: N/A
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ No updates needed (generic)
  - .specify/templates/spec-template.md: ✅ No updates needed (generic)
  - .specify/templates/tasks-template.md: ✅ No updates needed (generic)
Follow-up TODOs: None
-->

# Satisfactory Dashboard Constitution

## Core Principles

### I. Type Safety First

All data flowing between frontend and backend MUST be type-safe. Go structs define the
source of truth for all API models. TypeScript types MUST be auto-generated from Go
structs using `tygo`. Manual type definitions for API data are forbidden.

**Enforcement**: Run `make generate` after ANY changes to Go model structs in
`api/models/`. Frontend code MUST import types from `apiTypes.ts`.

### II. Clean Code, No Dead Weight

Code MUST be kept current and clean. The following practices are REQUIRED:

- **No deprecated code**: Never mark code as deprecated. Remove it or update it.
- **No commented-out code**: Delete unused code; version control preserves history.
- **No unnecessary inline comments**: Code should be self-documenting through clear
  naming. Only add comments when logic is genuinely non-obvious.
- **No TODO/FIXME sprawl**: Address issues immediately or create tracked issues.

**Rationale**: Dead code creates confusion, increases cognitive load, and misleads
future developers about what is actually used.

### III. Function Documentation

All exported functions and public methods MUST have documentation comments:

- **Go**: All exported functions, methods, and types require godoc comments starting
  with the symbol name (e.g., `// ListCircuits fetches power circuit data`).
- **TypeScript/React**: All exported functions and components require JSDoc comments
  describing purpose and parameters.

Documentation describes WHAT and WHY, not HOW. Implementation details belong in code.

### IV. Backend as Source of Truth

The Go backend is the authoritative source for all application state. The frontend
receives state updates via Server-Sent Events (SSE) and MUST NOT maintain independent
state that contradicts backend data.

**Architecture flow**:
1. FRM API → API Poller → Redis Cache → SSE Stream → Frontend
2. User actions → Frontend → API endpoints → Backend state → SSE broadcast

### V. Format and Lint Always

All code MUST pass linting and formatting checks before commit. Run from project root:

```bash
make lint      # Run all linters (golangci-lint, oxlint)
make format    # Format all code (gofmt, goimports, oxfmt)
```

**Go standards**: Use `gofmt` and `goimports`. Check all errors immediately. Keep happy
path left-aligned (return early). Use proper naming conventions (mixedCaps, no
underscores in names).

**TypeScript standards**: Use oxlint and oxfmt. Follow React best practices with hooks.
Use functional components exclusively.

### VI. Interface-Driven Design

Backend services MUST use interface-driven design for testability:

- Define interfaces in `service/client/` for all external dependencies
- Implement real clients in `service/frm_client/`
- Implement mock clients in `service/mock_client/`
- Use dependency injection to swap implementations

This enables testing without external dependencies and mock mode for development.

### VII. Consistent API Patterns

All API endpoints MUST follow established patterns:

- **Routing**: Implement `RoutingGroup` interface in `routers/routes/`
- **Handlers**: Use `RequestContext` for consistent response formatting
- **Documentation**: Add Swagger annotations to all handlers
- **Regeneration**: Run `swag init` in `api/` after adding/modifying endpoints

Response patterns:
- Success: `requestContext.Ok(data)`
- User error: `requestContext.UserError(message)`
- Server error: `requestContext.ServerError(message)`

### VIII. Simplicity Over Abstraction

Apply YAGNI (You Aren't Gonna Need It) principles:

- Don't add features beyond current requirements
- Don't create abstractions for single-use cases
- Don't add error handling for impossible scenarios
- Don't design for hypothetical future requirements
- Prefer explicit code over clever indirection

Three similar lines of code are better than a premature abstraction.

## Code Quality Standards

### File Organization

**Backend (Go)**:
```
api/
├── cmd/           # App initialization
├── models/        # Domain models (source of truth for types)
├── routers/       # HTTP handlers and routing
├── service/       # Business logic with interface-driven design
├── pkg/           # Shared infrastructure (config, db, logging)
└── worker/        # Background workers
```

**Frontend (TypeScript/React)**:
```
dashboard/src/
├── pages/         # Route-level page components
├── sections/      # Feature-specific components
├── components/    # Reusable UI components
├── contexts/      # React Context providers
├── services/      # API service functions
├── hooks/         # Custom React hooks
└── utils/         # Utility functions
```

### Naming Conventions

- **Go**: mixedCaps for exports, lowercase for internal. No underscores in names.
- **TypeScript**: camelCase for variables/functions, PascalCase for components/types.
- **Files**: kebab-case for TypeScript files, snake_case for Go files.

### Error Handling

- **Go**: Check errors immediately after calls. Return early on errors. Use
  `fmt.Errorf("context: %w", err)` for error wrapping.
- **TypeScript**: Handle loading and error states in all data-fetching components.
  Use MUI Alert components for error display.

## Development Workflow

### Adding New Features

1. **Backend**: Add model in `models/models/`, handler in `routers/api/v1/`, route in
   `routers/routes/`
2. **Type sync**: Run `make generate` (CRITICAL)
3. **Frontend**: Use generated types from `apiTypes.ts`, create components
4. **Quality**: Run `make lint` and `make format`
5. **Documentation**: Update Swagger with `swag init` in `api/`

### Pre-Commit Checklist

Run `make prepare-for-commit` to execute generate, format, and lint in one command.

- [ ] `make prepare-for-commit` passes with no errors
- [ ] No deprecated code introduced
- [ ] No unnecessary comments added
- [ ] All exported functions documented
- [ ] Types imported from `apiTypes.ts` (not manually defined)

### Testing

- Set `mock: true` in config for development with mock data
- Backend uses interface-driven design enabling unit tests with mock clients
- Frontend relies on backend as source of truth; test components in isolation

## Governance

This constitution establishes non-negotiable standards for the Satisfactory Dashboard
project. All contributors MUST comply with these principles.

### Amendment Process

1. Propose changes via pull request modifying this file
2. Document rationale for changes in PR description
3. Require review and approval from project maintainers
4. Update version according to semantic versioning:
   - MAJOR: Principle removals or fundamental changes
   - MINOR: New principles or material expansions
   - PATCH: Clarifications and wording fixes

### Compliance

- All PRs MUST be reviewed for constitution compliance
- Code review checklists SHOULD reference relevant principles
- Automated linting enforces formatting and basic quality standards
- Manual review enforces documentation and architectural standards

### Runtime Guidance

For detailed implementation patterns, refer to:
- `CLAUDE.md` - Project overview and quick start
- `api/CLAUDE.md` - Backend architecture and patterns
- `dashboard/CLAUDE.md` - Frontend architecture and patterns

**Version**: 1.0.1 | **Ratified**: 2026-01-10 | **Last Amended**: 2026-01-10
