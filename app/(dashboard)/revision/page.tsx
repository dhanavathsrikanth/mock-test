import RevisionContent from "./revision-content";
import { getRevisionQueue, getRevisionDeck } from "@/lib/srs";

export default async function RevisionPage() {
  try {
    const [queue, deck] = await Promise.all([
      getRevisionQueue(),
      getRevisionDeck().catch(() => null),
    ]);
    return <RevisionContent initialQueue={queue} initialDeck={deck} />;
  } catch {
    return <RevisionContent initialQueue={null} initialError="Unable to load revision. Please retry." />;
  }
}
