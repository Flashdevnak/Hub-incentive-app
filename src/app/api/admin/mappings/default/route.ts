import { ok } from '@/lib/http';
import { defaultMappings } from '@/lib/importer';
export async function GET() { return ok({ mappings: defaultMappings }); }
