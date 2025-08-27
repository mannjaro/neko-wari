import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Price } from "./Price";
import { NotebookPen, DollarSign, PenLine, PiggyBank } from "lucide-react";

import type { DetailDrawerProps } from "@/types";

export function DetailDrawer({
  isOpen,
  onOpenChange,
  user,
}: DetailDrawerProps) {
  if (!user) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{user.user}の詳細</DrawerTitle>
          <DrawerDescription>内訳</DrawerDescription>
        </DrawerHeader>
        <Table>
          <TableCaption>Details</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <DollarSign size={20} />
              </TableHead>
              <TableHead>
                <NotebookPen size={20} />
              </TableHead>
              <TableHead>
                <PiggyBank />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(user.categoryBreakdown).map(([category, items]) =>
              items.map((item, _) => (
                <TableRow key={`${item.timestamp}-${item.memo}-`}>
                  <TableCell>{category}</TableCell>
                  <TableCell>{item.memo}</TableCell>
                  <TableCell>
                    <Price amount={item.amount} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => {}}>
                      <PenLine />
                    </Button>
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
        <div className="px-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-600">合計金額</h3>
            <div className="text-2xl font-bold">
              <Price amount={user.totalAmount} />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              閉じる
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
