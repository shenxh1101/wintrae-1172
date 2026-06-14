import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Rating({
  value,
  max = 5,
  onChange,
  readonly = false,
  size = 'md',
}: RatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`p-0.5 transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              star <= value
                ? 'fill-warning-500 text-warning-500'
                : 'text-neutral-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
