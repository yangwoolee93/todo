export function EmptyHint({ children }: { children: string }) {
  return (
    <p className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}
