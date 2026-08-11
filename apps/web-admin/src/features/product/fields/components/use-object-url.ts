import React from 'react';

export function useObjectUrl(file: File | string | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) return setUrl(null);
    if (typeof file === 'string') return setUrl(file);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
