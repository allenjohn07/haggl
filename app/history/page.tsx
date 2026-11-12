import { TopBar } from "@/app/(app)/_components/TopBar";
import { HistoryList } from "./HistoryList";

export const metadata = { title: "History · Haggl" };

// Past debates and purchases, read from this browser (no accounts, no database).
export default function HistoryPage() {
  return (
    <>
      <TopBar home crumbs={["History"]} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-8 pb-12 sm:px-6">
        <HistoryList />
      </main>
    </>
  );
}
