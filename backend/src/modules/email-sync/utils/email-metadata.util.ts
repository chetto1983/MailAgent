export function mergeEmailStatusMetadata(
  existing: Record<string, any> | null | undefined,
  status: 'deleted' | 'active',
): Record<string, any> {
  const metadata = { ...(existing ?? {}) };
  metadata.status = status;

  if (status === 'deleted') {
    if (!metadata.deletedAt) {
      metadata.deletedAt = new Date().toISOString();
    }
  } else if (metadata.deletedAt) {
    delete metadata.deletedAt;
  }

  return metadata;
}
