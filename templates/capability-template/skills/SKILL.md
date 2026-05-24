# {{CAPABILITY_NAME}} — Skill: {{SKILL_NAME}}

<!--
  SKILL TEMPLATE — Phoenix Toolbox

      Skills are auto-activating knowledge modules. Unlike commands (which require
        explicit invocation), skills fire automatically when their activation rules
          match the current context. The agent doesn't need to know the skill exists —
            it just becomes smarter when relevant conditions are met.

                Model capability: {{CAPABILITY_NAME}}
                  Reference: capabilities/echo-persistence/skills/PERSISTENCE.md (production example)
                    Guide: docs/SKILL_AUTHORING_GUIDE.md
                    -->

                    ## Description

                    {{SKILL_DESCRIPTION}}

                    <!-- 
                      Write 2-3 sentences explaining what this skill teaches the agent.
                        Focus on WHAT knowledge it provides and WHY it matters.
                          Example: "Teaches the agent how to persist memory across sessions using
                            the buffer/archive system in browser-echo."
                            -->

                            ## Activation Rules

                            This skill activates when:

                            - **Context match:** {{ACTIVATION_CONTEXT}}
                            - **Keywords detected:** {{ACTIVATION_KEYWORDS}}
                            - **File patterns:** {{FILE_PATTERNS}}

                            <!--
                              Activation rules determine WHEN this skill fires. Be specific:

                                  - Context match: What is the user/agent doing? (e.g., "working with electrical codes")
                                    - Keywords: What words in the conversation trigger this? (e.g., "NEC", "wire gauge", "amperage")
                                      - File patterns: What files being open/discussed trigger this? (e.g., "*.wiring", "electrical-*")

                                          IMPORTANT: Overly broad rules cause skills to fire when they shouldn't.
                                            Overly narrow rules mean the skill never activates. Find the balance.

                                                Reference: capabilities/electrical-guru/skills/NEC_EXPERTISE.md for a good example.
                                                -->

                                                ## Knowledge

                                                ### Core Concepts

                                                {{CORE_KNOWLEDGE}}

                                                <!--
                                                  This is the meat of the skill. Write the actual knowledge the agent needs.
                                                    Structure it clearly with subsections. Think of this as a reference manual
                                                      that the agent loads into context when the skill activates.

                                                          Be thorough but focused. Don't include knowledge that belongs in a
                                                            different skill. Each skill should have a clear, bounded domain.
                                                            -->

                                                            ### Key Rules

                                                            1. {{RULE_1}}
                                                            2. {{RULE_2}}
                                                            3. {{RULE_3}}

                                                            <!--
                                                              Hard rules the agent must follow in this domain.
                                                                These are non-negotiable constraints, not suggestions.
                                                                  Example: "Never recommend wire gauge below what NEC Table 310.16 specifies."
                                                                  -->

                                                                  ### Common Patterns

                                                                  | Scenario | Correct Approach | Common Mistake |
                                                                  |----------|-----------------|----------------|
                                                                  | {{SCENARIO_1}} | {{CORRECT_1}} | {{MISTAKE_1}} |
                                                                  | {{SCENARIO_2}} | {{CORRECT_2}} | {{MISTAKE_2}} |

                                                                  <!--
                                                                    Pattern table helps the agent quickly match situations to correct responses.
                                                                      Include the most frequent scenarios this skill addresses.
                                                                      -->

                                                                      ### Reference Data

                                                                      {{REFERENCE_DATA}}

                                                                      <!--
                                                                        Tables, lookup values, formulas, or other structured reference data.
                                                                          This is the kind of information the agent needs to give accurate answers.

                                                                              Example: NEC wire gauge tables, ServiceFusion API endpoint mappings,
                                                                                file naming conventions, etc.
                                                                                -->

                                                                                ## Boundaries

                                                                                This skill does NOT cover:

                                                                                - {{OUT_OF_SCOPE_1}}
                                                                                - {{OUT_OF_SCOPE_2}}

                                                                                <!--
                                                                                  Explicitly state what this skill should NOT be used for.
                                                                                    This prevents the agent from over-applying the skill's knowledge.

                                                                                        Example: "This skill covers residential electrical codes only.
                                                                                          Commercial and industrial codes are out of scope."
                                                                                          -->

                                                                                          ## Dependencies

                                                                                          - **Capability:** {{CAPABILITY_NAME}}
                                                                                          - **Related skills:** {{RELATED_SKILLS}}
                                                                                          - **Required data:** {{REQUIRED_DATA}}

                                                                                          <!--
                                                                                            What does this skill need to function?
                                                                                              - Which capability does it belong to?
                                                                                                - Are there other skills that complement this one?
                                                                                                  - Does it need access to external data, APIs, or files?
                                                                                                  -->

                                                                                                  ## Version

                                                                                                  - **Created:** {{DATE}}
                                                                                                  - **Author:** {{AUTHOR}}
                                                                                                  - **Last updated:** {{DATE}}
                                                                                                  - **Status:** {{STATUS}} <!-- draft | active | deprecated -->
