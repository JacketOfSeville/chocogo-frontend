import { requestApi } from './apiClient'

export interface OrderReport {
  periodDays: number
  summary: {
    orderCount: number
    revenue: number
    averageTicket: number
    canceledOrders: number
    deliveryOrders: number
    pickupOrders: number
  }
  salesTimeline: Array<{
    date: string
    orders: number
    revenue: number
  }>
  ordersByStatus: Array<{
    id: number
    label: string
    count: number
  }>
  topProducts: Array<{
    id: number
    name: string
    quantity: number
    revenue: number
  }>
}

export async function getOrderReport(days: number, token: string): Promise<OrderReport> {
  const params = new URLSearchParams({ days: String(days) })
  return requestApi<OrderReport>(`/relatorios/pedidos?${params.toString()}`, { token })
}