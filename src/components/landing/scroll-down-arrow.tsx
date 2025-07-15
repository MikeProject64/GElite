
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
    <div className="flex justify-center -mt-8 relative z-10">
        <Button variant="outline" onClick={handleClick} className="bg-background hover:bg-muted group">
            <ChevronDown className="h-4 w-4 mr-2 transition-transform group-hover:translate-y-0.5" />
            Saiba mais
            <ChevronDown className="h-4 w-4 ml-2 transition-transform group-hover:translate-y-0.5" />
        </Button>
    </div>
  );
}
