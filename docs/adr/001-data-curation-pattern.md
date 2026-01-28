# ADR-001: Data Curation Pattern (External → LLM → Human)

**Status:** Accepted
**Date:** 2025-01-28
**Decision Makers:** Development Team

## Context

KWeX integrates external data from Faethm (occupations, tasks) and uses this data to generate surveys, questions, and insights. We observed a recurring pattern across multiple entities:

1. **External Data Ingestion** - Pull raw data from Faethm API/CSV
2. **LLM Enrichment** - AI-assisted processing to add context, generate content, or fill gaps
3. **Human Curation** - Manual review, adjustment, and configuration by users

This pattern appears in:

| Entity | External Source | LLM Step | Human Curation |
|--------|----------------|----------|----------------|
| Occupations | Faethm sync | (not yet) | Portfolio balance config |
| Tasks | Faethm tasks | EnrichedTask (friction points, complexity) | Time allocation, custom tasks |
| Questions | Task context | LLM generation from templates | (could add review/edit) |
| Friction Signals | Survey responses | (potential) | (potential) |

## Decision

**We will document this as a conceptual pattern but NOT build generic infrastructure at this time.**

### What We Will Do

1. **Naming Conventions** - Use consistent terminology across the codebase:
   - `sync` - Import from external source (Faethm)
   - `enrich` - LLM-assisted enhancement
   - `curate` - Human review and configuration

2. **API Shape Consistency** - Follow similar endpoint patterns:
   ```
   POST /{entity}/sync          # Import from external source
   POST /{entity}/enrich        # LLM enrichment
   GET  /{entity}               # List entities
   POST /{entity}               # Create custom entity
   PATCH /{entity}/{id}         # Human curation/updates
   ```

3. **State Tracking** - Where applicable, track data provenance:
   - `source` field: "faethm", "custom", "llm_generated"
   - `is_custom` flag for user-created entities

4. **UI Component Library** - Reuse UI patterns without a framework:
   - Search/filter modals
   - Category badges (Core/Support/Admin)
   - Percentage sliders
   - Tab-based curation interfaces

### What We Will NOT Do (Yet)

1. **Generic Base Classes** - No abstract `CuratableEntity` or `DataPipeline` classes
2. **Workflow Engine** - No formal state machine for sync→enrich→curate flow
3. **Unified Curation UI** - Each entity has its own specialized curation interface

## Consequences

### Positive

- **Simplicity** - Each entity can evolve independently
- **Flexibility** - Different entities have different curation needs
- **Debuggability** - Explicit code is easier to trace than generic frameworks
- **Speed** - No time spent building abstractions we may not need

### Negative

- **Some Duplication** - Similar patterns implemented separately
- **Consistency Risk** - Must manually ensure naming/API consistency
- **Future Work** - If we add 3+ more entities, we may want to revisit

### Neutral

- **Documentation Burden** - This ADR serves as the "pattern library"

## Triggers for Revisiting This Decision

Consider building generic infrastructure if:

1. We add 2+ more entities that follow all three steps (sync, enrich, curate)
2. We find ourselves fixing the same bug in multiple places
3. We need to add audit logging across all curation workflows
4. We want to build a unified "data quality dashboard"

## Related Patterns

- **CQRS** - Could separate read/write models if curation becomes complex
- **Event Sourcing** - Could track all curation changes if audit trail needed
- **Saga Pattern** - Could orchestrate multi-step enrichment workflows

## Examples in Codebase

### Task Curation (Current Implementation)

```
Faethm Tasks → GlobalTask (cached) → OccupationTask (assigned with time %)
                    ↓
            EnrichedTask (LLM adds friction points, complexity)
```

- External sync: `POST /occupations/sync` pulls tasks
- LLM enrichment: `POST /llm/occupations/{id}/enrich`
- Human curation: `TaskCurationModal` with time allocation sliders

### Question Generation (Current Implementation)

```
EnrichedTask context → LLM generates questions → Survey questions
                              ↓
                    LLMQuestionTemplate (cached for reuse)
```

- LLM generation: `POST /surveys/{id}/generate-questions`
- Caching: Templates stored in `llm_question_templates`
- Human curation: (Not yet implemented - potential future feature)

## References

- [Task Curation Feature PR](#) - Implementation of task curation
- [LLM Question Generation](#) - Question generation implementation
