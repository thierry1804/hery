export type RowCommon = {
  id: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export function mergeLww<T extends RowCommon>(local: T | undefined, incoming: T): T {
  if (!local) return incoming;
  if (incoming.updatedAt > local.updatedAt) return incoming;
  if (incoming.updatedAt < local.updatedAt) return local;
  return incoming;
}

export function mergeTables<T extends RowCommon>(localRows: T[], incomingRows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of localRows) byId.set(row.id, row);
  for (const incoming of incomingRows) {
    byId.set(incoming.id, mergeLww(byId.get(incoming.id), incoming));
  }
  return [...byId.values()];
}
