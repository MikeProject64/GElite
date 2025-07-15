'use client';

import { forwardRef, useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';

const useOnClickOutside = (
  ref: React.RefObject<HTMLDivElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  placeholder?: string;
}

const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ options, value, onChange, className, placeholder }, ref) => {
    const [open, setOpen] = useState(false);
    const [selectedValues, setSelectedValues] = useState<string[]>(value || []);
    const containerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(containerRef, () => setOpen(false));

    useEffect(() => {
      setSelectedValues(value || []);
    }, [value]);

    const handleSelect = (optionValue: string) => {
      const newValue = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      setSelectedValues(newValue);
      onChange(newValue);
    };

    const handleRemove = (optionValue: string) => {
      const newValue = selectedValues.filter((v) => v !== optionValue);
      setSelectedValues(newValue);
      onChange(newValue);
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap items-center gap-1">
            {selectedValues.length > 0 ? (
              selectedValues.map((v) => {
                const option = options.find((opt) => opt.value === v);
                return (
                  <Badge
                    variant="secondary"
                    key={v}
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(v);
                    }}
                  >
                    {option?.label}
                    <X className="ml-1 h-4 w-4" />
                  </Badge>
                );
              })
            ) : (
              <span>{placeholder ?? 'Select options'}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {open && (
          <div className="absolute top-full z-[51] mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none">
            <Command>
              <CommandInput placeholder="Pesquisar..." />
              <CommandList>
                <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedValues.includes(option.value)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export { MultiSelect }; 