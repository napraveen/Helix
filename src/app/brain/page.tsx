import { Suspense } from "react";
import { BrainApp, Tab, Hub } from "@/components/BrainApp";

interface BrainPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrainPage({ searchParams }: BrainPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const rawTab =
    typeof resolved?.tab === "string"
      ? resolved.tab
      : typeof resolved?.topic === "string"
      ? resolved.topic
      : typeof resolved?.subtopic === "string"
      ? resolved.subtopic
      : undefined;
  const rawHub = typeof resolved?.hub === "string" ? resolved.hub : undefined;

  return (
    <Suspense fallback={null}>
      <BrainApp initialTab={rawTab as Tab | undefined} initialHub={rawHub as Hub | undefined} />
    </Suspense>
  );
}

