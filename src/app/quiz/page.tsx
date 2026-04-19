import { QuizPlayer } from "@/components/quiz-player";

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-kim-navy sm:text-2xl">Quiz</h1>
        <p className="mt-2 text-sm text-kim-navy/80">
          Twenty questions tailored to your class, with maths sprinkled through
          the quiz.
        </p>
        <div className="mt-6 sm:mt-8">
          <QuizPlayer />
        </div>
      </div>
    </div>
  );
}
