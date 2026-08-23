# Roadmap

The only planned major feature is the AI library (RAG). Everything else
waits for a real request (simple-first).

## RAG on llama.cpp (not started)

The Ollama-based librarian was removed 2026-08-22 with its module; RAG
will be reimplemented against the host **llama.cpp** server over the
OpenAI-compatible API. Operational facts worth keeping from that
removal:

- Serve: `llm-run <model.gguf> [ctx]` → `http://127.0.0.1:8080/v1`
  (`/v1/chat/completions`, `/v1/embeddings`; no API key by default).
  Fetch models with `llm-pull <hf-owner/repo> [quant]` (GGUF under
  `~/.lmstudio/models/…`); check fit with `llm-fit`.
- Suggested env for the new provider: `LLM_BASE_URL`
  (default `http://127.0.0.1:8080/v1`) and `LLM_MODEL` (label only —
  llama-server serves whatever `llm-run` loaded).
- **Container networking**: `llm-run` binds host loopback. The
  containerized deploy profile cannot reach it without
  `LLM_HOST=0.0.0.0` plus `host.docker.internal` (`extra_hosts:
  ["host.docker.internal:host-gateway"]`) — or keep the librarian a
  dev-only feature.
- **Embeddings**: `/v1/embeddings` embeds with whatever model is
  loaded; proper retrieval likely wants a dedicated embedding GGUF on a
  second `llama-server` (`LLM_PORT=8081 … --embeddings`), not the chat
  model. Decide when designing the pipeline, along with the vector
  store (pgvector in the existing Postgres is the simple-first
  candidate).

Design the pipeline when the earlier phases have settled in real use;
plan it as its own phase with owner sign-off.

## Smaller candidates (unscheduled)

- App-wide sweep of the remaining pre-refactor inline Vietnamese strings
  into the `T` translator (the refactor-era surfaces are already
  compliant).
- Re-verify the `--profile deploy` compose path end-to-end after the
  refactor.
- Bilingual UI (English strings) — the translator layer already gives it
  a seam.
- Google Workspace bridge (Forms intake) — schema was removed; design
  fresh if it becomes real.
