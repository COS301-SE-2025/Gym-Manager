// /app/error/page.tsx
import { Suspense } from 'react';
import ErrorContent from '@/components/ErrorContent/page';

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
