---
name: swarm
description: "Echo swarm team management — load BEFORE dispatching subagents, running multi-agent missions, or building Deep Research prompts. Ensures structured delegation, proper agent scoping, and leadership discipline."
---

# Echo Swarm Team Management

You are about to lead a team. Stop. Read this first.

## Shane's Law

> "How you organize and document your files and your systems and your approach dictate how your team produces for you. Their work represents your leadership."

If your agents produce garbage, that's YOUR failure. Not theirs. You scoped it wrong, gave bad context, or didn't verify.

## Before Dispatching ANY Agent

### 1. Define the Mission Structure First

Before a single agent launches:
- What is the FULL scope of this mission?
- How many agents do you actually need? (fewer = better)
- What does each agent need to succeed? (files, context, constraints)
- Where do results go? (specific file paths, not "report back")
- How will you verify their work?

### 2. Set Each Agent Up to Succeed

| Right | Wrong |
|-------|-------|
| "Read THIS file, extract THESE 5 fields, write to THIS path" | "Research the codebase and report back" |
| "You are auditing auth.js for multi-user gaps. Here's what exists..." | "Check if auth works" |
| Haiku for inventory/extraction tasks | Haiku for adversarial review |
| Opus for synthesis and judgment calls | Opus for simple file reads |
| One focused task per agent | "Do everything and summarize" |

### 3. Match Agent to Task

| Task Type | Model | Why |
|-----------|-------|-----|
| File inventory, extraction, listing | Haiku | Fast, cheap, doesn't need judgment |
| Code audit, gap analysis | Sonnet | Good balance of depth and cost |
| Adversarial review, synthesis, architecture | Opus | Needs judgment and nuance |
| Simple search, pattern match | Haiku | Don't waste capacity |

### 4. Scope Output, Not Just Input

Tell agents WHERE to put results:
- Specific file path for written output
- Structured format (table, list, JSON — not prose)
- Size constraint ("under 50 lines" or "one paragraph per item")

### 5. Never Overload One Agent

- Don't send one scribe to document 12 streams
- Don't ask one agent to read 10 files AND synthesize AND write output
- Split: readers → synthesizer → writer
- Each agent should have ONE clear job

## During the Mission

### Monitor and Catch Failures

- Read agent output BEFORE presenting to Shane
- If an agent drifted from scope — YOU fix it, don't pass it through
- If an agent missed something obvious — that's a scoping failure
- If results conflict between agents — YOU reconcile, don't dump both

### Pick Up the Pieces

When an agent screws up:
1. Don't blame the agent
2. Identify what went wrong (bad scope? missing context? wrong model?)
3. Fix the output yourself or re-dispatch with better instructions
4. Log what went wrong so you scope better next time

## After the Mission

### Verify Before Declaring Done

- Did every agent complete their task?
- Do the outputs actually answer the question?
- Are there gaps between what was asked and what was delivered?
- Would Shane look at this and say "this is thorough" or "this is lazy"?

### File Everything

- Results go into structured folders (not floating in conversation)
- Update README/index files so future sessions find the work
- If this is a multi-session project, update BRIDGE.md for Codex

## The Standard

Shane tested every form of AI available. He pushed them into things they weren't designed for. He mapped actual capability boundaries by breaking them. Then he placed each one where they'd succeed.

That's YOUR job now with your subagents. Know their limits. Set them up. Monitor the output. Own the results.

**Their work represents your leadership.**
