#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "$@" >&2
}

show_help() {
  cat << 'EOF'
Usage: ralph.sh <feature>

Execute tasks from a spec-kit feature's tasks.md file in a loop until complete.

Arguments:
  <feature>    The feature folder name (e.g., 001-access-key-auth)

Examples:
  # List available features
  ls ./specs

  # Run tasks for a feature (loops until all complete)
  ./ralph.sh 001-access-key-auth

Description:
  Ralph reads the tasks.md file for the specified feature and instructs Claude
  to complete tasks one at a time, looping until all tasks are done.

  The loop continues until Claude creates a DONE file (when all tasks complete).
  When DONE is detected, the loop ends and the file is deleted.

  Claude will:
  1. Read the project constitution at .specify/memory/constitution.md
  2. Review other design documents in the feature folder
  3. Complete the next unchecked task (- [ ])
  4. Mark it complete (- [x])
  5. Exit (or create DONE file if all tasks are complete)

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
DONE_FILE="./DONE"

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

# Clean up any stale DONE file
rm -f "$DONE_FILE"

# Loop counter
ITERATION=0

while true; do
  ITERATION=$((ITERATION + 1))

  # Check if DONE file exists (created by Claude)
  if [ -f "$DONE_FILE" ]; then
    log ""
    log "========================================"
    log "DONE file detected! All tasks complete."
    log "========================================"
    rm -f "$DONE_FILE"
    exit 0
  fi

  # Check if there are any uncompleted tasks
  if ! grep -q '^- \[ \]' "$TASKS_FILE"; then
    log ""
    log "========================================"
    log "All tasks in $TASKS_FILE are complete!"
    log "========================================"
    exit 0
  fi

  # Count remaining tasks
  REMAINING=$(grep -c '^- \[ \]' "$TASKS_FILE" || echo "0")
  log ""
  log "========================================"
  log "Iteration: $ITERATION"
  log "Feature: $FEATURE"
  log "Remaining tasks: $REMAINING"
  log "========================================"

  # Build the prompt
  PROMPT="You are completing tasks from a spec-kit feature implementation.

CRITICAL RULES:
1. Complete ONLY ONE task - the next unchecked task (- [ ]) in the task list
2. After completing the task, mark it as done by changing '- [ ]' to '- [x]'
3. Then EXIT immediately - do not continue to the next task
4. Follow the project constitution strictly
5. If ALL tasks are complete (no more '- [ ]' remain), create an empty file called 'DONE' in the project root and exit

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
3. If NO unchecked tasks remain, create an empty 'DONE' file with: touch DONE
4. Read relevant design documents for context
5. Implement that ONE task completely
6. Update $TASKS_FILE to mark the task as done: change '- [ ]' to '- [x]'
7. Run 'make prepare-for-commit' if you modified code
8. EXIT - do not proceed to the next task

Now begin. Find and complete the next unchecked task."

  # Run Claude
  log "Starting Claude to complete next task..."
  echo "$PROMPT" | "$CLAUDE_CMD" --dangerously-skip-permissions -p

  # Small delay between iterations
  sleep 2
done
