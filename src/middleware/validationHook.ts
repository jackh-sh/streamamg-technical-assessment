import { z } from "@hono/zod-openapi";
import type { Hook } from "@hono/zod-openapi";

export const ValidationIssueSchema = z
    .object({
        code: z.string(),
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
    })
    .openapi("ValidationIssue");

export const ValidationErrorSchema = z
    .object({
        success: z.literal(false),
        issues: z.array(ValidationIssueSchema),
    })
    .openapi("ValidationError");

export const validationHook: Hook<any, any, any, any> = (result, c) => {
    if (!result.success) {
        return c.json(
            { success: false as const, issues: result.error.issues },
            400,
        );
    }
};
