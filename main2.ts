import { parse } from "@readme/openapi-parser";
import { parseArgs } from "@std/cli/parse-args";
import { ensureDir } from "@std/fs/ensure-dir";
import mustache from "mustache";

const template = Deno.readTextFileSync("template.mustache");

type Array = {
    type: "array";
    items: {
        $ref: string;
    }
}

type Ref = {
    $ref: string;
}

if (import.meta.main) {
  const args = parseArgs(Deno.args);
  const openapi = await parse(args._[0] as string);
  console.log(openapi)
  const schemas = Object.entries(openapi.components.schemas);
  for (const [name, schema] of schemas) {
    const parsed = parse_schema(name, schema);
  }
}

function parse_schema(name: string, schema: any) {
    console.log(schema)
    const properties = Object.entries(schema.properties);
    for (const [name, typeinfo] of properties) {
        console.log(name);
        console.log(typeinfo)
    }
}
