export function Header() {
  return (
    <header className="py-10 sm:py-14">
      <div className="mb-6 flex items-center justify-between">
        <a
          className="flex items-center gap-2 font-semibold text-sm tracking-tight"
          href="./"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-charcoal text-white">
            S
          </span>
          Sized
        </a>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500 text-xs shadow-sm">
          Browser-only
        </span>
      </div>
      <div className="max-w-2xl">
        <p className="mb-3 font-medium text-accent text-xs uppercase tracking-[0.18em]">
          App Store screenshot generator
        </p>
        <h1 className="font-semibold text-3xl tracking-[-0.035em] sm:text-5xl">
          One image in. Every master size out.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600 leading-relaxed sm:text-lg">
          Create current iPhone and iPad screenshots locally, with the right
          dimensions and no alpha channel.
        </p>
      </div>
    </header>
  );
}
