export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVaultGitWorker } = await import("@/modules/knowledge/git-mirror");
    startVaultGitWorker();
  }
}
