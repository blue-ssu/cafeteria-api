import type { MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";

import type { MealWriteAuthTokenPayload } from "../types/meal.js";

const AUTH_HEADER_PREFIX = "Bearer ";
const EXPECTED_ISSUER = "ssu.blue";
const EXPECTED_SUBJECT = -1;

const unauthorized = () =>
  ({ error: "UNAUTHORIZED", message: "Authentication required." }) as const;
const invalidToken = () =>
  ({
    error: "INVALID_TOKEN",
    message: "Invalid or expired token.",
  }) as const;

export const mealWriteAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json(unauthorized(), 401);
  }

  if (!authHeader.startsWith(AUTH_HEADER_PREFIX)) {
    return c.json(invalidToken(), 401);
  }

  const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return c.json(invalidToken(), 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json(
      {
        error: "INVALID_TOKEN",
        message: "Invalid token configuration.",
      },
      401,
    );
  }

  let payload: unknown;
  try {
    payload = await verify(token, secret, "HS256");
  } catch {
    return c.json(invalidToken(), 401);
  }

  const typedPayload = payload as MealWriteAuthTokenPayload;
  const sub =
    typeof typedPayload.sub === "number"
      ? typedPayload.sub
      : typeof typedPayload.sub === "string"
        ? Number(typedPayload.sub)
        : null;

  if (
    typedPayload.iss !== EXPECTED_ISSUER ||
    sub !== EXPECTED_SUBJECT ||
    Number.isNaN(sub)
  ) {
    return c.json(invalidToken(), 401);
  }

  await next();
};
