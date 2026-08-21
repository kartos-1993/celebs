import React, { createContext } from 'react';

type SidebarContextProps = {
  isHover: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHover: React.Dispatch<React.SetStateAction<boolean>>;
};
const SidebarContext = createContext<SidebarContextProps | null>(null);
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isHover, setIsHover] = React.useState(false);
  const value = { isSidebarOpen, setIsSidebarOpen, isHover, setIsHover };
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export default SidebarProvider;

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebarContext = () => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used inside a SidebarProvider');
  }

  return context;
};
