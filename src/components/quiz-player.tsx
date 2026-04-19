"use client";

import type { StaticImageData } from "next/image";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Subject } from "@/types/app";
import { startQuiz, submitQuiz } from "@/app/actions/quiz-actions";
import carlCalculator from "@/assets/carl_calculator.png";
import carlPencil from "@/assets/carl_pencil.png";
import kimFact from "@/assets/kim_fact.png";
import kimMap from "@/assets/kim_map.png";

type Q = {
  id: string;
  subject: Subject;
  mascot: "carl" | "kim";
  topic: string;
  prompt: string;
  options: [string, string, string, string];
};

/** Stable per-question-slot “random” so the asset doesn’t flicker on re-render. */
function slotHash(id: string, slotIndex: number): number {
  const s = `${id}:slot${slotIndex}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

/** Maths: alternate Carl assets by slot. GK: alternate Kim assets by slot. */
function resolveMascotSrc(q: Q, slotIndex: number): StaticImageData {
  const n = slotHash(q.id, slotIndex);
  if (q.subject === "MATHS") {
    return n % 2 === 0 ? carlPencil : carlCalculator;
  }
  return n % 2 === 0 ? kimFact : kimMap;
}

function mascotAltForSrc(src: StaticImageData): string {
  if (src === carlCalculator) return "Carl";
  if (src === carlPencil) return "Carl";
  if (src === kimMap) return "Kim";
  return "Kim";
}

function ProgressStars({
  total,
  answers,
}: {
  total: number;
  answers: (number | undefined)[];
}) {
  return (
    <div
      className="flex flex-wrap justify-center gap-1 sm:gap-1.5"
      role="list"
      aria-label={`${answers.filter((a) => typeof a === "number").length} of ${total} questions answered`}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = typeof answers[i] === "number";
        return (
          <span key={i} role="listitem" className="inline-flex">
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${
                done ? "fill-yellow-400" : "fill-gray-300"
              }`}
              aria-hidden
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        );
      })}
    </div>
   );
}

function pickFriendlyVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const enGb = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("en-gb"),
  );
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = enGb.length ? enGb : en;
  const friendly =
    pool.find((v) =>
      /female|samantha|martha|kate|karen|serena|fiona|google uk|emma|amy|olivia|victoria|zira/i.test(
        v.name,
      ),
    ) ?? pool[0];
  return friendly ?? null;
}

function readQuestionWithSpeech(
  q: Q,
  synth: SpeechSynthesis,
  onEnd: () => void,
): void {
  synth.cancel();
  const letters = ["A", "B", "C", "D"] as const;
  const parts = [
    q.prompt,
    ...q.options.map((opt, i) => `Option ${letters[i]}: ${opt}`),
  ];
  const text = parts.join(". ");
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.pitch = 1.05;
  const voice = pickFriendlyVoice(synth);
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.speak(u);
}

export function QuizPlayer() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "quiz">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [index, setIndex] = useState(0);
  /** One entry per question position (same id can appear twice; answers are per slot). */
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [pending, startTransition] = useTransition();

  const [mascotOpacity, setMascotOpacity] = useState(1);
  const skipMascotFadeRef = useRef(true);
  const prevMascotSrcRef = useRef<StaticImageData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const current = questions[index];
  const progress = useMemo(
    () => (questions.length ? index + 1 : 0),
    [index, questions.length],
  );

  const mascotSrc = useMemo(
    () => (current ? resolveMascotSrc(current, index) : carlPencil),
    [current, index],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [index]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    if (skipMascotFadeRef.current) {
      skipMascotFadeRef.current = false;
      prevMascotSrcRef.current = mascotSrc;
      setMascotOpacity(1);
      return;
    }
    if (prevMascotSrcRef.current === mascotSrc) {
      setMascotOpacity(1);
      return;
    }
    prevMascotSrcRef.current = mascotSrc;
    setMascotOpacity(0.08);
  }, [index, mascotSrc, current]);

  function begin() {
    setError(null);
    startTransition(async () => {
      try {
        const pack = await startQuiz();
        setAttemptId(pack.attemptId);
        setQuestions(pack.questions);
        setAnswers(Array.from({ length: pack.questions.length }, () => undefined));
        setIndex(0);
        skipMascotFadeRef.current = true;
        setMascotOpacity(1);
        setPhase("quiz");
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not start the quiz right now.",
        );
      }
    });
  }

  function choose(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
  }

  function next() {
    if (index < questions.length - 1) setIndex((i) => i + 1);
  }

  function back() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function finish() {
    if (!attemptId) return;
    if (
      answers.length !== questions.length ||
      !answers.every((a): a is number => typeof a === "number")
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitQuiz(attemptId, answers);
        router.push(
          `/quiz/results?correct=${res.correct}&total=${res.total}`,
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save your answers.",
        );
      }
    });
  }

  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-kim-navy/15 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-kim-navy">Ready?</h2>
        <p className="mt-2 text-sm text-kim-navy/80">
          You will get 20 questions: five maths and fifteen general knowledge,
          mixed together. Maths questions can come up more than once over time;
          general knowledge questions you have already seen will not repeat.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          className="mt-4 rounded-xl bg-carl-green px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Loading…" : "Start 20 questions"}
        </button>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  const answered = answers[index];
  const atEnd = index === questions.length - 1;
  const isMaths = current.subject === "MATHS";
  const mascotAlt = mascotAltForSrc(mascotSrc);

  const progressPct =
    questions.length > 0 ? (progress / questions.length) * 100 : 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-12 items-center gap-8 overflow-visible">
      {/* Mascot wing — wider column; image may extend past its flow box (no clipping) */}
      <div className="relative z-0 col-span-6 flex min-h-0 justify-center overflow-visible">
        <div className="relative w-full max-w-xl shrink-0">
          <Image
            src={mascotSrc}
            alt={mascotAlt}
            width={mascotSrc.width}
            height={mascotSrc.height}
            sizes="(max-width: 1280px) 50vw, 520px"
            priority={index === 0}
            className="h-auto w-full object-contain transition-opacity duration-300 ease-out"
            style={{
              opacity: mascotOpacity,
              filter: "drop-shadow(0 20px 13px rgb(0 0 0 / 0.15))",
            }}
            onLoad={() => setMascotOpacity(1)}
          />
        </div>
      </div>

      {/* Question wing — stacks above mascot where they meet */}
      <div
        className={[
          "relative z-20 col-span-6 min-w-0 rounded-2xl border border-kim-navy/15 bg-white p-6 shadow-sm",
          "shadow-inner",
        ].join(" ")}
      >
        {/* Read aloud — microphone in top-right corner of question card */}
        <button
          type="button"
          onClick={() => {
            if (typeof window === "undefined" || !window.speechSynthesis) {
              return;
            }
            const synth = window.speechSynthesis;
            if (synth.speaking) {
              synth.cancel();
              setIsSpeaking(false);
              return;
            }
            readQuestionWithSpeech(current, synth, () => setIsSpeaking(false));
            setIsSpeaking(true);
          }}
          title={isSpeaking ? "Stop reading" : "Read question aloud"}
          aria-pressed={isSpeaking}
          className={[
            "absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition sm:right-4 sm:top-4",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carl-green",
            isSpeaking
              ? "border-carl-green bg-carl-green text-white hover:brightness-110"
              : isMaths
                ? "border-carl-green/35 bg-white text-carl-green hover:bg-carl-green/10"
                : "border-kim-navy/20 bg-white text-kim-navy hover:bg-kim-navy/5",
          ].join(" ")}
          aria-label={
            isSpeaking
              ? "Stop reading the question"
              : "Read the question and all four options aloud"
          }
        >
          {isSpeaking ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 6h12v12H6z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Inner tint */}
        <div
          className={[
            "relative overflow-visible rounded-xl border border-kim-navy/12 bg-kim-navy/[0.03] p-4 sm:p-6",
          ].join(" ")}
        >
          <div className="relative z-10 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-12 text-sm text-kim-navy/80 sm:pr-14">
            <span>
              Question {progress} / {questions.length}
            </span>
            <span className="rounded-full bg-kim-navy/10 px-2 py-0.5 text-xs font-medium text-kim-navy">
              {isMaths ? "Maths" : "General knowledge"}
            </span>
          </div>

          <div className="mt-3">
            <ProgressStars total={questions.length} answers={answers} />
          </div>

          <h2 className="mt-3 text-lg font-semibold text-kim-navy sm:mt-4 sm:text-xl">
            {current.prompt}
          </h2>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-kim-navy/15"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Question ${progress} of ${questions.length}`}
          >
            <div
              className="h-full rounded-full bg-carl-green transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {current.options.map((opt, i) => (
              <button
                key={`slot-${index}-opt-${i}`}
                type="button"
                onClick={() => choose(i)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  answered === i
                    ? "border-carl-green bg-carl-green/10 text-kim-navy"
                    : "border-kim-navy/15 hover:border-kim-navy/35"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={back}
              disabled={index === 0 || pending}
              className="rounded-xl border border-kim-navy/25 px-4 py-2 text-sm font-medium text-kim-navy hover:bg-kim-navy/5 disabled:opacity-40"
            >
              Back
            </button>
            {!atEnd ? (
              <button
                type="button"
                onClick={next}
                disabled={answered === undefined || pending}
                className="rounded-xl bg-carl-green px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={
                  answers.length !== questions.length ||
                  answers.some((a) => typeof a !== "number") ||
                  pending
                }
                className="rounded-xl bg-carl-green px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40"
              >
                {pending ? "Saving…" : "Finish and save"}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
