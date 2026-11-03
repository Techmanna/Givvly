"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
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
import { ApiClientError } from "@/lib/api-client";
import { useUnlockEventMutation } from "../hooks/useEvents";
import { unlockEventSchema } from "../schemas";
import type { UnlockEventInput } from "../types";

export type EventUnlockFormProps = {
  slug: string;
};

export function EventUnlockForm({ slug }: EventUnlockFormProps) {
  const router = useRouter();
  const unlockMutation = useUnlockEventMutation(slug);
  const [attempts, setAttempts] = React.useState(0);

  const form = useForm<UnlockEventInput>({
    resolver: zodResolver(unlockEventSchema),
    mode: "onBlur",
    defaultValues: {
      accessCode: "",
    },
  });

  const onSubmit = async (values: UnlockEventInput) => {
    try {
      await unlockMutation.mutateAsync(values.accessCode);
      router.push(`/e/${slug}`);
    } catch (error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (error instanceof ApiClientError) {
        if (error.code === "INVALID_ACCESS_CODE" || error.status === 403) {
          form.setError("accessCode", {
            type: "server",
            message: `Incorrect access code (attempt ${nextAttempts}). Double-check your invite.`,
          });
          return;
        }
      }
      form.setError("accessCode", {
        type: "server",
        message: "Could not verify the code. Please try again.",
      });
    }
  };

  const isSubmitting =
    form.formState.isSubmitting || unlockMutation.isPending;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle>Private event</CardTitle>
        <CardDescription>
          Enter the access code from your invite to view this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="accessCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access code</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      maxLength={12}
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.replace(/[^A-Za-z0-9]/g, "")
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>Unlock event</span>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

