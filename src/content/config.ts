// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    chapter: z.number(),
    description: z.string(),
  }),
});

export const collections = { lessons };
