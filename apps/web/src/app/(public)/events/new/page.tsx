import { CreateEventWizard } from "@/features/events";

export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-3xl ">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Create an event
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your event page in a few quick steps. Your progress is saved
          automatically.
        </p>
      </div>
      <CreateEventWizard />
    </main>
  );
}

