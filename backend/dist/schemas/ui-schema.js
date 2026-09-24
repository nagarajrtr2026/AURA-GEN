import { z } from 'zod';
export const generatedUIFieldSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['text_input', 'number_input', 'select_input', 'date_input', 'checkbox', 'button']),
    label: z.string().min(1),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});
export const generatedUIStepSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    fields: z.array(generatedUIFieldSchema),
});
export const generatedUIPayloadSchema = z.object({
    id: z.string().min(1),
    version: z.string().min(1),
    type: z.enum(['step_wizard', 'financial_summary']),
    component: z.enum(['step_wizard', 'financial_summary']),
    props: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        fields: z.array(generatedUIFieldSchema).optional(),
        steps: z.array(generatedUIStepSchema).optional(),
    }),
    fields: z.array(z.string()),
    state: z.record(z.unknown()),
    timestamp: z.number(),
});
export const telemetryInputSchema = z.object({
    cursorVelocity: z.number().min(0),
    hesitation: z.number().min(0),
    repeatedClicks: z.number().min(0),
    fieldErrors: z.number().min(0),
    activeField: z.string().nullable().optional(),
});
export const frictionMessageSchema = z.object({
    event: z.enum(['telemetry_update', 'ui_generation_started', 'ui_generation_complete', 'ui_generation_error', 'ui_fallback']),
    data: z.record(z.unknown()).optional(),
    timestamp: z.number().optional(),
});
