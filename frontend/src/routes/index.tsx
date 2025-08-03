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
import { createFileRoute } from "@tanstack/react-router";
import { getMonthlyCost } from "@/server/getMonthly";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => await getMonthlyCost(),
  errorComponent: () => (
    <div>
      <p>error</p>
    </div>
  ),
});

function Home() {
  const state = Route.useLoaderData();

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
        {state.userSummaries.map((user) => (
          <TableRow key={user.userId}>
            <TableCell>{user.user}</TableCell>
            <TableCell>{user.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
