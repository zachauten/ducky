import { defineEventHandler, EventHandler, setResponseHeader } from "h3";
import yaml from "yaml";

export const createOpenapiYamlRoute = (): EventHandler<Request, unknown> =>
  defineEventHandler(async (event) => {
    const document = await $fetch("/api/openapi.json");

    setResponseHeader(event, "Content-Type", "application/yaml");

    return yaml.stringify(document, { indent: 2 });
  });
