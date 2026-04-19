import { QuizPlayer } from "@/components/quiz-player";

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-kim-navy">Quiz</h1>
        <p className="mt-2 text-sm text-kim-navy/80">
          Twenty questions tailored to your class, with maths sprinkled through
          the quiz.
        </p>
        <div className="mt-8">
          <QuizPlayer />
        </div>
      </div>
    </div>
  );
}
