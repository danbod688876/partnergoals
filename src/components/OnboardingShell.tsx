export function OnboardingShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-1 py-8">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>{children}</div>
    </div>
  );
}
