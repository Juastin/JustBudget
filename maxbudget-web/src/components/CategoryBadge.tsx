interface CategoryBadgeProps {
  name: string;
  color?: string;
  className?: string;
}

export default function CategoryBadge({ name, color, className = '' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: color ?? '#6b7280' }}
    >
      {name}
    </span>
  );
}
