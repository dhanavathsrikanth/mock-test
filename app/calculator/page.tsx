import type { Metadata } from "next";
import { CalculatorPracticePage } from "@/components/calculator/CalculatorPracticePage";

export const metadata: Metadata = {
  title: "GATE Virtual Scientific Calculator | Exam Prep",
  description: "Practice with a GATE-style scientific calculator, including postfix functions, degree and radian modes, and memory controls.",
};

export default function CalculatorPage() {
  return <CalculatorPracticePage />;
}
