import { Loader } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex flex-1 h-full min-h-[70vh] w-full items-center justify-center">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default PageLoader;
