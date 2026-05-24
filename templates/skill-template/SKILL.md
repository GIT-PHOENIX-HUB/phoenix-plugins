# Skill: {{SKILL_NAME}}

<!--
  STANDALONE SKILL TEMPLATE — Phoenix Toolbox

      This template is for standalone skills that exist outside of a capability.
        Most skills live inside capabilities (capabilities/X/skills/), but some
          cross-cutting skills may be defined independently.

              For skills inside capabilities, use: templates/capability-template/skills/SKILL.md
                Guide: docs/SKILL_AUTHORING_GUIDE.md
                -->

                ## Overview

                **Skill name:** {{SKILL_NAME}}
                **Domain:** {{DOMAIN}}
                **Auto-activates:** Yes
                **Scope:** {{SCOPE}}

                {{SKILL_OVERVIEW}}

                <!--
                  Provide a concise description of what this skill teaches the agent.

                      - Domain: The subject area (e.g., "Electrical codes", "File management")
                        - Scope: How broadly this skill applies (e.g., "Residential NEC codes only")

                            A skill is not a command — the user never invokes it directly. It loads
                              automatically when context conditions are met, making the agent smarter
                                in that domain without any explicit action.
                                -->

                                ## Activation

                                ### When This Skill Fires

                                This skill activates when ANY of the following conditions are true:

                                1. **Topic detection:** The conversation involves {{TOPIC_TRIGGER}}
                                2. **File context:** The agent is working with files matching `{{FILE_PATTERN}}`
                                3. **Keyword match:** The user mentions: {{KEYWORD_LIST}}
                                4. **Tool context:** The agent is about to use: {{TOOL_TRIGGER}}

                                <!--
                                  Be precise with activation rules. The goal is:
                                    - Fire when genuinely relevant (high recall)
                                      - Don't fire when irrelevant (high precision)

                                          Bad example: "Activates when user asks a question" (too broad)
                                            Good example: "Activates when conversation involves NEC electrical codes,
                                              wire sizing, or residential electrical panel work" (well-scoped)

                                                  Reference: capabilities/electrical-guru/skills/NEC_EXPERTISE.md
                                                  -->

                                                  ### When This Skill Should NOT Fire

                                                  Do NOT activate for:

                                                  - {{EXCLUSION_1}}
                                                  - {{EXCLUSION_2}}

                                                  <!--
                                                    Explicit exclusions help prevent false activations.
                                                      Example: "Do NOT activate for commercial/industrial electrical work"
                                                      -->

                                                      ## Knowledge Base

                                                      ### Foundational Concepts

                                                      {{FOUNDATIONAL_KNOWLEDGE}}

                                                      <!--
                                                        Start with the basics. What must the agent understand before
                                                          it can apply the detailed rules below?

                                                              This section loads first and establishes the mental model.
                                                              -->

                                                              ### Detailed Rules

                                                              #### {{RULE_CATEGORY_1}}

                                                              {{DETAILED_RULES_1}}

                                                              <!--
                                                                Break rules into logical categories. Each category should be
                                                                  self-contained enough to be useful on its own.

                                                                      Example categories for an electrical skill:
                                                                        - Wire Sizing Rules
                                                                          - Circuit Breaker Requirements
                                                                            - Grounding Standards
                                                                              - GFCI/AFCI Requirements
                                                                              -->

                                                                              #### {{RULE_CATEGORY_2}}

                                                                              {{DETAILED_RULES_2}}

                                                                              #### {{RULE_CATEGORY_3}}

                                                                              {{DETAILED_RULES_3}}

                                                                              ### Decision Framework

                                                                              When the agent needs to make a decision in this domain:

                                                                              1. **Identify** — What specific question or task is being addressed?
                                                                              2. **Classify** — Which rule category applies?
                                                                              3. **Apply** — What do the rules say?
                                                                              4. **Verify** — Does the answer make sense in context?
                                                                              5. **Qualify** — What caveats or limitations apply?

                                                                              <!--
                                                                                Give the agent a decision-making process for this domain.
                                                                                  This helps with novel situations that don't exactly match
                                                                                    any specific rule.
                                                                                    -->

                                                                                    ### Reference Tables

                                                                                    | {{COLUMN_1}} | {{COLUMN_2}} | {{COLUMN_3}} | {{COLUMN_4}} |
                                                                                    |---|---|---|---|
                                                                                    | {{DATA}} | {{DATA}} | {{DATA}} | {{DATA}} |

                                                                                    <!--
                                                                                      Include lookup tables, conversion charts, or other structured
                                                                                        reference data that the agent needs for accurate answers.

                                                                                            Examples:
                                                                                              - Wire gauge to ampacity tables
                                                                                                - API endpoint mappings
                                                                                                  - Status code definitions
                                                                                                    - File naming convention rules
                                                                                                    -->
                                                                                                    
                                                                                                    ### Common Mistakes
                                                                                                    
                                                                                                    | Mistake | Why It's Wrong | Correct Approach |
                                                                                                    |---------|---------------|-----------------|
                                                                                                    | {{MISTAKE_1}} | {{EXPLANATION_1}} | {{CORRECTION_1}} |
                                                                                                    | {{MISTAKE_2}} | {{EXPLANATION_2}} | {{CORRECTION_2}} |
                                                                                                    | {{MISTAKE_3}} | {{EXPLANATION_3}} | {{CORRECTION_3}} |
                                                                                                    
                                                                                                    <!--
                                                                                                      Document the most common errors agents (or users) make in this domain.
                                                                                                        This section is one of the most valuable parts of a skill because it
                                                                                                          prevents repeated mistakes across sessions.
                                                                                                          -->
                                                                                                          
                                                                                                          ## Boundaries and Disclaimers
                                                                                                          
                                                                                                          ### Scope Limits
                                                                                                          
                                                                                                          This skill covers: {{IN_SCOPE}}
                                                                                                          This skill does NOT cover: {{OUT_OF_SCOPE}}
                                                                                                          
                                                                                                          ### Professional Disclaimer
                                                                                                          
                                                                                                          {{DISCLAIMER}}
                                                                                                          
                                                                                                          <!--
                                                                                                            If this skill involves professional domains (electrical, legal, medical, etc.),
                                                                                                              include appropriate disclaimers.
                                                                                                                
                                                                                                                  Example: "This skill provides guidance based on NEC 2023. Always verify
                                                                                                                    with local codes and consult a licensed electrician for actual installations."
                                                                                                                    -->
                                                                                                                    
                                                                                                                    ## Metadata
                                                                                                                    
                                                                                                                    - **Version:** {{VERSION}}
                                                                                                                    - **Created:** {{DATE}}
                                                                                                                    - **Author:** {{AUTHOR}}
                                                                                                                    - **Last updated:** {{DATE}}
                                                                                                                    - **Status:** {{STATUS}} <!-- draft | active | deprecated -->
                                                                                                                    - **Parent capability:** {{CAPABILITY_NAME}} (or "standalone")
                                                                                                                    - **Related skills:** {{RELATED_SKILLS}}
                                                                                                                    - **Source material:** {{SOURCES}}
