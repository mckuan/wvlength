import { api } from "./api"

interface MultiAggregateParams {
  data: Record<string, unknown>[]
  file_id?: string
  group_by: string
  value_cols: string[]
  aggregation: string
  bin_size?: number
}

interface AggregateMultiResponse {
  data: Record<string, string | number>[]
  group_by: string
  aggregations: Record<string, string>
}

export async function aggregateMultiple(params: MultiAggregateParams) {
  const aggregations = Object.fromEntries(
    params.value_cols.map(col => [col, params.aggregation])
  )

  const res = await api.post<AggregateMultiResponse>("/graph/aggregate_multi", {
    file_id:    params.file_id,
    data:       params.file_id ? undefined : params.data,
    group_by:   params.group_by,
    aggregations,
    bin_size:   params.bin_size,
  })

  // backend returns rows keyed by original column names, e.g. { region: "west", revenue: 120 }
  // reshape to { x, <col>: value, ... } so existing chart components don't need to change
  return res.data.data
    .map(row => ({
      x: row[params.group_by],
      ...Object.fromEntries(params.value_cols.map(col => [col, row[col]])),
    }))
    .sort((a, b) =>
      String(a.x).localeCompare(String(b.x), undefined, { numeric: true })
    )
}

export async function getSummary(data: Record<string, unknown>[], columns: string[]) {
  const res = await api.post("/graph/summary", { data, columns })
  return res.data.summary
}