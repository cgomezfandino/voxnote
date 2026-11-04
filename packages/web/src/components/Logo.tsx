interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

/** Brand lockup: voice-wave mark + lowercase `voxnote` wordmark. */
export default function Logo({ size = 36, withWordmark = true }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <img
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        className="rounded-[26%] shrink-0"
      />
      {withWordmark && (
        <span
          className="font-bold tracking-tight text-foreground lowercase"
          style={{ fontSize: Math.round(size * 0.52) }}
        >
          voxnote
        </span>
      )}
    </span>
  );
}

/** Icon-only version for small spaces. */
export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return <img src="/logo.svg" alt="" className={`rounded-[26%] ${className}`} />;
}
