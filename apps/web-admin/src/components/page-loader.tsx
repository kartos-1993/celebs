import { Spinner } from '@celebs/shared-ui/components/spinner';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
      <Spinner size="xl" className="text-primary" />
    </div>
  );
}

export function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Spinner size="xl" className="text-primary" />
    </div>
  );
}

export default PageLoader;
