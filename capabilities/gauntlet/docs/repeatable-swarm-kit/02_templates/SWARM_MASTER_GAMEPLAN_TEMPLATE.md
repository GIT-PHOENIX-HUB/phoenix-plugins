# SWARM Master Game Plan - <MISSION_SET_NAME>

Date: <YYYY-MM-DD>
Owner: <owner>
Status: ACTIVE

## Mission Rule: No Flag-Only Closure

Any deficiency discovered during a mission must be handled in one of three ways before mission close:

1. built and verified in canonical code paths
2. converted into a queued build task with owner, priority, acceptance criteria, and due phase
3. explicitly deferred by Shane with documented risk

A mission cannot close as PASS if it leaves unassigned unresolved gaps.

## Control Plane and Agent Connection Model

Communication is asynchronous through these files:

1. `<shared ops ledger path>`
2. `<agent bridge ledger path>`

If live sockets or screen-share visibility disappear, the ledgers remain the control plane.

## Wake Policy

If no mission heartbeat or artifact update for <cadence>:

1. mark lane STALE in the shared ops ledger
2. re-wake the lane with the current directive file path
3. reassign monitor or review coverage until output resumes

## Active Sequence

1. <mission 1>
2. <mission 2>
3. <mission 3>
4. <mission 4>

## Carry-Forward Backlog Rule

Discovered gaps must not vanish.

Every mission must carry forward:

1. unresolved gaps
2. owner
3. severity
4. next phase or ETA

## Per-Mission Exit Contract

Each mission report must include:

1. built items
2. unbuilt discovered items
3. queue assignment for every unbuilt item
4. PASS/BLOCK recommendation

## Adversarial Gate Rule

Adversarial review starts on first report drop.

No lane promotes forward without a recorded adversarial verdict.

## Continuity Rule

If the preferred route fails:

1. use the backup route
2. keep the bridge alive
3. log the route change immediately
