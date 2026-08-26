/**
 * PostgREST caps every request at a fixed number of rows (1000 by default), so a
 * plain `.select()` silently truncates large tables. This helper pages through the
 * full result set with `.range()` until every row has been retrieved.
 *
 * It is client-agnostic (it never touches the supabase client directly): pass a
 * factory that applies `.range(from, to)` to a fresh query each call, e.g.:
 *
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from('profiles').select('*').order('created_at').range(from, to)
 *   )
 *
 * Always apply a deterministic `.order(...)` in the factory (add a unique tiebreaker
 * such as `id`), otherwise range paging can skip or duplicate rows.
 *
 * @throws the first PostgREST error encountered.
 */
export async function fetchAllRows<T = any>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0

  // Hard stop to avoid an unbounded loop if the server keeps returning full pages.
  for (let page = 0; page < 10000; page++) {
    const to = from + pageSize - 1
    const { data, error } = await queryFactory(from, to)
    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...(data as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}
