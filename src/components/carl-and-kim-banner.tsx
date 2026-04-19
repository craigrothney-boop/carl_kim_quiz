import Image from "next/image";
import carlAndKim from "@/assets/carl_and_kim.png";

type BannerProps = {
  /** When false, image has no frame (e.g. wrapped by an outer hero card on the home page). */
  showImageFrame?: boolean;
};

/**
 * Responsive hero image: scales to container width, height follows aspect ratio.
 * On large screens height is capped so the hero does not dominate the page.
 * Replace `src/assets/carl_and_kim.png` with your file (keep the same name/path).
 */
export function CarlAndKimBanner({ showImageFrame = true }: BannerProps) {
  return (
    <figure className="mx-auto w-full max-w-4xl">
      <Image
        src={carlAndKim}
        alt="Carl and Kim"
        priority
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 92vw, 896px"
        className={
          showImageFrame
            ? "h-auto w-full max-h-[min(52vh,560px)] rounded-2xl border border-kim-navy/15 object-contain object-center shadow-md"
            : "h-auto w-full max-h-[min(52vh,560px)] rounded-2xl object-contain object-center"
        }
      />
    </figure>
  );
}
