import SwaggerParser from "@apidevtools/swagger-parser";
import Mustache from "mustache";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { OpenAPIV3_1 } from "openapi-types";

const SPECS_FILE = "voice-config-service.yml";
const OUTPUT_DIR = "generated-sources";
export const PACKAGE_NAME = "com.bandwidth.voice.models";

async function generate() {
  try {
    // Read templates
    const recordTemplate = await Deno.readTextFile(
      "templates/record.mustache",
    );
    const enumTemplate = await Deno.readTextFile("templates/enum.mustache");

    // Use parse to keep $refs intact
    const apiSpecs = (await SwaggerParser.parse(
      SPECS_FILE,
    )) as unknown as OpenAPIV3_1.Document;
    console.log(
      "API name: %s, Version: %s",
      apiSpecs.info.title,
      apiSpecs.info.version,
    );

    await ensureDir(OUTPUT_DIR);

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
        );
      }
    }
  } catch (err) {
    console.error("Error parsing spec:", err);
  }
}

async function generateJavaFile(
  name: string,
  schema: OpenAPIV3_1.SchemaObject,
  apiSpecs: OpenAPIV3_1.Document,
  recordTemplate: string,
  enumTemplate: string,
) {
  console.log(`Generating ${name}...`);

  // Determine if it's an Enum or a Record (Object)
  if (schema.enum) {
    const source = createEnumSource(name, schema, enumTemplate);
    await Deno.writeTextFile(
      join(OUTPUT_DIR, `${toPascalCase(name)}.java`),
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
      join(OUTPUT_DIR, `${toPascalCase(name)}.java`),
      source,
    );
  } else if (schema.oneOf) {
    console.log(
      `Skipping ${name} (type: oneOf) - complex composition not fully supported yet`,
    );
  } else {
    console.log(
      `Skipping ${name} (type: ${schema.type}) - might be a simple type alias`,
    );
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
    // If the resolved schema is ALSO a ref, we might want to recurse, but for now just return null or handle purely ref-based alias?
    // Our logic in mapType handles simple aliases if they resolve to a schema with type.
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

export function toPascalCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run
if (import.meta.main) {
  generate();
}
