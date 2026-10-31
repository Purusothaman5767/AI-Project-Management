# ProjectMind AI - Permanent Agent Instructions

## 1. AI Model Priority Hierarchy

For all work in this project, always use the highest-capability reasoning model authorized and available in the Antigravity environment, configured with the highest available reasoning effort:

1. **Primary Model**: `gemini-4-argon` (Reasoning Effort: Highest available)
2. **Fallback 1**: `gemini-3.8-flash` (Reasoning Effort: Highest available)
3. **Fallback 2**: `gemini-3.7-flash` (Reasoning Effort: Highest available)
4. **Fallback 3**: `gemini-3.6-flash` (if supported and accessible)
5. **Fallback 4**: `gemini-3.1-pro-preview` (if supported and accessible)
6. **Fallback 5**: `gemini-3.5-flash` (if supported and accessible)
7. **Fallback 6**: `gemini-2.5-pro` (if supported and accessible)
8. **Fallback 7**: `gemini-2.5-flash` (if supported and accessible)

*Note on Model Availability:* Model availability must be verified directly through the active Antigravity Model Selector dropdown or supported IDE configuration. Do not assume models present in general Gemini API endpoints or external lists are selectable inside Antigravity. Currently, `gemini-3.8-flash` (High) and `gemini-3.7-flash` represent the active top-tier models selectable in the IDE.

---

## 2. Model Fallback & Interruption Protocol

When a model encounters a confirmed quota/rate limit (429 Resource Exhausted), context token budget limit preventing continuation, or model-specific service outage:

### Implementation Constraint & Workaround Notice
> **Important**: Antigravity IDE controls model selection via the client IDE UI selector. The agent cannot programmatically switch the active session model mid-flight via code when an API quota error prevents model execution. Therefore, model switching requires a brief manual selection in the IDE UI. The agent and user must follow this standardized fallback workflow:

1. **Quota / Limit Detection**:
   - The agent will not repeatedly retry a model whose quota or rate limit is exhausted.
   - If approaching budget limits or if interrupted by a quota error, the agent must document the exact blocking issue.

2. **Checkpointing & State Preservation**:
   - Before model transition, save a concise progress checkpoint (`.agents/checkpoint.md` or session status notes) recording:
     - The interrupted task and target objectives.
     - Files modified and completed milestones.
     - Pending edits, next steps, and all active coding context.

3. **Model Switch Reporting & Guidance**:
   - Never switch models silently. Report the exact model switch and the trigger reason (e.g., "Hit quota limit on Gemini 3.8 Flash; switching to Gemini 3.7 Flash").
   - Explicitly guide the user to select the next available model in the priority hierarchy via the Antigravity Model Selector dropdown at the bottom of the chat panel.

4. **Task Resumption**:
   - Upon resuming under the new model, immediately load the progress checkpoint, project files, and existing conversation context.
   - Seamlessly continue the work without discarding context, requirements, or uncommitted changes.
   - If all available fallback models are exhausted, save a final checkpoint and report the specific blockers.
