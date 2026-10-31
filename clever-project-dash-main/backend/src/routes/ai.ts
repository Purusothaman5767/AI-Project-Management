// backend/src/routes/ai.ts
import express, { Response } from 'express';
import { verifyAccessToken, AuthRequest } from '../middleware/auth';
import { assistantRequestSchema } from '../validation/ai';
import {
  chatWithAssistant,
  AIConfigError,
  AIRateLimitError,
  AIProviderError,
} from '../services/aiService';

const router = express.Router();

/**
 * POST /api/ai/assistant
 * Authenticated endpoint to converse with the AI Assistant grounded in
 * the user's active projects and tasks.
 */
router.post('/assistant', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Validate request body
    const parseResult = assistantRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        message: 'Invalid request body',
        errors,
      });
    }

    // 2. Ensure authenticated user identity exists
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) {
      return res.status(401).json({ message: 'Unauthorized: User identity not found' });
    }

    const { message, history } = parseResult.data;

    // 3. Process assistant request
    const result = await chatWithAssistant({
      userId,
      role,
      message,
      history,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    // Sanitized logging without exposing secrets or keys
    console.error('[AI Assistant Route Error]:', err?.message || 'Unknown error');

    if (err instanceof AIConfigError || err.code === 'CONFIG_MISSING' || err.statusCode === 503) {
      return res.status(503).json({
        message:
          err.message ||
          'AI Assistant is currently unavailable because GEMINI_API_KEY is not configured on the server.',
        code: 'CONFIG_MISSING',
      });
    }

    if (err instanceof AIRateLimitError || err.code === 'RATE_LIMIT' || err.statusCode === 429) {
      return res.status(429).json({
        message: err.message || 'AI service rate limit reached. Please wait a moment and try again.',
        code: 'RATE_LIMIT',
      });
    }

    if (err instanceof AIProviderError || err.code === 'PROVIDER_ERROR' || err.statusCode === 502) {
      return res.status(502).json({
        message: err.message || 'AI provider encountered an error while processing the request.',
        code: 'PROVIDER_ERROR',
      });
    }

    return res.status(err.statusCode || 500).json({
      message: err.message || 'Failed to process AI assistant request',
      code: err.code || 'INTERNAL_ERROR',
    });
  }
});

export default router;
