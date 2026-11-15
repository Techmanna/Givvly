import type { Metadata } from "next";
import { CurateBoxWizard } from "@/features/curate-box";

export const metadata: Metadata = {
  title: "Curate Your Box | Givvly",
  description:
    "Handpick a signature Givvly gift box, choose at least 3 thoughtful items, and add a personal note for your recipient.",
};

export default function CurateBoxPage() {
  return <CurateBoxWizard />;
}
