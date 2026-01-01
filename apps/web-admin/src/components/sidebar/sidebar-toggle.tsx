import React, { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { set } from "date-fns";

type SibarToggleProps = {
  isOpen: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
};

const SidebarToggle = ({ isOpen, setIsOpen }: SibarToggleProps) => {
  return (
    <div className="invisible lg:visible absolute top-[56px] -right-[12px] z-20">
      <Button
        onClick={() => setIsOpen && setIsOpen(!isOpen)}
        className="rounded-md w-6 h-6"
        variant="outline"
        size="icon"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform ease-in-out duration-700",
            isOpen === false ? "rotate-180" : "rotate-0"
          )}
        />
      </Button>
    </div>
  );
};

export default SidebarToggle;
