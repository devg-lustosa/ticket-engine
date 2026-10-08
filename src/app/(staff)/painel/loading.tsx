import { LayoutDashboard, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoadingDashboard() {
  return (
    <main className="min-h-screen bg-background text-foreground animate-pulse">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <LayoutDashboard size={16} className="text-brand/50" />
            </div>
            <div>
              <div className="h-5 w-40 bg-muted rounded-md mb-1.5"></div>
              <div className="h-3 w-20 bg-muted rounded-md"></div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="h-6 w-16 bg-muted rounded-md"></div>
            </div>
            <div className="h-9 w-28 bg-brand/50 rounded-lg"></div>
          </div>
        </div>
      </header>

      {/* Conteúdo Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navegação Secundária Skeleton */}
        <div className="flex items-center gap-6 border-b border-border mb-8 pb-4">
          <div className="h-5 w-24 bg-muted rounded-md pb-4 -mb-[17px]"></div>
          <div className="h-5 w-32 bg-muted rounded-md pb-4 -mb-[17px]"></div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Calendar size={24} className="text-muted-fg/30" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/3 bg-muted rounded-md"></div>
                <div className="flex gap-3">
                  <div className="h-3 w-20 bg-muted rounded-md"></div>
                  <div className="h-3 w-24 bg-muted rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
