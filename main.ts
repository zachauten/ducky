import { parse } from "@readme/openapi-parser";
import { parseArgs } from "@std/cli/parse-args";
import { ensureDir } from "@std/fs/ensure-dir";
import mustache from "mustache";

if (import.meta.main) {
  const template = Deno.readTextFileSync("template.mustache");
  const javaPackage = "com.zach.models";

  const args = parseArgs(Deno.args);
  const openapi = await parse(args._[0] as string);

  for (const [record, details] of Object.entries(openapi.components.schemas)) {
    const fields = Object.entries(details.properties).map((
      [name, typeinfo],
    ) => ({
      name,
      type: mapTypeToJava(typeinfo),
      comma: true,
    }));
    fields.at(-1).comma = false;

    const java = mustache.render(template, {
      package: javaPackage,
      record,
      fields,
    });

    const path = javaPackage.replaceAll(".", "/");
    await ensureDir(path);
    Deno.writeTextFileSync(`${path}/${record}.java`, java);
  }
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

function mapTypeToJava(typeinfo: TypeInfo) {
  if (typeinfo.type === "integer") {
    return "int";
  } else if (typeinfo.type === "string") {
    return "String";
  } else if (typeinfo.type === "array") {
    const inner = typeinfo.items.$ref.split("/").at(-1);
    return `List<${inner}>`;
  }
}
