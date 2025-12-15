import { join } from "@std/path";
import { ensureDir } from "@std/fs";

const SPECS_FILE = "voice-config-service.yml";
const COMPILATION_TEST_DIR = "compilation_test_output";

async function main() {
  console.log("Starting Java Compilation Test...");

  try {
    // 1. Generate Code
    console.log(
      `Generating code from ${SPECS_FILE} into ${COMPILATION_TEST_DIR}...`,
    );
    await ensureDir(COMPILATION_TEST_DIR);

    const genCmd = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "-A",
        "generate_records.ts",
        "--input",
        SPECS_FILE,
        "--output",
        COMPILATION_TEST_DIR,
      ],
    });

    const genOutput = await genCmd.output();
    if (genOutput.code !== 0) {
      console.error("Failed to generate code.");
      console.error(new TextDecoder().decode(genOutput.stderr));
      Deno.exit(1);
    }

    // 2. Compile Code
    console.log("Compiling generated Java files...");

    // Find all .java files
    const javaFiles = [];
    for await (const entry of Deno.readDir(COMPILATION_TEST_DIR)) {
      if (entry.isFile && entry.name.endsWith(".java")) {
        javaFiles.push(join(COMPILATION_TEST_DIR, entry.name));
      }
    }

    if (javaFiles.length === 0) {
      console.error("No Java files found to compile.");
      Deno.exit(1);
    }

    const javacCmd = new Deno.Command("javac", {
      args: javaFiles,
    });

    const javacOutput = await javacCmd.output();

    if (javacOutput.code === 0) {
      console.log("✅ Compilation Successful!");

      // Cleanup .class files and output dir if successful
      // await Deno.remove(COMPILATION_TEST_DIR, { recursive: true });
    } else {
      console.error("❌ Compilation Failed.");
      console.error(new TextDecoder().decode(javacOutput.stderr));
      Deno.exit(1);
    }
  } catch (err) {
    console.error("An error occurred:", err);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
