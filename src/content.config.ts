import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const shared = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  updated: z.union([z.string(), z.date()]),
  related_paths: z.array(z.string()).default([]),
  related_guides: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  forum: z.array(z.union([z.string(), z.number()])).default([])
});

const paths = defineCollection({
  loader: glob({ pattern: '[^_]*.md', base: './content/paths' }),
  schema: shared.extend({ forum_gaps: z.array(z.string()).optional() })
});

const guides = defineCollection({
  loader: glob({ pattern: '[^_]*.md', base: './content/guides' }),
  schema: shared.extend({
    site_digest: z.string(),
    forum_tid: z.union([z.string(), z.number()]).nullable().optional(),
    forum_title: z.string().optional()
  })
});

export const collections = { paths, guides };
