import { assertEquals } from "@std/assert";
import { walkSync } from "@std/fs";
import { parse } from "@readme/openapi-parser";
import { parseOpenAPI } from "./main.ts";

Deno.test(async function addTest() {
  const dir = walkSync("./oas-examples/3.1/json");
  for await (const entry of dir) {
    if (entry.isFile) {
      const openapi = await parse(entry.path);
      await parseOpenAPI(openapi);
    }
  }
});
