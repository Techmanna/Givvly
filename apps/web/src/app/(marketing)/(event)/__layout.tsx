// import Link from "next/link";
// import type { ReactNode } from "react";

// export default function PublicEventLayout({
//   children,
// }: {
//   children: ReactNode;
// }) {
//   return (
//     <div className="flex min-h-screen flex-col selection:bg-primary/15 selection:text-primary">
//       {/* Whisper-quiet celebration top bar */}
//       <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
//         <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
//           <Link
//             href="/"
//             className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
//           >
//             <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/50 bg-primary/10 font-heading text-sm font-semibold text-primary">
//               G
//             </span>
//             <span className="font-heading text-lg font-semibold tracking-tight">
//               Givvly
//             </span>
//           </Link>

//           <Link
//             href="/gifts"
//             className="text-xs font-semibold uppercase tracking-[0.18em] text-primary hover:underline"
//           >
//             Gift Atelier
//           </Link>
//         </div>
//       </header>

//       <div className="flex-1">{children}</div>

//       <footer className="border-t border-border/70 bg-card/50 py-10 text-center text-xs text-muted-foreground">
//         <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
//           <p className="inline-flex items-center gap-1.5">
//             <span>Hosted with</span>
//             <Heart
//               className="h-3.5 w-3.5 fill-primary text-primary"
//               aria-hidden="true"
//             />
//             <span>on Givvly • Secured by Paystack</span>
//           </p>
//           <div className="flex items-center gap-4">
//             <Link href="/events/new" className="hover:text-primary">
//               Create your own celebration page
//             </Link>
//             <span>•</span>
//             <Link href="/privacy" className="hover:text-primary">
//               Privacy
//             </Link>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }

