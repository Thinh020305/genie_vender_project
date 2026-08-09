// [AI] Shape invented — docs/erd.md describes tables only and says nothing
// about list responses. Kept separate from ApiResponse<T> rather than nested
// into it: ResponseInterceptor already wraps every handler's return value as
// { status, message, data }, so a paginated list surfaces as
// { status, message, data: { items, total, page, limit, totalPages } }.
// -> MENTION TO TEAM: if a frontend mock already assumes a different envelope
//    (e.g. `results` / `meta`), this is the single place to change it.
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
