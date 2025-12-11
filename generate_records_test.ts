import { assertEquals } from "@std/assert";
import {
  createEnumSource,
  createRecordSource,
  mapType,
  PACKAGE_NAME,
  toJavaType,
  toPascalCase,
} from "./generate_records.ts";

Deno.test("toPascalCase converts string correctly", () => {
  assertEquals(toPascalCase("foo"), "Foo");
  assertEquals(
    toPascalCase("voiceConfigurationPackage"),
    "VoiceConfigurationPackage",
  );
  assertEquals(toPascalCase("URL"), "URL");
});

Deno.test("toJavaType maps OpenAPI types to Java types", () => {
  assertEquals(toJavaType("string", undefined), "String");
  assertEquals(toJavaType("string", "uuid"), "java.util.UUID");
  assertEquals(toJavaType("string", "date-time"), "java.time.OffsetDateTime");
  assertEquals(toJavaType("integer", "int32"), "Integer");
  assertEquals(toJavaType("integer", "int64"), "Long");
  assertEquals(toJavaType("boolean", undefined), "Boolean");
  assertEquals(toJavaType("unknown", undefined), "Object");
});

Deno.test("mapType handles simple types", () => {
  const schema = { type: "string" };
  assertEquals(mapType(schema, null), "String");
});

Deno.test("mapType handles arrays", () => {
  const schema = {
    type: "array",
    items: { type: "string" },
  };
  assertEquals(mapType(schema, null), "List<String>");
});

Deno.test("mapType handles complex refs via lookup", () => {
  const apiSpecs = {
    components: {
      schemas: {
        "ComplexObject": { type: "object" },
      },
    },
  };
  const schema = { $ref: "#/components/schemas/ComplexObject" };
  assertEquals(mapType(schema, apiSpecs), "ComplexObject");
});

Deno.test("mapType handles simple refs via lookup", () => {
  const apiSpecs = {
    components: {
      schemas: {
        "SimpleAlias": { type: "string", format: "uuid" },
      },
    },
  };
  const schema = { $ref: "#/components/schemas/SimpleAlias" };
  assertEquals(mapType(schema, apiSpecs), "java.util.UUID");
});

const RECORD_TEMPLATE = `
package {{packageName}};

import java.util.List;

public record {{className}} (
{{#fields}}
    {{type}} {{name}}{{^last}},{{/last}}
{{/fields}}
) {}
`;

const ENUM_TEMPLATE = `
package {{packageName}};

public enum {{className}} {
{{#constants}}
    {{name}}{{^last}},{{/last}}
{{/constants}}
}
`;

Deno.test("createEnumSource generates correct enum code", () => {
  const name = "TestEnum";
  const schema = {
    enum: ["ONE", "TWO", "THREE"],
  };

  const expected = `
package ${PACKAGE_NAME};

public enum TestEnum {

    ONE,
    TWO,
    THREE
}
`;
  // Normalize whitespace for comparison
  const actual = createEnumSource(name, schema, ENUM_TEMPLATE);
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim(),
  );
});

Deno.test("createRecordSource generates correct record code", () => {
  const name = "TestRecord";
  const schema = {
    properties: {
      "id": { type: "string", format: "uuid" },
      "count": { type: "integer" },
    },
  };
  // Mock apiSpecs not needed for simple properties

  const expected = `
package ${PACKAGE_NAME};

import java.util.List;

public record TestRecord (

    java.util.UUID id,
    Integer count
) {}
`;
  const actual = createRecordSource(name, schema, null, RECORD_TEMPLATE);
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim(),
  );
});
