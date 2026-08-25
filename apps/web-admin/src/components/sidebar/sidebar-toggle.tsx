import { Dispatch, SetStateAction } from 'react';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { cn } from '@/lib/utils';

type SibarToggleProps = {
  isOpen: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
};

const SidebarToggle = ({ isOpen, setIsOpen }: SibarToggleProps) => {
  return (
    <div className="hidden lg:flex absolute top-[56px] -right-[12px] z-30">
      <Button
        onClick={() => setIsOpen && setIsOpen(!isOpen)}
        className="rounded-full w-6 h-6 shadow-md"
        variant="outline"
        size="icon"
      >
        <ChevronLeft
          className={cn(
            'h-3 w-3 transition-transform ease-in-out duration-300',
            isOpen === false ? 'rotate-180' : 'rotate-0',
          )}
        />
      </Button>
    </div>
  );
};

export default SidebarToggle;
