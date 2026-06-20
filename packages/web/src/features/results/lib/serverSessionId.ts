// Sessions opened from the History/cloud browser carry a `cloud-`/`local-`
// display prefix on their id (see HistoryPage). The server identifies a session
// by its bare UUID — both for schema validation (PdfReportSchema) and for
// PDF/recommendation metering — so strip the prefix before any id is sent over
// the wire. A bare id (the normal post-completion flow) is returned unchanged.
export function toServerSessionId(id: string): string {
  return id.replace(/^(cloud|local)-/, '');
}
