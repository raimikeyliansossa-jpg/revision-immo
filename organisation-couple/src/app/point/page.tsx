"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PointScreen } from "@/components/point/PointScreen";

function Inner() {
  const id = useSearchParams().get("id");
  return <PointScreen key={id || "new"} pointId={id} />;
}

export default function PointPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
