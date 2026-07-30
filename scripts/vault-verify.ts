import { verifyStaticVaultFiles } from "../src/modules/knowledge/static-vault";
import { readStaticVaultRepo } from "./static-vault-repo";

function value(flag: string): string {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${flag}`);
  return process.argv[index + 1];
}

async function main() {
  const repo = value("--repo");
  const vault = verifyStaticVaultFiles(await readStaticVaultRepo(repo));
  console.log(
    `verified vault ${vault.id}: ${vault.topics.length} topics, ${vault.nodes.length} nodes, ${vault.links.length} links`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
