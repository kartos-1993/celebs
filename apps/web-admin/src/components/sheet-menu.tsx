import { Link } from 'react-router-dom';
import { MenuIcon, PanelsTopLeft } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Menu } from '@/components/menu';
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@celebs/shared-ui/components/sheet';

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-56 px-3 h-full flex flex-col"
        aria-describedby="sheet-menu-description"
        side="left"
      >
        <SheetHeader>
          <Button className="flex justify-center items-center pb-2 pt-1" variant="link" asChild>
            <Link to="/" className="flex items-center gap-2">
              <PanelsTopLeft className="w-6 h-6 mr-1" />
              <SheetTitle className="font-bold text-lg">Celebs Seller Center</SheetTitle>
            </Link>
          </Button>
        </SheetHeader>
        <Menu isSidebarOpen={true} />
      </SheetContent>
    </Sheet>
  );
}
