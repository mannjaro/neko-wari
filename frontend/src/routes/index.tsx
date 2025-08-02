// src/routes/index.tsx
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { getMonthlyCost } from "@/server/getMonthly";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <Button
      type="button"
      onClick={async () => {
        console.log(await getMonthlyCost());
      }}
    >
      Add 1 to
    </Button>
  );
}
