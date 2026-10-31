// backend/src/validation/ai.ts
import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .min(1, 'Content cannot be empty')
    .max(4000, 'Content cannot exceed 4000 characters'),
});

export const assistantRequestSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message cannot exceed 4000 characters'),
  history: z
    .array(chatMessageSchema)
    .max(30, 'Conversation history cannot exceed 30 messages')
    .optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AssistantRequestInput = z.infer<typeof assistantRequestSchema>;
