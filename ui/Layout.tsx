"use client";
import { CalendarClock } from "lucide-react";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 p-4 md:p-6">
        <div className="">
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <div className="text-muted-foreground">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
};
