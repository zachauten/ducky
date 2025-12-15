import SwaggerParser from "@apidevtools/swagger-parser";
import Mustache from "mustache";
import { ensureDir, walk } from "@std/fs";
import { basename, extname, join } from "@std/path";
import { parse } from "@std/flags";
import { OpenAPIV3_1 } from "openapi-types";

const SPECS_FILE = "voice-config-service.yml";
const OUTPUT_DIR = "generated-sources";
export const PACKAGE_NAME = "com.bandwidth.voice.models";

async function generate(
  specsFile: string = SPECS_FILE,
  outputDir: string = OUTPUT_DIR,
) {
  try {
    // Read templates
    const recordTemplate = await Deno.readTextFile(
      "templates/record.mustache",
    );
    const enumTemplate = await Deno.readTextFile("templates/enum.mustache");
    const interfaceTemplate = await Deno.readTextFile(
      "templates/interface.mustache",
    );

    // Use parse to keep $refs intact
    const apiSpecs = (await SwaggerParser.parse(
      specsFile,
    )) as unknown as OpenAPIV3_1.Document;

    // Check if title exists, fallback if not
    const title = apiSpecs.info?.title || "Unknown API";
    const version = apiSpecs.info?.version || "0.0.0";

    console.log(
      "Processing %s (%s) version %s",
      specsFile,
      title,
      version,
    );

    await ensureDir(outputDir);

    if (apiSpecs.components && apiSpecs.components.schemas) {
      for (
        const [name, schema] of Object.entries(
          apiSpecs.components.schemas,
        )
      ) {
        await generateJavaFile(
          name,
          schema as OpenAPIV3_1.SchemaObject,
          apiSpecs,
          recordTemplate,
          enumTemplate,
          interfaceTemplate,
          outputDir,
        );
      }
    }
  } catch (err) {
    console.error(`Error parsing spec ${specsFile}:`, err);
    throw err;
  }
}

async function generateJavaFile(
  name: string,
  schema: OpenAPIV3_1.SchemaObject,
  apiSpecs: OpenAPIV3_1.Document,
  recordTemplate: string,
  enumTemplate: string,
  interfaceTemplate: string,
  outputDir: string,
) {
  // Determine if it's an Enum or a Record (Object)
  if (schema.enum) {
    const source = createEnumSource(name, schema, enumTemplate);
    await Deno.writeTextFile(
      join(outputDir, `${toPascalCase(name)}.java`),
      source,
    );
  } else if (schema.oneOf && schema.discriminator) {
    const source = createSealedInterfaceSource(name, schema, interfaceTemplate);
    await Deno.writeTextFile(
      join(outputDir, `${toPascalCase(name)}.java`),
      source,
    );
  } else if (schema.type === "object" || schema.properties) {
    const source = createRecordSource(
      name,
      schema,
      apiSpecs,
      recordTemplate,
    );
    await Deno.writeTextFile(
      join(outputDir, `${toPascalCase(name)}.java`),
      source,
    );
  } else if (schema.oneOf) {
    // console.log(`Skipping ${name} (type: oneOf)`);
  } else {
    // console.log(`Skipping ${name} (type: ${schema.type})`);
  }
}

export function createEnumSource(
  name: string,
  schema: OpenAPIV3_1.SchemaObject,
  template: string,
) {
  const view = {
    packageName: PACKAGE_NAME,
    className: toPascalCase(name),
    constants: schema.enum?.map((name, index) => ({
      name,
      last: index === (schema.enum?.length || 0) - 1,
    })),
  };

  return Mustache.render(template, view);
}

export function createRecordSource(
  name: string,
  schema: OpenAPIV3_1.SchemaObject,
  apiSpecs: OpenAPIV3_1.Document,
  template: string,
) {
  const fields = [];
  if (schema.properties) {
    const entrySet = Object.entries(schema.properties);
    for (let i = 0; i < entrySet.length; i++) {
      const [propName, propSchema] = entrySet[i];
      const javaType = mapType(
        propSchema as
          | OpenAPIV3_1.SchemaObject
          | OpenAPIV3_1.ReferenceObject,
        apiSpecs,
      );
      fields.push({
        type: javaType,
        name: propName,
        last: i === entrySet.length - 1,
      });
    }
  }

  const hasList = fields.some((f) => f.type.startsWith("List<"));

  const view = {
    packageName: PACKAGE_NAME,
    className: toPascalCase(name),
    fields: fields,
    hasList: hasList,
  };

  return Mustache.render(template, view);
}

export function mapType(
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  apiSpecs: OpenAPIV3_1.Document | null,
): string {
  if ("$ref" in schema) {
    const refName = schema.$ref.split("/").pop() || "";
    // Resolve the ref to check if it's a simple type
    const resolvedSchema = resolveSchema(refName, apiSpecs);

    if (resolvedSchema) {
      if (
        resolvedSchema.type === "object" || resolvedSchema.enum ||
        resolvedSchema.properties
      ) {
        // It's a complex type or enum -> Use the Class Name
        return toPascalCase(refName);
      } else {
        // It's a simple type alias (e.g. string uuid) -> Use the underlying Java type
        return toJavaType(
          resolvedSchema.type as string,
          resolvedSchema.format,
        );
      }
    }
    // Fallback if not found (shouldn't happen with valid specs)
    return toPascalCase(refName);
  }

  // Handle arrays
  if (schema.type === "array") {
    if (schema.items) {
      // Recursive call for items
      const itemType = mapType(
        schema.items as
          | OpenAPIV3_1.SchemaObject
          | OpenAPIV3_1.ReferenceObject,
        apiSpecs,
      );
      return `List<${itemType}>`;
    }
    return "List<Object>";
  }

  return toJavaType(schema.type as string, schema.format);
}

export function resolveSchema(
  refName: string,
  apiSpecs: OpenAPIV3_1.Document | null,
): OpenAPIV3_1.SchemaObject | null {
  if (apiSpecs && apiSpecs.components && apiSpecs.components.schemas) {
    const schema = apiSpecs.components.schemas[refName];
    if (schema && !("$ref" in schema)) {
      return schema as OpenAPIV3_1.SchemaObject;
    }
  }
  return null;
}

export function toJavaType(
  type: string | undefined,
  format: string | undefined,
): string {
  switch (type) {
    case "string":
      if (format === "date") return "java.time.LocalDate";
      if (format === "date-time") return "java.time.OffsetDateTime";
      if (format === "uuid") return "java.util.UUID";
      return "String";
    case "integer":
      if (format === "int64") return "Long";
      return "Integer";
    case "number":
      return "Double";
    case "boolean":
      return "Boolean";
    default:
      return "Object";
  }
}

export function createSealedInterfaceSource(
  name: string,
  schema: OpenAPIV3_1.SchemaObject,
  template: string,
) {
  if (!schema.oneOf) return "";

  const implementations = schema.oneOf.map((ref) => {
    if ("$ref" in ref) {
      return {
        name: toPascalCase(ref.$ref.split("/").pop() || ""),
        last: false,
      };
    }
    return { name: "Unknown", last: false };
  }).filter((i) => i.name !== "Unknown");

  if (implementations.length > 0) {
    implementations[implementations.length - 1].last = true;
  }

  const view = {
    packageName: PACKAGE_NAME,
    className: toPascalCase(name),
    implementations: implementations,
  };

  return Mustache.render(template, view);
}

export function toPascalCase(str: string) {
  // Remove non-alphanumeric characters, then split
  const parts = str.split(/[^a-zA-Z0-9]/).filter((s) => s.length > 0);

  if (parts.length === 0) return "";

  // Join parts and ensure first char is not a digit
  let result = parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(
    "",
  );

  // Java identifiers cannot start with a digit
  if (/^[0-9]/.test(result)) {
    // Option 1: Strip leading digits (as per test expectation "123start" -> "Start")
    // Option 2: Prefix with underscore
    result = result.replace(/^[0-9]+/, "");
    // Re-capitalize if needed, though stripping digits from start usually leaves a char or empty string
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
  }
  return result;
}

// Run
if (import.meta.main) {
  const flags = parse(Deno.args, {
    string: ["input", "output"],
    alias: { i: "input", o: "output" },
  });

  const inputPath = flags.input || SPECS_FILE;
  const outputBaseDir = flags.output || OUTPUT_DIR;

  // Check if input is directory
  let isDirectory = false;
  try {
    const info = await Deno.stat(inputPath);
    isDirectory = info.isDirectory;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.error(`Input path not found: ${inputPath}`);
      Deno.exit(1);
    }
    throw err;
  }

  if (isDirectory) {
    console.log(`Scanning directory: ${inputPath}`);
    for await (
      const entry of walk(inputPath, {
        exts: [".yaml", ".yml", ".json"],
        skip: [/node_modules/, /\.git/],
      })
    ) {
      if (entry.isFile) {
        const specName = basename(entry.path, extname(entry.path));
        const outputDir = join(outputBaseDir, specName);
        // console.log(`Found spec: ${entry.path} -> ${outputDir}`);
        try {
          await generate(entry.path, outputDir);
        } catch (e) {
          console.error(`[FAIL] Failed to generate for ${entry.path}`);
        }
      }
    }
  } else {
    // Single file mode
    await generate(inputPath, outputBaseDir);
  }
}
