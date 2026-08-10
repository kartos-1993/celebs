import { Loader } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default PageLoader;
