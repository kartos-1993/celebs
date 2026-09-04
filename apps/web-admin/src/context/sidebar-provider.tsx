import React, { createContext } from 'react';

type SidebarContextProps = {
  isHover: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHover: React.Dispatch<React.SetStateAction<boolean>>;
};
const SidebarContext = createContext<SidebarContextProps | null>(null);
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tablets (md–lg) get the collapsed icon rail by default; desktop starts expanded.
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [isHover, setIsHover] = React.useState(false);

  React.useEffect(() => {
    let prevWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth < 1024 && prevWidth >= 1024) {
        setIsSidebarOpen(false);
      } else if (currentWidth >= 1024 && prevWidth < 1024) {
        setIsSidebarOpen(true);
      }
      prevWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const value = { isSidebarOpen, setIsSidebarOpen, isHover, setIsHover };
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export default SidebarProvider;

export const useSidebarContext = () => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used inside a SidebarProvider');
  }

  return context;
};
