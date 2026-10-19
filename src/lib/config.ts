import { z } from 'zod';

export const configSchema = z.object({
  station: z.string().min(1),
  basePath: z.string().default('/'),
  csv: z.object({
    catalog: z.string().min(1),
    synonyms: z.string().min(1),
    settings: z.string().min(1),
  }),
  form: z.object({
    action: z.string(),
    fields: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(1),
      station: z.string().min(1),
      uladh: z.string().min(1),
      unit: z.string().min(1),
      order: z.string().min(1).optional(),
      consent: z.string().min(1),
      orderId: z.string().min(1),
      sku: z.string().min(1),
      itemName: z.string().min(1),
      size: z.string().min(1),
      quantity: z.string().min(1),
      childFirstName: z.string().min(1),
      childLastName: z.string().min(1),
      total: z.string().min(1).optional(),
    }),
    consentValue: z.string().default('Так'),
  }),
  coordinators: z
    .array(z.object({ name: z.string(), phone: z.string(), email: z.string().optional() }))
    .default([]),
});

export type SiteConfig = z.infer<typeof configSchema>;

export async function loadConfig(baseUrl: string): Promise<SiteConfig> {
  const res = await fetch(`${baseUrl}config.json`);
  if (!res.ok) throw new Error(`config.json: HTTP ${res.status}`);
  return configSchema.parse(await res.json());
}

/** Відносні шляхи (для локальних зразків) прив'язуються до base. */
export function resolveUrl(url: string, baseUrl: string): string {
  return /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.replace(/^\//, '')}`;
}
