// src/routes/index.tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getMonthlyCost } from "@/server/getMonthly";
import { Suspense } from "react";

const deferredQueryOptions = () =>
  queryOptions({
    queryKey: ["monthly", "cost"],
    queryFn: () => getMonthlyCost(),
  });

export const Route = createFileRoute("/")({
  component: Home,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(deferredQueryOptions());
  },
  errorComponent: () => (
    <div>
      <p>error</p>
    </div>
  ),
});

function Home() {
  return (
    <div className="p-2">
      <Suspense fallback="Loading Middleman...">
        <DeferredCostTable />
      </Suspense>
    </div>
  );
}

function DeferredCostTable() {
  const deferredQuery = useSuspenseQuery(deferredQueryOptions());

  return (
    <Table>
      <TableCaption>Monthly Cost</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>User name</TableHead>
          <TableHead>Total amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deferredQuery.data.userSummaries.map((user) => (
          <TableRow key={user.userId}>
            <TableCell>{user.user}</TableCell>
            <TableCell>{user.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
