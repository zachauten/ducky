import { assertEquals } from "@std/assert";
import {
  createEnumSource,
  createRecordSource,
  createSealedInterfaceSource,
  mapType,
  PACKAGE_NAME,
  toJavaType,
  toPascalCase,
} from "./generate_records.ts";

Deno.test("toPascalCase converts string correctly", () => {
  assertEquals(toPascalCase("foo"), "Foo");
  assertEquals(
    toPascalCase("voice-config-service"),
    "VoiceConfigService",
  );
  assertEquals(toPascalCase("camelCase"), "CamelCase");
});

Deno.test("toPascalCase sanitizes special characters", () => {
  assertEquals(toPascalCase("invalid-name$#"), "InvalidName");
  assertEquals(toPascalCase("foo_bar"), "FooBar");
  assertEquals(toPascalCase("123start"), "Start");
  assertEquals(toPascalCase("mixed@invalid.chars!"), "MixedInvalidChars");
});

Deno.test("toJavaType maps OpenAPI types to Java types", () => {
  assertEquals(toJavaType("string", undefined), "String");
  assertEquals(toJavaType("integer", undefined), "Integer");
  assertEquals(toJavaType("integer", "int64"), "Long");
  assertEquals(toJavaType("string", "uuid"), "java.util.UUID");
  assertEquals(
    toJavaType("string", "date-time"),
    "java.time.OffsetDateTime",
  );
  assertEquals(toJavaType("string", "date"), "java.time.LocalDate");
  assertEquals(toJavaType("boolean", undefined), "Boolean");
  assertEquals(toJavaType("number", undefined), "Double");
  assertEquals(toJavaType("unknown", undefined), "Object");
});

Deno.test("mapType handles $ref", () => {
  // Mock apiSpecs to return a schema for the ref
  const mockSpecs: any = {
    components: {
      schemas: {
        "ComplexObject": { type: "object" },
        "SimpleAlias": { type: "string", format: "uuid" },
      },
    },
  };

  assertEquals(
    mapType({ $ref: "#/components/schemas/ComplexObject" }, mockSpecs),
    "ComplexObject",
  );

  // Test simple type alias resolution
  assertEquals(
    mapType({ $ref: "#/components/schemas/SimpleAlias" }, mockSpecs),
    "java.util.UUID",
  );

  // Fallback if not found
  assertEquals(
    mapType({ $ref: "#/components/schemas/NotFound" }, mockSpecs),
    "NotFound",
  );
});

Deno.test("mapType handles arrays", () => {
  assertEquals(
    mapType({ type: "array", items: { type: "string" } }, null),
    "List<String>",
  );
  assertEquals(
    mapType(
      { type: "array", items: { $ref: "#/components/schemas/Foo" } },
      null,
    ),
    "List<Foo>",
  );
});

const RECORD_TEMPLATE = `
package {{packageName}};

{{#hasList}}
import java.util.List;
{{/hasList}}

public record {{className}} (
    {{#fields}}
    {{{type}}} {{name}}{{^last}},{{/last}}
    {{/fields}}
) {}
`;

Deno.test("createRecordSource generates correct Java record", () => {
  const name = "TestRecord";
  const schema = {
    properties: {
      "id": { type: "string", format: "uuid" },
      "count": { type: "integer" },
    },
  };

  const expected = `
package ${PACKAGE_NAME};


public record TestRecord (
    java.util.UUID id,
    Integer count
) {}
`;

  // Ensure @ts-ignore or casting if strict check fails on partial schema
  const actual = createRecordSource(
    name,
    schema as any,
    null as any,
    RECORD_TEMPLATE,
  );
  // Normalize whitespace for comparison
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim(),
  );
});

const ENUM_TEMPLATE = `
package {{packageName}};

public enum {{className}} {
    {{#constants}}
    {{name}}{{^last}}, {{/last}}
    {{/constants}}
}
`;

Deno.test("createEnumSource generates correct Java enum", () => {
  const name = "TestEnum";
  const schema = {
    enum: ["VALUE_ONE", "VALUE_TWO"],
  };

  const expected = `
package ${PACKAGE_NAME};

public enum TestEnum {
    VALUE_ONE, VALUE_TWO
}
`;

  const actual = createEnumSource(name, schema as any, ENUM_TEMPLATE);
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim(),
  );
});

const INTERFACE_TEMPLATE = `
package {{packageName}};

public sealed interface {{className}} permits {{#implementations}}{{name}}{{^last}}, {{/last}}{{/implementations}} {
}
`;

Deno.test("createSealedInterfaceSource generates sealed interface", () => {
  const name = "Pet";
  const schema = {
    oneOf: [
      { $ref: "#/components/schemas/Dog" },
      { $ref: "#/components/schemas/Cat" },
    ],
    discriminator: {
      propertyName: "type",
    },
  };

  const expected = `
package ${PACKAGE_NAME};

public sealed interface Pet permits Dog, Cat {
}
`;

  const actual = createSealedInterfaceSource(
    name,
    schema as any,
    INTERFACE_TEMPLATE,
  );
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim(),
  );
});
