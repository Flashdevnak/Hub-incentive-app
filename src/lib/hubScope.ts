export function recordScopeMatches(record: any, scopeType: string, scopeValue?: string) {
  const value = String(scopeValue || '').trim().toUpperCase();
  if (!value) return false;
  if (scopeType === 'HUB') {
    // Explicit import scope, when known, must take precedence over an Excel
    // physical hub identifier that may belong to a different reporting area.
    const scoped = String(record.import_hub || '').trim().toUpperCase();
    return scoped ? scoped === value : [record.hub_id, record.hub_name]
      .some((v) => String(v || '').trim().toUpperCase() === value);
  }
  if (scopeType === 'AREA') {
    const area = String(record.area || '').trim().toUpperCase();
    if (area) return area === value;
    return String(record.import_hub || '').trim().toUpperCase() === value;
  }
  return false;
}
