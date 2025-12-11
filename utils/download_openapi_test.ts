import { assertEquals } from "@std/assert";
import { convertGitHubBlobToRaw, guessFilename } from "./download_openapi.ts";

Deno.test("convertGitHubBlobToRaw converts github blob urls", () => {
  const blobUrl =
    "https://github.com/Bandwidth/api-docs/blob/main/site/specs/voice.yml";
  const expected =
    "https://raw.githubusercontent.com/Bandwidth/api-docs/main/site/specs/voice.yml";
  assertEquals(convertGitHubBlobToRaw(blobUrl), expected);
});

Deno.test("convertGitHubBlobToRaw ignores other urls", () => {
  const rawUrl = "https://raw.githubusercontent.com/foo/bar/main/spec.yaml";
  assertEquals(convertGitHubBlobToRaw(rawUrl), rawUrl);

  const otherUrl = "https://example.com/spec.json";
  assertEquals(convertGitHubBlobToRaw(otherUrl), otherUrl);
});

Deno.test("guessFilename prefers original filename", () => {
  assertEquals(
    guessFilename("http://example.com/foo", "my-spec.yaml"),
    "my-spec.yaml",
  );
});

Deno.test("guessFilename extracts from url", () => {
  assertEquals(
    guessFilename("http://example.com/path/to/my-spec.json"),
    "my-spec.json",
  );
  assertEquals(
    guessFilename("https://raw.githubusercontent.com/org/repo/main/spec.yaml"),
    "spec.yaml",
  );
});

Deno.test("guessFilename falls back to openapi.yaml", () => {
  assertEquals(guessFilename("http://example.com/"), "openapi.yaml");
  assertEquals(guessFilename("http://example.com"), "openapi.yaml");
});
