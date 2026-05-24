# Pattern: Verification

## Purpose
Verify claims against the live GitHub remote before logging them as facts. This is the core implementation of Principle #2: Trust Remote, Not Claims.

## When to Use
- Before logging that a file exists or has specific content
- - Before claiming a branch exists or has been deleted
  - - Before stating commit counts, folder contents, or file structures
    - - After Echo completes work — verify the output yourself
      - - When conversation summaries make claims about repo state
       
        - ## Process
        - 1. **Navigate** to the specific GitHub URL
          2. 2. **Read** the content using `get_page_text` or `read_page`
             3. 3. **Screenshot** if visual verification is needed (file trees, rendered markdown)
                4. 4. **Cite** the exact path, branch, SHA, or URL
                   5. 5. **Log** the verified fact with its citation
                     
                      6. ## What Counts as Evidence
                      7. - Direct URL to a file or folder on GitHub (verified by navigation)
                         - - Commit SHA visible in the GitHub UI
                           - - Screenshot showing the rendered content
                             - - `get_page_text` output from the specific URL
                              
                               - ## What Does NOT Count as Evidence
                               - - Claims in conversation summaries
                                 - - Memory from earlier in the session without re-verification
                                   - - What someone says a file contains (navigate and check)
                                     - - Assumptions based on what "should" be there
                                      
                                       - ## Template for Logging Verified Facts
                                       - ```
                                         VERIFIED: [fact]
                                         SOURCE: [exact URL or path]
                                         EVIDENCE: [how verified — navigation, screenshot, get_page_text]
                                         ```
