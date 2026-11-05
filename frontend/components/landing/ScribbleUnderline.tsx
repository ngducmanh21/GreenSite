interface ScribbleUnderlineProps {
  className?: string;
}

/**
 * SVG scribble underline — path cong giống hiệu ứng gạch tay.
 * Màu thay đổi theo class (mặc định teal-500).
 */
export default function ScribbleUnderline({ className = "" }: ScribbleUnderlineProps) {
  return (
    <svg
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 right-0 -bottom-3 w-full h-6 text-brand-500 ${className}`}
    >
      <path
        d="M2 14 C 60 4, 140 22, 220 10 S 290 18, 298 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
