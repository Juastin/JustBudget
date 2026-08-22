import type React from 'react';

type KPIVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  subtitleNode?: React.ReactNode;
  variant?: KPIVariant;
}

const variantConfig: Record<KPIVariant, { border: string; value: string }> = {
  default: { border: 'border-gray-300 dark:border-gray-600', value: 'text-gray-900 dark:text-white' },
  success: { border: 'border-green-500', value: 'text-green-600 dark:text-green-400' },
  warning: { border: 'border-yellow-500', value: 'text-yellow-600 dark:text-yellow-400' },
  danger: { border: 'border-red-500', value: 'text-red-600 dark:text-red-400' },
  info: { border: 'border-blue-500', value: 'text-blue-600 dark:text-blue-400' },
};

export default function KPICard({ label, value, subtitle, subtitleNode, variant = 'default' }: KPICardProps) {
  const config = variantConfig[variant];
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 ${config.border}`}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${config.value}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      {subtitleNode && <div className="text-xs mt-1">{subtitleNode}</div>}
    </div>
  );
}
