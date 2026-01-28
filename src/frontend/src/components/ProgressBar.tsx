interface ProgressBarProps {
  current: number
  total: number
  label?: string
  showPercentage?: boolean
}

export function ProgressBar({ current, total, label, showPercentage = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-pearson-gray-600">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-pearson-gray-700">{percentage}%</span>
          )}
        </div>
      )}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1 text-xs text-pearson-gray-500">
        <span>Question {current} of {total}</span>
      </div>
    </div>
  )
}
