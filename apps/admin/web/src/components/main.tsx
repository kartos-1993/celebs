import { useSideBarContext } from "@/context/sidebar-provider";
import { cn } from "@/lib/utils";
import React from "react";

type MainProps = {
  children: React.ReactNode;
};
const Main = ({ children }: MainProps) => {
  const { isSideBarOpen } = useSideBarContext();
  return (
    <main
      className={cn(
        "min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
        isSideBarOpen ? "lg:ml-72" : "lg:ml-[90px]"
      )}
    >
      {children}
    </main>
  );
};
export default Main;
// settings.disabled &&
// getOpenState() ? "lg:ml-[90px]" : "lg:ml-72")
