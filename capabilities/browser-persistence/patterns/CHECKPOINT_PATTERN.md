# Pattern: Checkpoint

## Purpose
Create crash-proof checkpoints during work so that session death doesn't lose progress. Post these as comments on the active mission's GitHub Issue.

## When to Use
- After completing a phase or major step
- - Before starting risky or complex operations
  - - When context window is getting large (compaction risk)
    - - When pausing work for any reason
      - - At end of session
       
        - ## Checkpoint Template
       
        - ```markdown
          ## Checkpoint — BBB-[NNN], [date] [time]

          ### Status
          | Phase | Status |
          |-------|--------|
          | [phase name] | COMPLETE / IN PROGRESS / NOT STARTED |

          ### Just Completed
          - [What was just finished]

          ### In Progress
          - [What is currently being worked on]

          ### Next Steps
          1. [Immediate next action]
          2. [Following action]

          ### Files Changed
          - [List of files created/edited since last checkpoint]

          ### Resume From
          [Exact description of where to pick up]
          ```

          ## Key Rules
          - Post checkpoints to the Issue, not just in chat
          - - Include enough context for a zero-knowledge session to resume
            - - Reference exact file paths, not vague descriptions
              - - Checkpoints are additive — never delete previous checkpoints# Checkpoint Pattern
               
                - How to write crash-proof checkpoints that survive session death.
               
                - ## When to Checkpoint
               
                - - After completing a phase or meaningful unit of work
                  - - Before any risky or long operation
                    - - When Shane redirects or pauses work
                      - - When the context window feels large
                        - - Before any potential session end
                         
                          - ## Where to Checkpoint
                         
                          - 1. **Primary:** Comment on the active GitHub Issue
                            2. 2. **Secondary:** Update `bootstrap/ACTIVE_MISSIONS.md`
                               3. 3. **Tertiary:** Add entry to `ledger/SESSION_LOG.md`
                                 
                                  4. ## Checkpoint Comment Format
                                 
                                  5. ```
                                     ## Checkpoint — [DATE] [TIME_APPROX]

                                     **Session:** [SESSION_ID]
                                     **Mission:** [mission name]

                                     ### Completed
                                     - [items done since last checkpoint]

                                     ### Current State
                                     - [what's in progress right now]

                                     ### Next Steps
                                     - [what to do next]

                                     ### Notes
                                     - [anything important]
                                     ```

                                     ## Rules

                                     - Always checkpoint before declaring a phase complete
                                     - - Include links to files created or modified
                                       - - State what a new session would need to do first
                                         - - Keep it concise — this is state, not narrative
