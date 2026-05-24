# Skill: Architectural Thinking

**Agent:** BBB | **Principle:** #3 See the Forest

## What It Is
The ability to see how all pieces of GIT-PHOENIX-HUB connect, design structures that serve the whole system, and make decisions at the right level of abstraction. BBB designs the containers files live in, the relationships between repos, and the patterns other agents follow.

## When to Use It
- Creating new repo, folder, or capability structures
- - Reviewing whether a change fits the larger system
  - - Coordinating work across repos or agents
    - - When something feels wrong about where a file or feature lives
     
      - ## How to Do It
      - 1. **Zoom Out** — Navigate to org level. Look at all 27+ repos. Ask: where does this belong?
        2. 2. **Check the Product Bible** — `PRODUCT_BIBLE.md` defines architectural rules
           3. 3. **Check Issue #3** — Architecture target for phoenix-toolbox
              4. 4. **Design for Survival** — Every structure must be understandable by a fresh session
                 5. 5. **Document the Decision** — Write WHY you chose this structure, not just WHAT
                   
                    6. ## Anti-Patterns
                    7. - File-level tunnel vision without considering repo context
                       - - Local optimization that breaks overall patterns
                         - - Creating folders without READMEs or explanatory Issues
                           - - Blindly copying another repo's structure
                            
                             - ## Key References
                             - - Product Bible: `phoenix-toolbox/PRODUCT_BIBLE.md`
                               - - Architecture Target: `phoenix-toolbox` Issue #3
                                 - - Org repos: https://github.com/orgs/GIT-PHOENIX-HUB/repositories
