import { tool } from "ai";
import { z } from "zod";
import { project } from "../shared/project.ts";

export const templateInfoSchema = z.strictObject({
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  description: z.string(),
  tagline: z.string(),
  serverTime: z.iso.datetime(),
  capabilities: z.array(z.string()),
});

export function getTemplateInfo(signal?: AbortSignal) {
  signal?.throwIfAborted();
  return templateInfoSchema.parse({
    name: project.name,
    displayName: project.displayName,
    version: project.version,
    description: project.description,
    tagline: project.tagline,
    serverTime: new Date().toISOString(),
    capabilities: ["streaming-responses", "server-tools", "optional-model-provider"],
  });
}

export const agentTools = {
  getTemplateInfo: tool({
    description: "Read the current template's public name, version, capabilities and server time.",
    inputSchema: z.strictObject({}),
    outputSchema: templateInfoSchema,
    execute: (_input, { abortSignal }) => getTemplateInfo(abortSignal),
  }),
};
