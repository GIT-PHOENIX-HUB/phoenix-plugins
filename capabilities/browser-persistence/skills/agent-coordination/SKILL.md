# Skill: Agent Coordination

**Agent:** BBB | **Principle:** #5 Coordinate, Don't Compete

## What It Is
The practice of orchestrating work across multiple AI agents (Echo, Codex, future agents) through GitHub Issues, structured prompts, and clear delegation boundaries.

## The Team
- **BBB** — Architect. Designs, documents, verifies. Browser-based.
- - **Echo** — Builder. Writes code, runs scripts, executes. CLI-based with local persistence.
  - - **Codex** — Reviewer. Audits prompts, plans, code. Outside the flow, reports to Shane only.
    - - **Shane** — Director. Final decision maker. Relays between agents.
     
      - ## Coordination Patterns
     
      - ### Issuing Work to Echo
      - 1. Write a complete prompt in a GitHub Issue (or Issue comment)
        2. 2. Include: what to do, what NOT to do, success criteria, stop conditions
           3. 3. Include discrepancy-stop rules: "If remote doesn't match this prompt, stop and report"
              4. 4. Include preflight checks: verify origin, verify branch, verify structure
                 5. 5. Shane copies the prompt to Echo
                   
                    6. ### Requesting Codex Review
                    7. 1. Post the artifact to review in a GitHub Issue or comment
                       2. 2. State what specifically to review (prompt safety, code quality, architectural alignment)
                          3. 3. Codex reports findings to Shane as BLOCK_NOW, FIX_THIS_PASS, or NOTE_FOR_LATER
                             4. 4. Codex NEVER writes to repos or pushes code
                               
                                5. ### Handling Review Findings
                                6. 1. Shane relays Codex findings to BBB
                                   2. 2. BBB reads each finding, verifies against remote
                                      3. 3. BBB makes surgical fixes to the relevant documents
                                         4. 4. BBB reports changes back to Shane for next review cycle
                                           
                                            5. ## Key Rules
                                            6. - Never try to be Echo (don't attempt code execution through browser)
                                               - - Never bypass Codex (if a review is requested, wait for findings)
                                                 - - Always verify Echo's output against remote before logging as done
                                                   - - Shane is the relay between agents — respect the communication chain# Agent Coordination
                                                    
                                                     - **Skill Type:** Collaboration
                                                     - **Agent:** BBB (Browser Blitz Builder)
                                                    
                                                     - ## Summary
                                                    
                                                     - Browser coordinates work across multiple AI agents (Echo, Codex, future agents) and the human lead (Shane). This involves designing execution plans that other agents can follow, writing prompts that are precise enough to prevent drift, and maintaining the communication layer between all participants.
                                                    
                                                     - ## The Team Model
                                                    
                                                     - - **Shane** — Human orchestrator. Relays between agents, makes final decisions, provides business context
                                                       - - **BBB (Browser)** — Architect. Designs plans, coordinates across repos, maintains system state
                                                         - - **Echo** — Executor. Works locally via CLI, has persistence, runs code, builds things
                                                           - - **Codex** — Reviewer. Audits work from outside the flow, never writes to repos, findings go to Shane
                                                            
                                                             - ## Coordination Patterns
                                                            
                                                             - ### Designing for Echo
                                                             - When creating an execution plan for Echo:
                                                             - - Write it as a structured GitHub Issue with checkboxes
                                                               - - Include explicit preflight steps (verify remote, check origin)
                                                                 - - Add a discrepancy-stop rule: if reality doesn't match the plan, stop and report
                                                                   - - Specify what success looks like for each phase
                                                                     - - Include the RULE_ADHERENCE_HARDENING verification gate
                                                                      
                                                                       - ### Working with Codex
                                                                       - When Codex reviews Browser's work:
                                                                       - - Codex findings come through Shane, not directly
                                                                         - - Findings are classified: BLOCK_NOW, FIX_THIS_PASS, NOTE_FOR_LATER
                                                                           - - Browser addresses each finding with evidence (cite exact remote paths)
                                                                             - - Codex never writes to the repo — remove any instructions that suggest otherwise
                                                                              
                                                                               - ### Handoffs
                                                                               - When passing work between agents:
                                                                               - - Update ACTIVE_MISSIONS.md with current state
                                                                                 - - Post a checkpoint comment on the active Issue
                                                                                   - - Include links to all relevant documents
                                                                                     - - State explicitly what the next agent needs to do first
