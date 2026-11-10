import DailyQuestionContent from "./daily-content";
import { getDailyQuestion } from "@/lib/daily-question";

export default async function DailyQuestionPage() {
  try {
    return <DailyQuestionContent initialData={await getDailyQuestion()} />;
  } catch {
    return <DailyQuestionContent initialData={null} initialError="Unable to load your daily question. Check your connection and try again." />;
  }
}
