import clsx from 'clsx'

interface LikertScaleProps {
  value: number | null
  onChange: (value: number) => void
  labels?: string[]
  scale?: 5 | 7
}

const DEFAULT_LABELS_5 = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
]

const DEFAULT_LABELS_7 = [
  'Strongly Disagree',
  'Disagree',
  'Somewhat Disagree',
  'Neutral',
  'Somewhat Agree',
  'Agree',
  'Strongly Agree',
]

export function LikertScale({ value, onChange, labels, scale = 5 }: LikertScaleProps) {
  const defaultLabels = scale === 5 ? DEFAULT_LABELS_5 : DEFAULT_LABELS_7
  const displayLabels = labels || defaultLabels
  const scaleValues = Array.from({ length: scale }, (_, i) => i + 1)

  return (
    <div className="w-full">
      <div className="flex justify-between gap-2">
        {scaleValues.map((scaleValue, index) => (
          <button
            key={scaleValue}
            type="button"
            onClick={() => onChange(scaleValue)}
            className={clsx(
              'likert-option flex-1',
              value === scaleValue && 'selected'
            )}
          >
            <div className="likert-radio" />
            <span className="text-xs text-pearson-gray-600 text-center leading-tight">
              {displayLabels[index]}
            </span>
          </button>
        ))}
      </div>

      {/* Mobile-friendly scale indicator */}
      <div className="flex justify-between mt-3 text-xs text-pearson-gray-400 sm:hidden">
        <span>{displayLabels[0]}</span>
        <span>{displayLabels[displayLabels.length - 1]}</span>
      </div>
    </div>
  )
}
