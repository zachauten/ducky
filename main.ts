import { parse } from "@readme/openapi-parser";
import { parseArgs } from "@std/cli/parse-args";
import { ensureDir } from "@std/fs/ensure-dir";
import mustache from "mustache";

interface Field {
  name: string;
  signature: string;
  imports: string[];
  comma: boolean;
}

type StringTypeInfo = {
  type: "string";
  enum?: string[];
};

type IntegerTypeInfo = {
  type: "integer";
  format?: string;
};

type ArrayTypeInfo = {
  type: "array";
  items: {
    $ref: `#/components/schemas/${string}`;
  };
};

type TypeInfo = StringTypeInfo | IntegerTypeInfo | ArrayTypeInfo;

interface FieldInfo {
  signature: string;
  imports: string[];
}

const template = Deno.readTextFileSync("template.mustache");

if (import.meta.main) {
  const args = parseArgs(Deno.args);
  const openapi = await parse(args._[0] as string);
  await parseOpenAPI(openapi);
}

async function parseOpenAPI(openapi: any) {
  for (const [name, details] of Object.entries(openapi.components.schemas)) {
    const fields = Object.entries(details.properties).map((
      [name, typeinfo],
    ) => {
      const optional = !details.required?.includes(name);
      const { signature, imports } = mapTypeToJava(typeinfo, optional);

      return {
        name,
        signature,
        imports,
        comma: true,
      };
    });

    const imports = fields.flatMap((field) => field.imports);
    await save(fields, imports, name);
  }
}

async function save(
  fields: Field[],
  imports: string[],
  name: string,
  pkg: string = "com.zach.models",
) {
  fields.at(-1).comma = false;
  const java = mustache.render(template, {
    package: pkg,
    imports: [...new Set(imports)].map((path) => ({ path })),
    name,
    fields,
  });

  const path = pkg.replaceAll(".", "/");
  await ensureDir(path);
  Deno.writeTextFileSync(`${path}/${name}.java`, java);
}

function mapTypeToJava(typeinfo: TypeInfo, optional: boolean): FieldInfo {
  let signature;
  const imports: string[] = [];
  if (typeinfo.type === "integer") {
    signature = "Integer";
  } else if (typeinfo.type === "string") {
    signature = "String";
  } else if (typeinfo.type === "array") {
    const inner = typeinfo.items.$ref.split("/").at(-1);
    signature = `List<${inner}>`;
    imports.push("java.util.List");
  }

  if (signature === undefined) {
    throw new Error(`Type is undefined: ${typeinfo}`);
  }

  if (optional) {
    imports.push("java.util.Optional");
    return { signature: `Optional<${signature}>`, imports };
  } else {
    return { signature, imports };
  }
}
