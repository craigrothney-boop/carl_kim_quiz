/** Playful corner stars + subtle texture for the landing page (brand colours). */
export function HomeCornerStars() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <Star className="absolute left-2 top-6 h-10 w-10 -rotate-12 text-carl-green/35 sm:left-4 sm:top-10 sm:h-14 sm:w-14" />
      <Star className="absolute right-3 top-8 h-8 w-8 rotate-[18deg] text-kim-navy/30 sm:right-6 sm:top-12 sm:h-11 sm:w-11" />
      <Star className="absolute bottom-24 left-4 h-7 w-7 rotate-6 text-carl-green/30 sm:bottom-32 sm:left-8 sm:h-9 sm:w-9" />
      <Star className="absolute bottom-20 right-5 h-9 w-9 -rotate-[22deg] text-kim-navy/35 sm:bottom-28 sm:right-10 sm:h-12 sm:w-12" />
      <Star className="absolute left-1/3 top-1/4 hidden h-6 w-6 rotate-[35deg] text-carl-green/20 md:block" />
      <Star className="absolute bottom-1/3 right-1/4 hidden h-5 w-5 -rotate-6 text-kim-navy/25 lg:block" />
    </div>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l2.9 7.3H22l-6 4.6 2.3 7.1L12 17.8l-6.3 3.2 2.3-7.1-6-4.6h7.1L12 2z" />
    </svg>
  );
}
