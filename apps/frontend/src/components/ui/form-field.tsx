import { Label } from "./label";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./select";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  required, 
  error, 
  hint, 
  children, 
  className 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

interface FormInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function FormInput({ label, required, error, hint, className, ...props }: FormInputProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <Input 
        className={cn(error && "border-destructive", className)} 
        {...props} 
      />
    </FormField>
  );
}

interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function FormTextarea({ label, required, error, hint, className, ...props }: FormTextareaProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <Textarea 
        className={cn(error && "border-destructive", className)} 
        {...props} 
      />
    </FormField>
  );
}

interface FormSelectProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
}

export function FormSelect({ 
  label, 
  required, 
  error, 
  hint, 
  value, 
  onValueChange, 
  placeholder,
  children 
}: FormSelectProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </FormField>
  );
}

