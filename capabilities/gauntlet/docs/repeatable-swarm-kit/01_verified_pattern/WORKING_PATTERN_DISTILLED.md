# Working Pattern Distilled

This is the shortest accurate description of the swarm pattern that already worked.

## What Made It Work

### 1. Two Ledgers, Two Jobs

- `AGENT_BRIDGE_LEDGER.md` handled long-form decisions, handoffs, blockers, and evidence.
- `SHARED_OPS_LEDGER.md` handled heartbeat lines and fast state visibility.

This split prevented the bridge ledger from turning into noise and prevented the ops ledger from turning into essays.

### 2. Topology Was Locked Before Build

The active swarm did not start as a loose pile of agents.

It had:

- named teams
- explicit builder responsibilities
- explicit reviewer/tester responsibilities
- explicit context-keeper responsibilities
- explicit adversarial lanes

That matters because drift starts the moment role boundaries are fuzzy.

### 3. First Artifact Triggered Attack

The review lane did not wait until the end.

On the first report drop:

- Echo Pro began adversarial verification
- the verdict was PASS/BLOCK
- evidence had to cite files and actual behavior

This kept bad assumptions from spreading across later work.

### 4. No Flag-Only Closure

The strongest rule in the working pattern was simple:

Every discovered gap had to be one of:

1. built now
2. queued with owner and ETA
3. explicitly deferred by Shane

This stopped fake progress.

### 5. Mission Close Required Artifacts

A lane did not close because somebody felt done.

It closed only when the required artifacts existed:

- mission report
- evidence log
- adversarial verdict
- integration gate verdict

### 6. PASS Needed a Gate

The final pass state came from a gate document, not a casual update.

That gate checked:

- build outputs exist
- adversarial verdict exists
- tests/syntax have evidence
- critical blockers are resolved
- defers are listed

### 7. Heartbeats Prevented Silent Failure

The working swarm used timed heartbeat updates and a wake policy.

If output stalled:

- mark the lane stale
- re-wake it
- reassign if needed

That is what makes the system repeatable instead of personality-dependent.

### 8. Operator Relay Was Removed

The swarm explicitly moved into `NO_OPERATOR_RELAY_MODE`.

Meaning:

- agents were expected to read the canonical ledgers
- Shane was not supposed to manually relay every state change

That is a major reason the system scaled.

## Minimum Pattern To Reuse

If we recreate this again, the minimum safe pattern is:

1. one canonical bridge ledger
2. one shared ops ledger
3. locked topology before execution
4. heartbeat cadence
5. adversarial lane on first artifact
6. no-flag-only closure
7. final gate document before mission close

If any of those are missing, the system is weaker than the one that already proved itself.
