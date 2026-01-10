#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "$@" >&2
}

show_help() {
  cat << 'EOF'
Usage: ralph.sh <feature>

Execute the next uncompleted task from a spec-kit feature's tasks.md file.

Arguments:
  <feature>    The feature folder name (e.g., 001-access-key-auth)

Examples:
  # List available features
  ls ./specs

  # Run the next task for a feature
  ./ralph.sh 001-access-key-auth

Description:
  Ralph reads the tasks.md file for the specified feature and instructs Claude
  to complete exactly ONE uncompleted task, mark it as done, then exit.

  Claude will:
  1. Read the project constitution at .specify/memory/constitution.md
  2. Review other design documents in the feature folder
  3. Complete the next unchecked task (- [ ])
  4. Mark it complete (- [x])
  5. Exit

Requirements:
  - Claude CLI (claude command in PATH or ~/.claude/local/claude)
  - Feature folder must exist in ./specs/<feature>/
  - Feature must have a tasks.md file
EOF
  exit 0
}

# Parse arguments
if [[ $# -lt 1 ]]; then
  log "Error: Missing feature argument"
  log "Usage: ralph.sh <feature>"
  log ""
  log "Available features:"
  ls -1 ./specs 2>/dev/null || log "  (no specs folder found)"
  exit 1
fi

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  show_help
fi

FEATURE="$1"

# Find Claude CLI
CLAUDE_CMD=""
if command -v claude &>/dev/null; then
  CLAUDE_CMD="claude"
elif [ -x "$HOME/.claude/local/claude" ]; then
  CLAUDE_CMD="$HOME/.claude/local/claude"
else
  log "Error: Claude CLI not found"
  log "       Not in PATH and not at ~/.claude/local/claude"
  log "       Install Claude Code first."
  exit 1
fi

# Validate feature folder exists
FEATURE_DIR="./specs/$FEATURE"
if [ ! -d "$FEATURE_DIR" ]; then
  log "Error: Feature folder not found: $FEATURE_DIR"
  log ""
  log "Available features:"
  ls -1 ./specs 2>/dev/null || log "  (no specs folder found)"
  exit 1
fi

# Validate tasks.md exists
TASKS_FILE="$FEATURE_DIR/tasks.md"
if [ ! -f "$TASKS_FILE" ]; then
  log "Error: tasks.md not found: $TASKS_FILE"
  log ""
  log "Run /speckit.tasks first to generate the task list."
  exit 1
fi

# Check if there are any uncompleted tasks
if ! grep -q '^- \[ \]' "$TASKS_FILE"; then
  log "All tasks in $TASKS_FILE are complete!"
  log ""
  log "Remaining unchecked tasks: 0"
  exit 0
fi

# Count remaining tasks
REMAINING=$(grep -c '^- \[ \]' "$TASKS_FILE" || echo "0")
log "Feature: $FEATURE"
log "Remaining tasks: $REMAINING"
log ""

# Build the prompt
PROMPT="You are completing tasks from a spec-kit feature implementation.

CRITICAL RULES:
1. Complete ONLY ONE task - the next unchecked task (- [ ]) in the task list
2. After completing the task, mark it as done by changing '- [ ]' to '- [x]'
3. Then EXIT immediately - do not continue to the next task
4. Follow the project constitution strictly

CONSTITUTION:
Read and follow the project constitution at: .specify/memory/constitution.md

FEATURE CONTEXT:
Review the design documents in the feature folder: $FEATURE_DIR/
- spec.md: Feature specification and user stories
- plan.md: Implementation plan and technical context
- research.md: Technical decisions (if exists)
- data-model.md: Data structures (if exists)
- contracts/: API contracts (if exists)

TASK LIST:
Read the task list at: $TASKS_FILE

EXECUTION:
1. Read the constitution first
2. Read the task list and find the FIRST unchecked task (- [ ])
3. Read relevant design documents for context
4. Implement that ONE task completely
5. Update $TASKS_FILE to mark the task as done: change '- [ ]' to '- [x]'
6. Run 'make prepare-for-commit' if you modified code
7. EXIT - do not proceed to the next task

Now begin. Find and complete the next unchecked task."

# Run Claude
log "Starting Claude to complete next task..."
log "========================================"
echo "$PROMPT" | "$CLAUDE_CMD" --dangerously-skip-permissions -p
