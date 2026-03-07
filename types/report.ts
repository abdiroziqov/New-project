export interface ActivityRecord {
  id: string
  timestamp: string
  module: string
  action: string
  actor: string
  status: 'success' | 'warning' | 'info'
}

export interface ChartPoint {
  label: string
  value: number
  color?: string
}

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}
