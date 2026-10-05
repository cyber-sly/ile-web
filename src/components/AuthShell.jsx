// Split layout for login/signup: form on cream, photo panel on large screens.
export default function AuthShell({ title, subtitle, image, quote, children }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
        <div className="animate-fade-up w-full max-w-md">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden p-6 lg:block">
        <div className="relative isolate h-full overflow-hidden rounded-[var(--radius-hero)]">
          <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0F1C15]/80 via-transparent to-transparent" />
          {quote && (
            <p className="absolute inset-x-8 bottom-8 font-serif text-3xl font-medium leading-snug text-white">
              {quote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Only allow same-site relative paths as post-login destinations.
export function safeNext(next) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
