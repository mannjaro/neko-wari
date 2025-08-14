import { createFileRoute } from "@tanstack/react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/summary")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Carousel className="w-full max-w-xl mx-auto">
      <CarouselContent>
        <CarouselItem>
          <div className="p-1">
            <Card>
              <CardContent className="flex items-center justify-center">
                <span className="text-xl font-semibold">a</span>
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
        <CarouselItem>
          <div>
            <Card className="flex items-center justify-center">
              <CardContent>
                <span className="text-xl font-semibold">b</span>
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
