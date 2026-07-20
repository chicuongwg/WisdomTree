// Refuses a build while a server is listening on the app port.
//
// `next build` and `next start` both write .next. Building underneath a
// running server leaves a tree that starts but 404s every route, or dies with
// MODULE_NOT_FOUND — a failure that looks like broken code and is not. The
// README has warned about it for a while; a warning you have to remember is
// weaker than a check that runs itself, so this is wired to npm's `prebuild`
// hook and runs before every `npm run build`.
//
// Binding the port is the test, so there is no dependency on ss/lsof and no
// parsing of their output. Set SKIP_PORT_CHECK=1 to build anyway.
import { createServer } from "node:net";

const port = Number(process.env.PORT ?? 3000);

if (process.env.SKIP_PORT_CHECK === "1") process.exit(0);

const probe = createServer();

probe.once("error", (err) => {
  if (err.code !== "EADDRINUSE") process.exit(0); // not our business
  console.error(
    `\nRefusing to build: something is already listening on port ${port}.\n\n` +
      "  next build and next start both write .next, and building under a\n" +
      "  running server produces one that 404s every route.\n\n" +
      "  Stop the server, then:  rm -rf .next && npm run build\n" +
      `  Building anyway:        SKIP_PORT_CHECK=1 npm run build\n`,
  );
  process.exit(1);
});

probe.once("listening", () => probe.close(() => process.exit(0)));
probe.listen(port, "0.0.0.0");
