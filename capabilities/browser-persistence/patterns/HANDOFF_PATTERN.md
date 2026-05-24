# Pattern: Handoff

## Purpose
Transfer context between Browser sessions so the next BBB can resume without loss. This pattern ensures continuity across the gap between session death and session birth.

## When to Use
- At the end of every session (planned or unplanned)
- - Before compaction when context window is full
  - - When Shane pauses current work for a new priority
    - - When transferring mission ownership between sessions
     
      - ## Handoff Checklist
      - 1. **Update ACTIVE_MISSIONS.md** — Current state of all missions
        2. 2. **Post checkpoint comment** on the active Issue — What was done, where stopped, what's next
           3. 3. **Add SESSION_LOG.md entry** — Date, session number, summary, decisions, files changed
              4. 4. **Verify all changes committed** — Navigate to repo, confirm files are saved
                
                 5. ## Handoff Template
                 6. See `ledger/HANDOFF_TEMPLATE.md` for the full template to copy.
                
                 7. ## Key Principle
                 8. The handoff is not a summary for Shane — it's a survival guide for the next BBB. Write it as if the next session has zero context and zero memory. Because it does.
                
                 9. ## What Makes a Good Handoff
                 10. - Specific file paths (not "the file we were working on")
                     - - Exact Issue URLs (not "check the build ledger")
                       - - Clear next step (not "continue the work")
                         - - Honest about what's incomplete (not "almost done")
                          
                           - ## What Makes a Bad Handoff
                           - - Vague descriptions requiring context to understand
                             - - Missing URLs or file paths
                               - - Optimistic status reports that don't match reality
                                 - - Assuming the next session will "figure it out"# Handoff Pattern
                                  
                                   - How to hand off work between sessions or between agents.
                                  
                                   - ## Between Browser Sessions
                                  
                                   - When a Browser session ends (or might end):
                                  
                                   - 1. Post a checkpoint comment on the active Issue (see CHECKPOINT_PATTERN.md)
                                     2. 2. Update `bootstrap/ACTIVE_MISSIONS.md` with current state
                                        3. 3. Add an entry to `ledger/SESSION_LOG.md`
                                          
                                           4. The next session starts by reading BOOTSTRAP.md, which directs to ACTIVE_MISSIONS.md, which has links to the Issues with the latest checkpoint comments.
                                          
                                           5. ## Between Browser and Echo
                                          
                                           6. When handing work from Browser to Echo:
                                          
                                           7. 1. Write the execution plan as a structured GitHub Issue
                                              2. 2. Include a startup prompt that Echo can run directly
                                                 3. 3. Add preflight checks (verify remote, check origin)
                                                    4. 4. Include discrepancy-stop rules
                                                       5. 5. Add verification gates between phases
                                                          6. 6. Tell Shane the prompt is ready
                                                            
                                                             7. ## Between Browser and Codex
                                                            
                                                             8. When requesting a Codex review:
                                                            
                                                             9. 1. Post the material to be reviewed (Issue body, commit diff, etc.)
                                                                2. 2. Ask Shane to relay to Codex
                                                                   3. 3. Wait for findings (classified as BLOCK_NOW, FIX_THIS_PASS, NOTE_FOR_LATER)
                                                                      4. 4. Address each finding with evidence
                                                                         5. 5. Request re-review if needed
                                                                           
                                                                            6. ## Key Rule
                                                                           
                                                                            7. The handoff document must contain everything the recipient needs. Never assume shared context — write as if the reader has zero memory of previous sessions.
