# Agent Note: Document read integrity waterfall and legacy tool recovery

Status: implemented

## Problem

The desktop read-integrity listener called the Cordis waterfall continuation with an argument even though Cordis captures the continuation before dispatch and invokes it with the original event arguments. The listener therefore received the payload envelope instead of the assembled assistant message. Provider responses that rendered DSML/XML tool calls as visible text also bypassed native tool-call parsing and could terminate a contract-review turn without executing `read`.

## Decision

The agent-loop package patch dispatches `agent/before-message` through the agent-scoped dispatcher, captures the assembled message in the innermost continuation, and falls back to that assembled message whenever a listener returns an invalid value. The desktop listener uses zero-argument `await next()` and no longer normalizes malformed assistant messages into empty content. Read evidence merges line coverage across paged calls and the gate explains missing, failed, or partial evidence to the model.

The pi-ai patch recognizes attribute, child-element, JSON-body, and DSML forms for read envelopes. It scans complete text blocks, preserves prose outside recovered envelopes, and assigns recovered tool-call indices from a separate namespace. Native provider `tool_calls` parsing remains the preferred path; visible-text recovery is temporary compatibility behavior.

## Verification

Both published-package patches were generated or checked against the `0.1.0-rc.6` npm tarballs. The patched pi-ai bundle passes `node --check`. Full Yarn installation and test execution remain CI responsibilities when the Corepack Yarn download is available.
