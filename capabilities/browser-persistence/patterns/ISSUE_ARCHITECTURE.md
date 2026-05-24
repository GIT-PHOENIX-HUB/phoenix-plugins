# Issue Architecture Pattern

How Browser uses GitHub Issues as persistence layers and execution plans.

## Structure

Every major mission gets a GitHub Issue that serves as both the plan and the living state document.

### Header Section
- Title: Clear, descriptive, includes mission identifier
- - Metadata: Author, date, location, authority references
 
  - ### Authority Section
  - - Execution sequence authority (which Issue drives the order)
    - - Current inventory authority (live remote, not stale docs)
      - - Architecture target (design goals, context only)
       
        - ### Execution Plan
        - - Numbered phases with checkboxes
          - - Each phase has clear entry/exit criteria
            - - Preflight steps before any destructive action
              - - Discrepancy-stop rules for safety
               
                - ### Embedded Prompts
                - - Agent startup prompts embedded directly in the Issue
                  - - Include all context the agent needs to begin
                    - - Add verification gates between phases
                     
                      - ### Session Log
                      - - Append session summaries as the work progresses
                        - - Record who did what and when
                          - - Note any deviations from the plan
                           
                            - ## Examples
                           
                            - - [Build Ledger Issue #8](https://github.com/GIT-PHOENIX-HUB/build-ledger/issues/8) — Toolbox build execution plan
                              - - [Phoenix Toolbox Issue #4](https://github.com/GIT-PHOENIX-HUB/phoenix-toolbox/issues/4) — Browser persistence founding document# Pattern: Issue Architecture
                               
                                - ## Purpose
                                - Structure GitHub Issues as persistence layers that survive session death. Every Issue BBB creates should be a complete, self-contained document that any future session can use to resume work.
                               
                                - ## Structure Template
                               
                                - ```markdown
                                  # [Issue Title]

                                  ## Authority
                                  - **Execution sequence:** [which document governs order of work]
                                  - **Current inventory:** [where to find live state]
                                  - **Architecture target:** [reference document for target structure]

                                  ## Game Plan
                                  - [ ] Phase/Step 1: [description]
                                  - [ ] Phase/Step 2: [description]
                                  ...

                                  ## Embedded Prompts
                                  [Ready-to-copy prompts for Echo or other agents]

                                  ## Session Log
                                  | Date | Session | Summary |
                                  |------|---------|---------|
                                  | [date] | BBB-NNN | [what happened] |

                                  ## Recovery
                                  If Chrome crashes or session resets:
                                  1. Read this Issue from the top
                                  2. Check which boxes are checked
                                  3. Verify remote state matches checked items
                                  4. Continue from first unchecked box
                                  ```

                                  ## Examples in Use
                                  - **build-ledger Issue #8** — Toolbox build execution plan
                                  - - **phoenix-toolbox Issue #4** — Browser persistence founding document
                                    - - **phoenix-toolbox Issue #3** — Architecture target (context)
                                     
                                      - ## Key Rules
                                      - - Authority section always at top
                                        - - Checkboxes track progress (checked = verified done)
                                          - - Recovery instructions always at bottom
                                            - - Embedded prompts must be complete and ready to copy
                                              - - Session log tracks who did what and when
