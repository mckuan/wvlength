interface Props {
  type: string
  className?: string
}

export default function ChartTypeIcon({ type, className = "w-4 h-4" }: Props) {
  switch (type) {
    case "bar":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path d="M5 15h3v5H5zm5.5-6h3v11h-3zM16 11h3v9h-3z" />
        </svg>
      )
    case "line":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 16l5-6 4 3 6-7" />
        </svg>
      )
    case "scatter":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
          <circle cx="5" cy="14" r="1.3" /><circle cx="9" cy="7" r="1.3" />
          <circle cx="13" cy="12" r="1.3" /><circle cx="16" cy="6" r="1.3" />
        </svg>
      )
    case "histogram":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
          <path d="M4 16h3v3H4zm5-6h3v9H9zm5-5h3v14h-3z" />
        </svg>
      )
    case "boxplot":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
          <line x1="10" y1="3" x2="10" y2="7" />
          <line x1="10" y1="13" x2="10" y2="17" />
          <rect x="5" y="7" width="10" height="6" />
          <line x1="5" y1="10" x2="15" y2="10" />
        </svg>
      )
    case "heatmap":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
          <rect x="2" y="2" width="7" height="7" opacity="0.3" />
          <rect x="11" y="2" width="7" height="7" opacity="0.9" />
          <rect x="2" y="11" width="7" height="7" opacity="0.6" />
          <rect x="11" y="11" width="7" height="7" opacity="1" />
        </svg>
      )
    default:
      return null
  }
}