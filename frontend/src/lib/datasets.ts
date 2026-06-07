import api from "./api"

interface AggregateParams {
  data: Record<string, unknown>[]
  group_by: string
  value_col: string
  aggregation: string
}

export async function aggregateData(params: AggregateParams) {
  const res = await api.post("/upload/aggregate", params)
  return res.data
}