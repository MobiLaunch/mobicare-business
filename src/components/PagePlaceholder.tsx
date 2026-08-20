// Temporary stand-in for an admin route that has not been implemented yet.
export default function PagePlaceholder({ name }: { name: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-muted">Not yet rebuilt</p>
      <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
      <p className="text-sm text-muted">
        This admin section is not available yet.
      </p>
    </div>
  );
}
