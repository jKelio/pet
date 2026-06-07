import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { Input } from './input.js';

interface NumberInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: 'numeric' | 'decimal';
  className?: string;
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  inputMode = 'numeric',
  className,
}: NumberInputProps) {
  const [rawValue, setRawValue] = useState(String(value));

  const clamp = (n: number) => {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  };

  const commit = (raw: string) => {
    const parsed = inputMode === 'decimal' ? parseFloat(raw) : parseInt(raw, 10);
    const clamped = clamp(isNaN(parsed) ? (min ?? 0) : parsed);
    onChange(clamped);
    setRawValue(String(clamped));
  };

  const decrement = () => {
    const next = clamp(value - step);
    onChange(next);
    setRawValue(String(next));
  };

  const increment = () => {
    const next = clamp(value + step);
    onChange(next);
    setRawValue(String(next));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={min !== undefined && value <= min}
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        value={rawValue}
        onFocus={() => setRawValue(String(value))}
        onChange={(e) => setRawValue(e.target.value)}
        onBlur={() => commit(rawValue)}
        className="text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={increment}
        disabled={max !== undefined && value >= max}
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
