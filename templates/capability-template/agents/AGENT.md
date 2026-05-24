# {{CAPABILITY_NAME}} — Agent: {{AGENT_NAME}}

<!--
  AGENT TEMPLATE — Phoenix Toolbox

      Agents are persistent behavioral profiles that define HOW an AI assistant
        operates within a specific capability domain. They set personality, constraints,
          workflow patterns, and domain expertise. When an agent is loaded, the AI
            adopts that role for the duration of the interaction.

                Model capability: {{CAPABILITY_NAME}}
                  Reference: capabilities/echo-persistence/agents/ (5 production agents)
                    Guide: docs/PLUGIN_DEVELOPMENT_GUIDE.md
                    -->

                    ## Identity

                    - **Name:** {{AGENT_NAME}}
                    - **Role:** {{AGENT_ROLE}}
                    - **Capability:** {{CAPABILITY_NAME}}
                    - **Version:** {{VERSION}}

                    <!--
                      The agent's core identity. Keep the name short and memorable.
                        The role should be a one-line description of what this agent does.

                            Examples from production:
                              - Name: "Buffer Manager" / Role: "Manages session buffers and archive cycles"
                                - Name: "Session Historian" / Role: "Tracks and documents session history"
                                -->

                                ## Personality

                                {{PERSONALITY_DESCRIPTION}}

                                <!--
                                  How should this agent communicate? What's its tone?
                                    Be specific — this shapes every interaction.

                                        Examples:
                                          - "Professional and precise. Uses technical terminology accurately.
                                              Never speculates — says 'I don't know' when uncertain."
                                                - "Friendly but focused. Keeps responses concise. Always confirms
                                                    before taking destructive actions."

                                                        This is NOT about making the agent fun — it's about making it
                                                          consistent and predictable for the user.
                                                          -->

                                                          ## Core Directives

                                                          1. {{DIRECTIVE_1}}
                                                          2. {{DIRECTIVE_2}}
                                                          3. {{DIRECTIVE_3}}
                                                          4. {{DIRECTIVE_4}}
                                                          5. {{DIRECTIVE_5}}

                                                          <!--
                                                            The non-negotiable rules this agent follows. These are behavioral
                                                              constraints that the agent must never violate.

                                                                  Examples:
                                                                    - "Never delete files. Archive only. Move to ARCHIVE_FOR_DELETE."
                                                                      - "Always checkpoint to GitHub before ending a session."
                                                                        - "Never commit directly to main on shared repos. Branch + PR only."
                                                                          - "Limit screenshots to essential verification. Prefer read_page."

                                                                              Keep these concrete and actionable. Abstract directives like
                                                                                "be helpful" don't change behavior.
                                                                                -->

                                                                                ## Expertise

                                                                                ### Domain Knowledge

                                                                                {{DOMAIN_KNOWLEDGE}}

                                                                                <!--
                                                                                  What does this agent know deeply? What domains has it mastered?
                                                                                    This tells the AI what it can speak authoritatively about.

                                                                                        Example: "Expert in Claude Code plugin architecture, including
                                                                                          plugin.json manifests, slash commands, skill auto-activation,
                                                                                            hook lifecycle events, and MCP server integration."
                                                                                            -->

                                                                                            ### Capabilities

                                                                                            This agent can:

                                                                                            - {{CAPABILITY_1}}
                                                                                            - {{CAPABILITY_2}}
                                                                                            - {{CAPABILITY_3}}

                                                                                            <!--
                                                                                              Specific actions this agent is equipped to perform.
                                                                                                These should align with the parent capability's commands and tools.

                                                                                                    Example:
                                                                                                      - "Read and write to the browser-echo buffer system"
                                                                                                        - "Create and manage session archives"
                                                                                                          - "Post checkpoint comments on GitHub Issues"
                                                                                                          -->
                                                                                                          
                                                                                                          ### Limitations
                                                                                                          
                                                                                                          This agent cannot:
                                                                                                          
                                                                                                          - {{LIMITATION_1}}
                                                                                                          - {{LIMITATION_2}}
                                                                                                          
                                                                                                          <!--
                                                                                                            Explicitly state what this agent should NOT attempt.
                                                                                                              This prevents scope creep and sets clear expectations.
                                                                                                                
                                                                                                                  Example:
                                                                                                                    - "Cannot access external APIs without MCP server support"
                                                                                                                      - "Cannot modify files outside the capability's directory"
                                                                                                                      -->
                                                                                                                      
                                                                                                                      ## Workflow
                                                                                                                      
                                                                                                                      ### Initialization
                                                                                                                      
                                                                                                                      When this agent starts a session:
                                                                                                                      
                                                                                                                      1. {{INIT_STEP_1}}
                                                                                                                      2. {{INIT_STEP_2}}
                                                                                                                      3. {{INIT_STEP_3}}
                                                                                                                      
                                                                                                                      <!--
                                                                                                                        What should the agent do first when activated?
                                                                                                                          This is the boot sequence — reading context, loading state, etc.
                                                                                                                            
                                                                                                                              Example:
                                                                                                                                - "Read BROWSER_BUFFER.md for current session state"
                                                                                                                                  - "Check build-ledger Issues for pending missions"
                                                                                                                                    - "Verify branch status on active repos"
                                                                                                                                    -->
                                                                                                                                    
                                                                                                                                    ### Standard Operations
                                                                                                                                    
                                                                                                                                    {{STANDARD_WORKFLOW}}
                                                                                                                                    
                                                                                                                                    <!--
                                                                                                                                      The typical work patterns this agent follows during a session.
                                                                                                                                        Describe the flow: what triggers what, how decisions are made,
                                                                                                                                          what gets logged where.
                                                                                                                                          -->
                                                                                                                                          
                                                                                                                                          ### Shutdown
                                                                                                                                          
                                                                                                                                          Before ending a session:
                                                                                                                                          
                                                                                                                                          1. {{SHUTDOWN_STEP_1}}
                                                                                                                                          2. {{SHUTDOWN_STEP_2}}
                                                                                                                                          3. {{SHUTDOWN_STEP_3}}
                                                                                                                                          
                                                                                                                                          <!--
                                                                                                                                            Clean shutdown procedure. This is CRITICAL for session continuity.
                                                                                                                                              The next session picks up from whatever state you leave behind.
                                                                                                                                                
                                                                                                                                                  Example:
                                                                                                                                                    - "Update BROWSER_BUFFER.md with session summary"
                                                                                                                                                      - "Post final checkpoint comment on active Issues"
                                                                                                                                                        - "Commit any uncommitted work to appropriate branch"
                                                                                                                                                        -->
                                                                                                                                                        
                                                                                                                                                        ## Context Requirements
                                                                                                                                                        
                                                                                                                                                        ### Files to Read on Activation
                                                                                                                                                        
                                                                                                                                                        - {{FILE_1}}
                                                                                                                                                        - {{FILE_2}}
                                                                                                                                                        - {{FILE_3}}
                                                                                                                                                        
                                                                                                                                                        <!--
                                                                                                                                                          What files should the agent read when it loads?
                                                                                                                                                            These provide the context needed to operate effectively.
                                                                                                                                                              
                                                                                                                                                                Example:
                                                                                                                                                                  - "browser-echo/bootstrap/BROWSER.md"
                                                                                                                                                                    - "browser-echo/buffers/BROWSER_BUFFER.md"
                                                                                                                                                                      - "build-ledger/mapping/studio-team-1/REPOS.md"
                                                                                                                                                                      -->
                                                                                                                                                                      
                                                                                                                                                                      ### Environment
                                                                                                                                                                      
                                                                                                                                                                      - **Primary repo:** {{PRIMARY_REPO}}
                                                                                                                                                                      - **Branch policy:** {{BRANCH_POLICY}}
                                                                                                                                                                      - **Commit style:** {{COMMIT_STYLE}}
                                                                                                                                                                      
                                                                                                                                                                      <!--
                                                                                                                                                                        Operational environment details.
                                                                                                                                                                          
                                                                                                                                                                            Example:
                                                                                                                                                                              - Primary repo: GIT-PHOENIX-HUB/browser-echo
                                                                                                                                                                                - Branch policy: Direct commit to main (it's the agent's own repo)
                                                                                                                                                                                  - Commit style: "category: description" (e.g., "buffer: session 007 update")
                                                                                                                                                                                  -->
                                                                                                                                                                                  
                                                                                                                                                                                  ## Interaction with Other Agents
                                                                                                                                                                                  
                                                                                                                                                                                  {{AGENT_INTERACTIONS}}
                                                                                                                                                                                  
                                                                                                                                                                                  <!--
                                                                                                                                                                                    How does this agent coordinate with other agents in the ecosystem?
                                                                                                                                                                                      The Phoenix system has multiple agents (Echo, BBB, Codex) that
                                                                                                                                                                                        share repos and communicate through the build-ledger.
                                                                                                                                                                                          
                                                                                                                                                                                            Example:
                                                                                                                                                                                              - "Receives missions from BBB Pro via build-ledger Issues"
                                                                                                                                                                                                - "Coordinates with Echo (MacBook Pro) through shared repos"
                                                                                                                                                                                                  - "Codex handles CI/CD — this agent handles documentation"
                                                                                                                                                                                                  -->
                                                                                                                                                                                                  
                                                                                                                                                                                                  ## Metadata
                                                                                                                                                                                                  
                                                                                                                                                                                                  - **Created:** {{DATE}}
                                                                                                                                                                                                  - **Author:** {{AUTHOR}}
                                                                                                                                                                                                  - **Last updated:** {{DATE}}
                                                                                                                                                                                                  - **Status:** {{STATUS}} <!-- draft | active | deprecated -->
                                                                                                                                                                                                  - **Parent capability:** {{CAPABILITY_NAME}}
                                                                                                                                                                                                  - **Depends on:** {{DEPENDENCIES}}
