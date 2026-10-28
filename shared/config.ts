import { z } from "zod/mini";

export const chatConfigSchema = z.strictObject({
  mode: z.enum(["demo", "model", "unavailable"]),
  requiresAccessToken: z.boolean(),
});

export type ChatConfig = z.infer<typeof chatConfigSchema>;
