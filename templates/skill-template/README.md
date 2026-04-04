# Skill Template — How to Author a Skill

## What Is a Skill?

A skill is an auto-activating knowledge module in the Phoenix Toolbox. Unlike commands (which users invoke explicitly with `/command-name`), skills fire automatically when their activation rules match the current conversation context. The agent becomes smarter in a domain without the user needing to do anything.

When a user asks about wire gauge sizing, the NEC_EXPERTISE skill activates. When an agent is working with session buffers, the PERSISTENCE skill activates. No slash command needed — the knowledge just appears.

## When to Create a Skill

Create a skill when:

- There is domain knowledge an agent needs repeatedly across sessions
- - The knowledge should activate contextually, not on explicit request
  - - The information is structured enough to define clear activation rules
    - - Multiple agents or sessions would benefit from the same knowledge
     
      - Do NOT create a skill when:
     
      - - The knowledge is better served as a command (user needs explicit control)
        - - The activation context is too broad to scope reliably
          - - The information changes too frequently to maintain in a static file
           
            - ## Using This Template
           
            - 1. Copy `SKILL.md` from this directory
              2. 2. If this skill belongs to a capability, place it at: `capabilities/{{CAPABILITY_NAME}}/skills/{{SKILL_NAME}}.md`
                 3. 3. If this is a standalone skill, place it at the appropriate location and reference it in the capability registry
                    4. 4. Fill in all `{{PLACEHOLDER}}` values — leave nothing unfilled
                       5. 5. Read the HTML comments in the template for guidance on each section
                          6. 6. Test activation rules against real conversation scenarios
                             7. 7. Register the skill in `CAPABILITY_REGISTRY.md`
                               
                                8. ## Template Files
                               
                                9. | File | Purpose |
                                10. |------|---------|
                                11. | `SKILL.md` | Full skill template with all sections, placeholders, and guidance comments |
                               
                                12. ## Skill File Structure
                               
                                13. A complete skill file has these sections:
                               
                                14. **Overview** — Name, domain, scope, and description. This tells the system WHAT the skill is.
                               
                                15. **Activation** — When the skill fires and when it should NOT fire. This controls WHEN the skill loads. Getting this right is the most important part of skill authoring. Too broad and the skill fires on irrelevant conversations, wasting context. Too narrow and it never fires when needed.
                               
                                16. **Knowledge Base** — The actual domain knowledge. This is the CONTENT the agent receives when the skill activates. Structure it with foundational concepts first, then detailed rules broken into categories, a decision framework for novel situations, reference tables for lookup data, and common mistakes to avoid.
                               
                                17. **Boundaries** — Explicit scope limits and professional disclaimers. This prevents the agent from over-applying the skill outside its domain.
                               
                                18. **Metadata** — Version, authorship, status, and relationships.
                               
                                19. ## Quality Checklist
                               
                                20. Before committing a new skill, verify:
                               
                                21. - [ ] All placeholders filled — no `{{...}}` markers remain
                                    - [ ] - [ ] Activation rules are specific enough (tested against 3+ scenarios)
                                    - [ ] - [ ] Exclusion rules prevent obvious false activations
                                    - [ ] - [ ] Knowledge is organized in clear categories
                                    - [ ] - [ ] Common mistakes section has at least 3 entries
                                    - [ ] - [ ] Boundaries section explicitly states what is out of scope
                                    - [ ] - [ ] Professional disclaimers included for regulated domains
                                    - [ ] - [ ] Registered in CAPABILITY_REGISTRY.md with correct skill count
                                    - [ ] - [ ] File renders correctly in GitHub preview
                                   
                                    - [ ] ## Examples from Production
                                   
                                    - [ ] | Skill | Capability | Domain |
                                    - [ ] |-------|-----------|--------|
                                    - [ ] | PERSISTENCE.md | echo-persistence | Session memory and buffer management |
                                    - [ ] | NEC_EXPERTISE.md | electrical-guru | National Electrical Code residential |
                                    - [ ] | KNOWLEDGE_MANAGEMENT.md | phoenix-knowledge | Knowledge base operations |
                                    - [ ] | REXEL_CATALOG.md | rexel | Rexel product catalog and ordering |
                                    - [ ] | SF_WORKFLOW.md | servicefusion | ServiceFusion job and estimate workflows |
                                    - [ ] | MARKETING_STRATEGY.md | volt-marketing | Volt Services marketing and campaigns |
                                    - [ ] | M365_OPERATIONS.md | phoenix-365 | Microsoft 365 administration |
                                    - [ ] | CALENDAR_MANAGEMENT.md | phoenix-365 | Calendar and scheduling |
                                    - [ ] | EMAIL_MANAGEMENT.md | phoenix-365 | Email handling and organization |
                                    - [ ] | BUFFER_SYSTEM.md | browser-persistence | Browser agent buffer operations |
                                    - [ ] | SESSION_CONTINUITY.md | browser-persistence | Cross-session state management |
                                    - [ ] | CHECKPOINT_PROTOCOL.md | browser-persistence | GitHub checkpoint procedures |
                                    - [ ] | LEDGER_NAVIGATION.md | browser-persistence | Build-ledger navigation patterns |
                                   
                                    - [ ] Study these production skills to understand the expected quality bar.
                                   
                                    - [ ] ## Related Documentation
                                   
                                    - [ ] - **Full guide:** `docs/SKILL_AUTHORING_GUIDE.md`
                                    - [ ] - **Plugin development:** `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
                                    - [ ] - **Architecture:** `docs/ARCHITECTURE.md`
                                    - [ ] - **Capability registry:** `CAPABILITY_REGISTRY.md`
