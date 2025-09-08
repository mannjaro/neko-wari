import { createFileRoute } from "@tanstack/react-router";
import { startAuth } from "@/server/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      Hello "/login"!
      <Button
        type="button"
        onClick={() => {
          startAuth();
        }}
      >
        hello
      </Button>
    </div>
  );
}
