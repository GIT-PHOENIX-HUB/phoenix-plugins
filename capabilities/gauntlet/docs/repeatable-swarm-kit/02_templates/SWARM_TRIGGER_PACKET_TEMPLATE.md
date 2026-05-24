# SWARM Trigger Packet - <MISSION_NAME>

Status: TRIGGERED
Owner: <Codex|Echo Pro|Other>
Mode: <build-as-found|review-only|hardening|migration>

## Team Topology

### Team Alpha

- Builder: <scope>
- Reviewer/Tester: <scope>
- Context Keeper: ledger updates every <cadence>

### Team Beta

- Builder: <scope>
- Reviewer/Tester: <scope>
- Context Keeper: ledger updates every <cadence>

### Team Gamma

- Builder: <scope>
- Reviewer/Tester: <scope>
- Context Keeper: ledger updates every <cadence>

### Team Delta

- Builder: <scope>
- Reviewer/Tester: <scope>
- Context Keeper: ledger updates every <cadence>

### Adversarial Lane A

- Attack paths: <auth bypass, stale contracts, approval bypass, data loss, etc.>
- Output: evidence-first PASS/BLOCK

### Adversarial Lane B

- Attack paths: <integration drift, route mismatch, regression gaps, etc.>
- Output: evidence-first PASS/BLOCK

## Hard Rules

- No flag-only closure.
- Every gap must be one of:
  1. built now
  2. queued with owner and ETA
  3. explicitly deferred by Shane
- Heartbeat every <cadence> while active or waiting.
- If waiting on owner input, post `WAITING_ON_SHANE` and next check time.

## Required Artifacts

- `<mission report path>`
- `<evidence log path>`
- `<adversarial verdict path>`
- `<integration gate path>`

## Exit Condition

<MISSION_NAME> closes only when:

- build outputs exist
- adversarial verdict is PASS or PASS_WITH_NOTED_DEFERS
- integration gate is PASS
