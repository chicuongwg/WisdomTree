# RAG reimplementation note (Ollama removed 2026-08-22)

## What was removed

- `docker-compose.yml`: the `ollama` and `ollama-init` services, the
  `ollamadata` volume, and the `OLLAMA_URL`/`OLLAMA_MODEL` environment of
  `app` (plus the `ollama-init` dependency).
- The host machine: the `wisdomtree-ollama-1` container and the
  `wisdomtree_ollamadata` volume (4.7 GB, held only a `qwen2.5:7b` pull).
- Ollama is gone host-wide, not just here: the CLI was removed from the nix
  profile and every other consumer (Zed) now talks to the llama.cpp server.

## Why

The host standardized on a single local-LLM stack: **llama.cpp with the
Vulkan backend**, launched by `llm-run` (declarative in `/etc/nixos`,
measured ~1.8x faster than Ollama's engine on this iGPU). Running a second
engine inside Docker duplicated models and RAM for a slower result.

## What still references Ollama (to replace during the reimplementation)

- `src/modules/index/service.ts` — `ollamaLibrarianProvider` calls the
  Ollama-native API (`/api/chat`, `/api/tags`) and reads `OLLAMA_URL` /
  `OLLAMA_MODEL`. Until reimplemented, the librarian degrades to its
  existing "Thủ thư AI chưa sẵn sàng" path; nothing else breaks.
- `.env.example` now carries only a pointer to this note.

## Target for the new RAG implementation

Talk to the host llama.cpp server over the **OpenAI-compatible API** instead
of any engine-specific one:

- Serve: `llm-run <model.gguf> [ctx]` → `http://127.0.0.1:8080/v1`
  (`/v1/chat/completions`, `/v1/embeddings`; no API key by default).
- Fetch models: `llm-pull <hf-owner/repo> [quant]` → plain GGUF files under
  `~/.lmstudio/models/<owner>/<repo>/` (shared with LM Studio; prefer
  Unsloth `UD-Q4_K_XL` quants).
- Fit check: `llm-fit <model.gguf> [ctx]` before serving a new model.
  Verified: Qwen2.5-Coder-14B Q4_K_M fully offloads at ctx 8192.
- Suggested env for the new provider: `LLM_BASE_URL`
  (default `http://127.0.0.1:8080/v1`) and `LLM_MODEL` (label only —
  llama-server serves whatever model `llm-run` loaded).

### Container networking gotcha

`llm-run` binds `127.0.0.1` on the **host**. The dev flow (host-run
Next.js via `npm run demo`) reaches it directly. The `--profile deploy`
containerized app does NOT — if the deploy profile needs the librarian,
either run the server with `LLM_HOST=0.0.0.0 llm-run …` and point the app at
`host.docker.internal` (add `extra_hosts: ["host.docker.internal:host-gateway"]`),
or keep the librarian a dev-only feature.

### Embeddings caveat

`/v1/embeddings` on llama-server embeds with whatever model is loaded; for
proper RAG retrieval you likely want a second, dedicated embedding model
(e.g. an embedding GGUF served by another `llm-run`/`llama-server` instance
on `LLM_PORT=8081` with `--embeddings`), not the chat model's hidden states.
Decide this when designing the pipeline.
