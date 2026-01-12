---
name: speckit-context
description: Read and understand spec-kit feature documentation. Use when the user mentions spec-kit features, tasks from specs folders, feature branches (like 001-access-key-auth or 002-redis-poll-lease), or asks to work on tasks from ./specs.
allowed-tools: Read, Grep, Glob
---

# Spec-Kit Feature Context

This skill teaches you how to properly read and understand spec-kit features in this repository. Spec-kit is a structured approach to feature planning and implementation using design artifacts.

## When to Use This Skill

Use this skill when:
- User mentions a feature by its number (e.g., "002-redis-poll-lease")
- User asks you to work on tasks from a spec
- User references the ./specs folder
- User asks about the current feature or implementation plan
- You need to understand the context before implementing a task

## Critical Rule: Constitution First

**ALWAYS** read the project constitution before working on ANY spec-kit feature:

```
.specify/memory/constitution.md
```

The constitution defines:
- Core principles (Type Safety, Clean Code, Documentation requirements)
- Code quality standards
- Development workflow
- Pre-commit checklist
- Architectural patterns

All implementation work MUST comply with the constitution.

## Spec-Kit Feature Structure

Features are organized in `./specs/<feature-name>/` with the following structure:

### Core Documents (Read These First)

1. **spec.md** - Feature specification
   - Overview and core principles
   - User stories with acceptance criteria
   - Priority levels (P1, P2, etc.)
   - Test scenarios

2. **plan.md** - Implementation plan
   - Technical approach
   - Architecture decisions
   - File changes required
   - Dependencies and risks

3. **tasks.md** - Task checklist
   - Ordered list of implementation tasks
   - Checkbox format: `- [ ]` (unchecked) or `- [x]` (completed)
   - Critical for tracking progress

### Supporting Documents (Read as Needed)

4. **research.md** - Technical research and decisions
   - Technology choices and rationale
   - Alternative approaches considered
   - Implementation details

5. **data-model.md** - Data structures
   - Database schemas
   - API models
   - Type definitions

6. **contracts/** - API contracts and interfaces
   - OpenAPI specs
   - Go interface definitions
   - Contract examples

7. **checklists/** - Validation checklists
   - Requirements verification
   - Quality gates
   - Testing checklists

8. **quickstart.md** - Quick reference
   - Common commands
   - Development workflow
   - Testing procedures

## How to Read Spec-Kit Features

Follow this sequence when approaching a spec-kit feature:

### Step 1: Identify the Feature

If the user mentions a feature number or branch name, locate it:

```bash
ls ./specs
```

Feature folders follow the pattern: `<number>-<feature-name>` (e.g., `002-redis-poll-lease`)

### Step 2: Read the Constitution

**MANDATORY FIRST STEP** - Read the constitution to understand project principles:

```
.specify/memory/constitution.md
```

Pay special attention to:
- Type Safety First (Principle I)
- Clean Code, No Dead Weight (Principle II)
- Function Documentation (Principle III)
- Backend as Source of Truth (Principle IV)

### Step 3: Read Core Documents

Read these documents in order:

1. **Read spec.md** - Understand WHAT needs to be built and WHY
   - Focus on user stories and acceptance criteria
   - Note priority levels
   - Understand success metrics

2. **Read plan.md** - Understand HOW it will be built
   - Review technical approach
   - Identify affected files
   - Understand dependencies

3. **Read tasks.md** - Understand current progress
   - Find the next unchecked task: `- [ ]`
   - Review completed tasks for context: `- [x]`
   - Understand task dependencies

### Step 4: Read Supporting Documents (As Needed)

Based on the specific task, read relevant supporting documents:

- For data structure questions → read **data-model.md**
- For API contract questions → read **contracts/**
- For technology choices → read **research.md**
- For quick commands → read **quickstart.md**

### Step 5: Implement Following Constitution

When implementing:

1. Follow all constitution principles
2. Run `make generate` after changing Go structs
3. Use generated types from `apiTypes.ts` (never manual types)
4. Document all exported functions
5. Run `make prepare-for-commit` before finishing

## Working with Tasks

### Finding Tasks

Tasks are in `./specs/<feature-name>/tasks.md` using checkbox format:

```markdown
- [ ] Unchecked task (not started)
- [x] Completed task (done)
```

### Completing Tasks

When implementing a task:

1. Read constitution and feature context (following steps above)
2. Complete the task following all principles
3. Update tasks.md: change `- [ ]` to `- [x]` for completed task
4. Run `make prepare-for-commit`
5. Do NOT continue to next task unless explicitly asked

### Task Completion Rule

**CRITICAL**: Complete ONE task at a time. After marking a task complete, EXIT unless the user explicitly asks to continue to the next task.

## Ralph Script Integration

This repository includes `ralph.sh` for automated task execution. Ralph loops through tasks one at a time, following the same pattern:

```bash
./ralph.sh <feature-name>
```

Ralph instructs Claude to:
1. Read constitution
2. Find next unchecked task
3. Read design documents
4. Implement ONE task
5. Mark it complete
6. Exit (Ralph handles the loop)

When working with Ralph, follow the same principles but be aware that Ralph manages the task loop.

## Example Usage

### User asks: "Work on 002-redis-poll-lease"

Your response should:
1. Use this skill to understand the feature context
2. Read `.specify/memory/constitution.md`
3. Read `./specs/002-redis-poll-lease/spec.md`
4. Read `./specs/002-redis-poll-lease/plan.md`
5. Read `./specs/002-redis-poll-lease/tasks.md`
6. Ask the user which task to work on (or find the next unchecked task)

### User asks: "Complete the next task in the lease feature"

Your response should:
1. Use this skill to find and read feature documents
2. Read constitution first
3. Read tasks.md to find next `- [ ]` task
4. Read supporting documents relevant to that task
5. Implement the task following constitution
6. Mark task complete in tasks.md
7. Run `make prepare-for-commit`

## Common Patterns

### Multi-Instance Coordination
Features like distributed polling use Redis for coordination. Check research.md and data-model.md for patterns.

### Type Generation
All Go structs in `api/models/` generate TypeScript types. Always run `make generate` after struct changes.

### Interface-Driven Design
Backend uses interfaces for testability. Check `service/client/` for interfaces, `service/frm_client/` for real implementations, `service/mock_client/` for mocks.

## References

- Constitution: `.specify/memory/constitution.md`
- Templates: `.specify/templates/`
- Scripts: `.specify/scripts/bash/`
- Ralph automation: `./ralph.sh`
- Project overview: `./CLAUDE.md`
- Backend patterns: `./api/CLAUDE.md`
- Frontend patterns: `./dashboard/CLAUDE.md`

## Summary

When working with spec-kit features:
1. ✅ ALWAYS read constitution FIRST
2. ✅ Read spec.md → plan.md → tasks.md in order
3. ✅ Read supporting docs as needed
4. ✅ Complete ONE task at a time
5. ✅ Follow all constitution principles
6. ✅ Run `make prepare-for-commit` before finishing
7. ✅ Mark tasks complete in tasks.md

This structured approach ensures you have complete context before implementing and that all work follows project standards.
