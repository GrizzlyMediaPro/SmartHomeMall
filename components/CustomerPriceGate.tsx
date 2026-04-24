"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function LoggedOutPriceHint({
  className,
  message = "pentru a vedea prețul",
}: {
  className?: string;
  /** Ex.: „pentru a vedea totalul” în coș */
  message?: string;
}) {
  return (
    <span className={`text-sm text-muted-foreground ${className ?? ""}`}>
      <Link href="/sign-in" className="underline font-medium text-foreground">
        Conectează-te
      </Link>{" "}
      {message}
    </span>
  );
}

interface CustomerPriceGateProps {
  children: React.ReactNode;
  /** Înălțime minimă ca să nu sară layout-ul cât timp se încarcă sesiunea */
  className?: string;
}

export default function CustomerPriceGate({
  children,
  className,
}: CustomerPriceGateProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <span
        className={`inline-block min-h-[1.25em] w-[5.5rem] rounded bg-muted animate-pulse ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  if (!isSignedIn) {
    return <LoggedOutPriceHint className={className} />;
  }

  return <>{children}</>;
}
