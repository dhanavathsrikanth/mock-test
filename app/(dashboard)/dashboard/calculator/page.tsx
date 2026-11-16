import type { Metadata } from "next";
import { CalculatorPracticePage } from "@/components/calculator/CalculatorPracticePage";

export const metadata: Metadata = {
  title: "GATE Calculator | StudentAce",
  description: "Practice scientific calculations in your exam preparation dashboard.",
};

export default function DashboardCalculatorPage() {
  return <CalculatorPracticePage dashboard />;
}
