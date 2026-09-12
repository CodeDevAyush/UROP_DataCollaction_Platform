"use client";

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{children}</div>
  );
}
