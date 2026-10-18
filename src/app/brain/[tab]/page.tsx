import { Suspense } from "react";
import { BrainApp, Tab, Hub } from "@/components/BrainApp";

interface BrainSubtopicPageProps {
  params: Promise<{ tab: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrainSubtopicPage({
  params,
  searchParams,
}: BrainSubtopicPageProps) {
  const { tab } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  const rawHub = typeof resolved?.hub === "string" ? resolved.hub : undefined;

  return (
    <Suspense fallback={null}>
      <BrainApp initialTab={tab as Tab} initialHub={rawHub as Hub | undefined} />
    </Suspense>
  );
}
