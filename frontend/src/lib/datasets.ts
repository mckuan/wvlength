import api from "./api"

interface AggregateParams {
  data: Record<string, unknown>[]
  group_by: string
  value_col: string
  aggregation: string
  bin_size?: number
}

interface MultiAggregateParams {
  data: Record<string, unknown>[]
  group_by: string
  value_cols: string[]
  aggregation: string
}

export async function aggregateData(params: AggregateParams) {
  const res = await api.post("/upload/aggregate", params)
  return res.data
}

export async function aggregateMultiple(params: MultiAggregateParams) {
  // call aggregate once per y column, merge results by x
  const results = await Promise.all(
    params.value_cols.map(col =>
      aggregateData({
        data: params.data,
        group_by: params.group_by,
        value_col: col,
        aggregation: params.aggregation,
      })
    )
  )

  // merge all results into one array keyed by x
  const merged: Record<string, Record<string, string | number>> = {}
  results.forEach((result, i) => {
    const col = params.value_cols[i]
    result.data.forEach((row: { x: string | number; y: number }) => {
      const key = String(row.x)
      if (!merged[key]) merged[key] = { x: row.x }
      merged[key][col] = row.y
    })
  })

  return Object.values(merged).sort((a, b) =>
    String(a.x).localeCompare(String(b.x), undefined, { numeric: true })
  )
}