import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { CanvasBoardModel } from '../models/CanvasBoard';

const CanvasPayloadSchema = z.object({
  data: z.unknown(),
});

const MAX_CANVAS_BYTES = 250_000;

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return userId;
}

function ensureObject(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    throw new AppError(400, 'INVALID_CANVAS_DATA', 'Canvas data must be an object');
  }
  return data as Record<string, unknown>;
}

function ensureSizeWithinLimit(data: unknown) {
  const raw = JSON.stringify(data);
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > MAX_CANVAS_BYTES) {
    throw new AppError(
      413,
      'CANVAS_TOO_LARGE',
      `Canvas payload exceeds ${MAX_CANVAS_BYTES} bytes`
    );
  }
}

export async function handleGetCanvas(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const board = await CanvasBoardModel.findOne({ userId }).lean();
    res.json({ data: board?.data ?? null });
  } catch (err) {
    next(err);
  }
}

export async function handleUpsertCanvas(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const parsed = CanvasPayloadSchema.parse(req.body);
    const data = ensureObject(parsed.data);
    ensureSizeWithinLimit(data);

    const board = await CanvasBoardModel.findOneAndUpdate(
      { userId },
      { data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ data: board?.data ?? data });
  } catch (err) {
    next(err);
  }
}
