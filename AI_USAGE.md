# AI Usage Declaration

Estimated AI assistance: **40%**

## AI-assisted areas
- Initial architecture drafting and milestone planning
- Boilerplate generation for service/module scaffolding
- Drafting of initial test structures and documentation outlines
- First-pass drafting for Docker container files (`Dockerfile`, `docker-compose.yml`, `.dockerignore`)
- First-pass drafting for multilingual fallback phrase lists and documentation wording

## Human-authored / human-validated areas
- Final architecture decisions and stack alignment to case constraints
- Business-flow simulation logic and fallback behavior
- Session memory behavior and API contract design
- Cross-session JSON persistence design and validation approach
- German intent handling decisions and deterministic fallback tuning
- Debugging, integration fixes, sample-audio regression testing, and test stabilization
- Final documentation accuracy checks and wording adjustments

## Verification approach
- Manual review and edits of generated code before commit
- Typecheck and test execution before milestone commit
- End-to-end sample audio regression runs with before/after comparison reports
- Incremental commit history to reflect actual implementation process
