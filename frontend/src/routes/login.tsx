import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type LoginFormData, LoginFormSchema } from "@/types/forms";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

export function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
  });

  const onSubmit = useAuth();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="Password" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

function RouteComponent() {
  return (
    <div className="w-full md:w-2/3 lg:w-1/3 mx-auto space-y-6">
      <LoginForm />
    </div>
  );
}
