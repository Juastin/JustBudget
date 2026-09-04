interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

const heightClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function getColorClass(percentage: number): string {
  if (percentage < 0 || percentage > 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function ProgressBar({ percentage, label, showPercentage = false, height = 'md' }: ProgressBarProps) {
  const visualWidth = Math.max(0, Math.min(percentage, 100));
  const colorClass = getColorClass(percentage);

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className={`${heightClasses[height]} rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${visualWidth}%` }}
        />
      </div>
    </div>
  );
}
