import { APICallError } from "ai";
import { expect, test } from "vite-plus/test";
import { chatErrorMessage } from "../src/chat/errors.ts";

test.each([
  [400, "invalidRequest"],
  [401, "unauthorized"],
  [408, "requestTimeout"],
  [413, "requestTooLarge"],
  [500, "modelFailed"],
  [502, "modelFailed"],
  [503, "unconfigured"],
  [504, "requestTimeout"],
  [403, "connectionFailed"],
] as const)("an SDK HTTP error %i selects a safe localized category", (statusCode, expected) => {
  const error = new APICallError({
    message: "synthetic-private-provider-detail",
    url: "https://api.example/chat",
    requestBodyValues: undefined,
    statusCode,
    responseBody: '{"detail":"synthetic-model-key"}',
  });
  expect(chatErrorMessage(error)).toBe(expected);
});

test("network and unknown failures never display or interpret arbitrary error messages", () => {
  for (const error of [
    new TypeError("Failed to fetch"),
    new Error('{"error":"unauthorized"}'),
    new APICallError({
      message: "synthetic-private-provider-detail",
      url: "https://api.example/chat",
      requestBodyValues: undefined,
    }),
    null,
  ])
    expect(chatErrorMessage(error)).toBe("connectionFailed");
});
