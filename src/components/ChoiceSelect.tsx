import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agent-web-starter/ui/components/select";

interface ChoiceSelectProps<Value extends string> {
  id?: string;
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
  className?: string;
}

export function ChoiceSelect<Value extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
  className,
}: ChoiceSelectProps<Value>) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((candidate) => candidate.value === nextValue);
        if (option) onValueChange(option.value);
      }}
    >
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} collisionPadding={16}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
