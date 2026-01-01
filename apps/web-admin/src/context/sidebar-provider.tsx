import React, { createContext } from "react";

type SideBarContextProps = {
  isHover: boolean;
  isSideBarOpen: boolean;
  setIsSideBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHover: React.Dispatch<React.SetStateAction<boolean>>;
};
const SideBarContext = createContext<SideBarContextProps | null>(null);
export const SideBarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSideBarOpen, setIsSideBarOpen] = React.useState(true);
  const [isHover, setIsHover] = React.useState(false);
  const value = { isSideBarOpen, setIsSideBarOpen, isHover, setIsHover };
  return (
    <SideBarContext.Provider value={value}>{children}</SideBarContext.Provider>
  );
};

export default SideBarProvider;

export const useSideBarContext = () => {
  const context = React.useContext(SideBarContext);
  if (!context) {
    throw new Error("useSideBarContext must be used inside a SideBarProvider");
  }

  return context;
};
