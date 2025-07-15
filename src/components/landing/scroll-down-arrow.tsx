
'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';

interface ScrollDownArrowProps {
  targetId: string;
}

export function ScrollDownArrow({ targetId }: ScrollDownArrowProps) {
  const handleClick = () => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="animate-bounce rounded-full h-12 w-12 text-primary hover:bg-primary/10"
        aria-label="Rolar para a próxima seção"
      >
        <ChevronDown className="h-8 w-8" />
      </Button>
    </div>
  );
}
