import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, PanelsTopLeft } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@celebs/shared-ui/components/sheet';

import { Menu } from '@/components/menu';

export function SheetMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Collapse the drawer whenever navigation happens
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="h-8 lg:hidden" variant="ghost" size="icon" title="Open menu">
          <MenuIcon size={18} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-72 flex-col gap-0 overflow-hidden p-0"
        aria-describedby="sheet-menu-description"
        side="left"
      >
        <SheetHeader className="border-b border-border/60 px-4 pb-3 pt-4 text-left">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PanelsTopLeft className="h-4 w-4" />
            </span>
            <SheetTitle className="text-sm font-semibold tracking-tight">
              Seller Center
            </SheetTitle>
          </Link>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 px-2 py-3">
          <Menu isSidebarOpen={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
