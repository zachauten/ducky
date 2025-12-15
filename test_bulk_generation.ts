import { basename, extname, join } from "@std/path";
import { ensureDir } from "@std/fs";

const SPECS_DIR = "downloaded-specs";
const TEST_OUTPUT_BASE = "test-output";

async function main() {
  console.log(`Scanning ${SPECS_DIR} for specs...`);

  try {
    const specs = [];
    for await (const entry of Deno.readDir(SPECS_DIR)) {
      if (
        entry.isFile &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".json"))
      ) {
        specs.push(entry.name);
      }
    }

    console.log(`Found ${specs.length} specs to test.`);

    let passed = 0;
    let failed = 0;
    const failedSpecs = [];

    await ensureDir(TEST_OUTPUT_BASE);

    for (const spec of specs) {
      const specPath = join(SPECS_DIR, spec);
      // Unique output dir for each spec to avoid collisions
      const specName = basename(spec, extname(spec));
      const outputDir = join(TEST_OUTPUT_BASE, specName);

      console.log(`Testing ${spec}...`);

      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "-A",
          "generate_records.ts",
          "--input",
          specPath,
          "--output",
          outputDir,
        ],
        stdout: "null", // Suppress stdout to keep logs clean
        stderr: "piped",
      });

      const { code, stderr } = await cmd.output();

      if (code === 0) {
        passed++;
        // console.log(`  [PASS] ${spec}`);
      } else {
        failed++;
        const errorText = new TextDecoder().decode(stderr);
        // console.error(`  [FAIL] ${spec}`);
        // console.error(errorText);
        failedSpecs.push({ name: spec, error: errorText });
      }
    }

    console.log("\n------------------------------------------------");
    console.log(`Test Complete.`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);

    if (failed > 0) {
      console.log("\nFailed Specs:");
      failedSpecs.forEach((f) => {
        console.log(`- ${f.name}`);
        // console.log(`  Error: ${f.error.split('\n')[0]}`); // Print first line of error
      });
    }
  } catch (err) {
    console.error("Error running bulk test:", err);
  }
}

if (import.meta.main) {
  main();
}
