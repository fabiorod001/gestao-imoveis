import { Button } from "@/components/ui/button";

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const options = [
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '12m', label: '12 meses' },
    { value: 'year', label: 'Este ano' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
