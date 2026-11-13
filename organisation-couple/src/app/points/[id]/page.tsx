"use client";
import { use } from "react";
import { Recap } from "@/components/point/Recap";
import { Page, PageHeader } from "@/components/ui";

export default function PointRecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Page>
      <PageHeader title="Récap du point" emoji="📝" back="/evolution" />
      <Recap pointId={id} />
    </Page>
  );
}
