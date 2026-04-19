"use client";

import { motion } from "framer-motion";
import type { StaticImageData } from "next/image";
import Image from "next/image";

type Props = {
  src: StaticImageData;
  alt: string;
};

export function ResultsHighfiveHero({ src, alt }: Props) {
  return (
    <div className="mt-8 flex justify-center px-2">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 18,
          mass: 0.55,
        }}
        className="rounded-full border-4 border-white bg-white p-4 shadow-2xl sm:p-5"
      >
        <div className="relative mx-auto h-80 w-80 min-h-80 min-w-80 max-w-[min(100%,20rem)]">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain object-center"
            sizes="320px"
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}
