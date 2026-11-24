import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

const COVERS = {
  cafe: "/clips/cafe-madrid/cover.jpg",
  words: "/clips/picture-words/cover.jpg",
  food: "/clips/food-quiz/cover.jpg",
  puppet: "/clips/haz-tu-tarea/cover.jpg",
};

type Tone = "orange" | "dark" | "white" | "outline";

function Cta({
  to,
  href,
  tone = "orange",
  size = "md",
  children,
}: {
  to?: string;
  href?: string;
  tone?: Tone;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const tones: Record<Tone, string> = {
    orange: "bg-orange text-ink hover:bg-orange-dark",
    dark: "bg-ink text-white hover:bg-ink-soft",
    white: "bg-white text-ink hover:bg-snow",
    outline: "border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
  };
  const sizes = { md: "min-h-12 px-6 text-base", lg: "min-h-14 px-8 text-lg md:min-h-16 md:px-10 md:text-xl" };
  const cls = `inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-orange ${tones[tone]} ${sizes[size]}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a href="#top" aria-label="MovaQuest home" className="flex items-center gap-2 py-2 focus-visible:outline-4 focus-visible:outline-orange">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-xl bg-orange text-lg font-extrabold leading-none text-ink">
        М
      </span>
      <span className={`text-2xl font-extrabold tracking-tight ${dark ? "text-white" : "text-ink"}`}>MovaQuest</span>
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-5 md:h-[76px] md:px-10">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
          {[
            ["How it works", "#how"],
            ["Features", "#features"],
            ["Levels", "#levels"],
            ["FAQ", "#faq"],
          ].map(([l, h]) => (
            <a key={h} href={h} className="py-3 text-[15px] font-medium text-ink hover:text-orange-dark">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#join" className="hidden px-3 py-3 text-[15px] font-medium hover:text-orange-dark sm:block">
            Join the waitlist
          </a>
          <Cta to="/home">Play now</Cta>
        </div>
      </div>
    </header>
  );
}

function Phone({ src, children, className = "" }: { src: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto aspect-[9/18.5] w-full max-w-[290px] rounded-[44px] border-[10px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-ink">
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {children}
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div aria-hidden className="flex h-8 items-center gap-1">
      {[0.2, 0.5, 0.1, 0.7, 0.35, 0.9, 0.25, 0.6, 0.4, 0.8, 0.15, 0.55].map((d, i) => (
        <i key={i} className="wave-bar block h-full w-1 rounded-full bg-orange" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

function DemoPhone() {
  const options = ["leche", "hielo", "azúcar"];
  const [pick, setPick] = useState<string | null>(null);
  const right = pick === "leche";
  const wrong = pick !== null && !right;

  return (
    <Phone src={COVERS.cafe} className="float">
      <div className="absolute inset-x-0 top-6 flex justify-center">
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Café in Madrid · Beginner</span>
      </div>
      <div className="absolute inset-x-3 bottom-4 rounded-3xl bg-white p-4 text-ink shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Say the next word</p>
        <p className="mt-1 text-2xl font-extrabold leading-tight">
          Un café con{" "}
          <span className={`inline-block min-w-[3.5ch] rounded-md px-1 ${right ? "bg-mint" : "border-b-4 border-orange"}`}>{right ? "leche" : "   "}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pick an answer">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setPick(o)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                pick === o ? (right ? "border-ink bg-mint" : "border-ink bg-lavender") : "border-line bg-snow hover:border-ink"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          {right ? (
            <p role="status" className="text-sm font-bold">
              ¡Muy bien! Video continues…
            </p>
          ) : wrong ? (
            <p role="status" className="text-sm font-bold">
              Almost. Try again!
            </p>
          ) : (
            <Waveform />
          )}
          <span aria-hidden className="mic-pulse grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </span>
        </div>
      </div>
    </Phone>
  );
}

function Hero() {
  return (
    <section id="top" className="overflow-hidden">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-16 pt-6 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-24 lg:pt-12">
        <div>
          <h1 className="text-[48px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-7xl lg:text-[88px]">Learn Spanish by saying it.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Scroll real short videos. When one pauses, say the next word out loud. Get instant feedback and build confidence in 10 minutes a day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Cta to="/home" size="lg">
              Play the prototype
            </Cta>
            <Cta href="#join" tone="outline" size="lg">
              Join the waitlist
            </Cta>
          </div>
          <p className="mt-5 text-sm font-medium text-ink-soft">Free early prototype · Works in your phone browser · No sign-up needed</p>
        </div>
        <DemoPhone />
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-3 px-5 pb-12 md:px-10">
        {[
          ["🇪🇸", "Spanish (Spain)", true],
          ["🇺🇦", "Українська interface", false],
          ["🇬🇧", "English interface", false],
          ["🇪🇸", "Interfaz en español", false],
        ].map(([flag, label, active]) => (
          <span
            key={label as string}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-5 text-[15px] font-semibold ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
          >
            <span aria-hidden>{flag}</span>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function Statement() {
  return (
    <section className="px-5 py-16 text-center md:px-10 md:py-28">
      <h2 className="mx-auto max-w-5xl text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-7xl lg:text-[96px]">
        Scroll. Pause. Speak.
      </h2>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
        Turn your doomscrolling habit into speaking practice. Every clip is a tiny real-life moment and one word you have to say yourself.
      </p>
      <div className="mt-8">
        <Cta to="/home" size="lg">
          Try it now
        </Cta>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section id="how" className="px-3 md:px-6">
      <div className="mx-auto max-w-[1360px] overflow-hidden rounded-[32px] bg-orange px-5 py-14 md:rounded-[48px] md:px-14 md:py-20">
        <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">Learn with videos you'd scroll anyway.</h2>
            <p className="mt-5 max-w-md text-lg md:text-xl">Real Spanish from creators, street scenes and everyday situations. Not textbook dialogues.</p>
            <ol className="mt-8 space-y-4">
              {[
                ["1", "Watch", "A short clip plays with subtitles in the languages you choose."],
                ["2", "Say it", "The video pauses before a word. Speak it, or type it if you can't talk right now."],
                ["3", "Hear it", "Right answer? The clip keeps going and you hear the real word. Wrong? Hints and more tries."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-lg font-extrabold text-white">{n}</span>
                  <div>
                    <h3 className="text-xl font-extrabold">{t}</h3>
                    <p className="mt-0.5 max-w-md">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-3 items-end gap-3 md:gap-6">
            <Phone src={COVERS.food} className="!border-[6px] !rounded-[28px] md:!border-[8px] md:!rounded-[36px] [&>div]:!rounded-[22px] md:[&>div]:!rounded-[28px]" />
            <Phone src={COVERS.words} className="!border-[6px] !rounded-[28px] md:!border-[8px] md:!rounded-[36px] [&>div]:!rounded-[22px] md:[&>div]:!rounded-[28px] md:-translate-y-8" />
            <Phone src={COVERS.puppet} className="!border-[6px] !rounded-[28px] md:!border-[8px] md:!rounded-[36px] [&>div]:!rounded-[22px] md:[&>div]:!rounded-[28px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    ["🎙️", "Speak, don't tap", "Answer with your voice. No mic or a noisy place? Type it instead.", "bg-mint"],
    ["⏸️", "Smart pauses", "The video stops right before the word, so you see the context and fill the gap.", "bg-lime"],
    ["🔁", "Retry any word", "Rewind four seconds, try again, or skip. You are never stuck.", "bg-sky"],
    ["💬", "Subtitles your way", "Spanish, English, Ukrainian — pick any combination, even during playback.", "bg-lavender"],
    ["✅", "Honest feedback", "We check what you actually said, forgive tiny slips and tell you when it's unclear.", "bg-white"],
    ["📱", "Feels like a feed", "Swipe up for the next clip, double-tap to like. A habit that feels familiar.", "bg-white"],
  ];
  return (
    <section id="features" className="bg-lilac px-3 py-4 md:px-6">
      <div className="mx-auto max-w-[1240px] px-2 py-14 md:py-24">
        <h2 className="mx-auto max-w-4xl text-center text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[84px]">Built for speaking.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg md:text-xl">Everything in MovaQuest pushes you to produce the language, not just recognise it.</p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([icon, title, text, bg]) => (
            <li key={title} className={`rounded-[28px] p-7 ${bg}`}>
              <span aria-hidden className="text-4xl">
                {icon}
              </span>
              <h3 className="mt-5 text-2xl font-extrabold leading-tight">{title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-ink/80">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Levels() {
  const levels = [
    {
      name: "Beginner",
      bg: "bg-mint",
      points: ["Slow, clear everyday phrases", "Hints open right away", "Words you'll use on day one of a trip"],
    },
    {
      name: "Intermediate",
      bg: "bg-lime",
      points: ["Natural speed and real slang", "Fewer hints, more context", "Short conversations, not single words"],
    },
    {
      name: "Advanced",
      bg: "bg-lavender",
      points: ["Fast native speech", "Fill the gaps without help", "Humour, idioms and street talk"],
    },
  ];
  return (
    <section id="levels" className="bg-snow px-5 py-16 md:px-10 md:py-28">
      <div className="mx-auto max-w-[1240px] text-center">
        <h2 className="mx-auto max-w-4xl text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[84px]">Spanish at your level.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft md:text-xl">Tell us your level and why you're going to Spain. We start from there.</p>
        <div className="mt-8">
          <Cta to="/home">Start for free</Cta>
        </div>
        <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
          {levels.map((l) => (
            <div key={l.name} className={`rounded-[28px] p-7 md:p-9 ${l.bg}`}>
              <h3 className="text-4xl font-extrabold tracking-tight md:text-5xl">{l.name}</h3>
              <ul className="mt-6 space-y-3">
                {l.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[17px] font-medium">
                    <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-ink" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Device() {
  return (
    <section className="px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-[1360px] items-center gap-10 overflow-hidden rounded-[32px] bg-ink px-6 py-14 text-white md:rounded-[48px] md:px-14 md:py-20 lg:grid-cols-2">
        <div>
          <h2 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">Open a link. Start talking.</h2>
          <p className="mt-5 max-w-lg text-lg text-white/80 md:text-xl">
            MovaQuest runs in your mobile browser, tuned for Android Chrome first. No download, no waiting, no account. Sign in only when you want to save progress.
          </p>
          <div className="mt-8">
            <Cta to="/home" tone="orange" size="lg">
              Play the prototype
            </Cta>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["15 sec", "per clip, one speaking action"],
            ["2–5 min", "perfect for a coffee queue"],
            ["3", "interface languages"],
            ["0", "downloads or sign-ups to try"],
          ].map(([big, small]) => (
            <div key={big} className="rounded-3xl bg-white/10 p-6">
              <p className="text-4xl font-extrabold tracking-tight text-orange md:text-5xl">{big}</p>
              <p className="mt-2 text-[15px] text-white/80">{small}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Audience() {
  const bubbles = [
    ["I studied Spanish at school, but I freeze when a real person talks to me.", "bg-sky", "Refreshing before a trip"],
    ["I'm moving to Spain for a while and want to survive the first week.", "bg-lime", "Moving abroad"],
    ["I hate speaking in front of people. I'd rather practise alone first.", "bg-lavender", "The shy one"],
    ["I only have five minutes between meetings, not a whole lesson.", "bg-mint", "The busy one"],
  ];
  return (
    <section className="px-5 py-16 md:px-10 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="mx-auto max-w-4xl text-center text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[84px]">Made for people who feel stuck.</h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {bubbles.map(([quote, bg, who], i) => (
            <li key={who} className={`rounded-[28px] p-7 md:p-9 ${bg} ${i % 2 ? "md:translate-y-6" : ""}`}>
              <p className="text-xl font-bold leading-snug md:text-2xl">“{quote}”</p>
              <p className="mt-5 text-[15px] font-semibold text-ink/70">{who}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const qa = [
    ["What is MovaQuest?", "A mobile-first web app where you scroll short vertical Spanish videos. At key moments the video pauses and you say the next word or answer a question. We check your answer and give instant feedback."],
    ["Which language can I learn?", "Spanish (Spain) for now. The interface works in English, Ukrainian and Spanish, and subtitles can show Spanish, English and Ukrainian together."],
    ["Do I need an account?", "No. You can start watching right away. Create an account only if you want to keep your progress, likes and saved videos."],
    ["What if I can't use my microphone?", "Type the answer instead. If the microphone is blocked in your browser, typing turns on automatically. You can also skip any word."],
    ["How do you check my pronunciation?", "We transcribe what you said and compare it to the expected word, forgiving tiny slips. If it's unclear or silent, we simply ask you to try again and it doesn't count as a miss."],
    ["Is it free?", "The early prototype is free to play. Pricing for the full version isn't decided yet and we'll share it before launch."],
  ];
  return (
    <section id="faq" className="px-5 py-16 md:px-10 md:py-28">
      <div className="mx-auto max-w-[900px]">
        <h2 className="text-[44px] font-extrabold leading-none tracking-[-0.035em] sm:text-6xl lg:text-7xl">FAQ</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {qa.map(([q, a]) => (
            <details key={q} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3 text-lg font-bold md:text-xl">
                {q}
                <svg className="chev h-5 w-5 shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="max-w-2xl pb-5 text-[17px] leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

type FormState = "idle" | "error" | "success";

function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) setState("success");
    else setState("error");
  }

  if (state === "success") {
    return (
      <div role="status" className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-ink">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-mint font-extrabold">
          ✓
        </span>
        <p className="text-lg font-bold">You're on the list. Thank you!</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full max-w-xl">
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="your@email.com"
          autoComplete="email"
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? "email-err" : undefined}
          className={`min-h-14 flex-1 rounded-full border-2 bg-white px-6 text-lg text-ink placeholder:text-ink-soft/70 focus:outline-4 focus:outline-offset-2 focus:outline-orange ${state === "error" ? "border-red-600" : "border-transparent"}`}
        />
        <button type="submit" className="min-h-14 rounded-full bg-ink px-8 text-lg font-semibold text-white transition-colors hover:bg-ink-soft focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white">
          Notify me
        </button>
      </div>
      {state === "error" && (
        <p id="email-err" role="alert" className="mt-3 inline-block rounded-full bg-white px-4 py-1 text-sm font-semibold text-red-700">
          That email doesn't look right. Check it and try again.
        </p>
      )}
    </form>
  );
}

function FinalCTA() {
  return (
    <section id="join" className="px-3 pb-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-[1360px] rounded-[32px] bg-orange px-6 py-16 text-center md:rounded-[48px] md:py-24">
        <h2 className="mx-auto max-w-4xl text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[84px]">Try the fastest way to start speaking.</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg md:text-xl">Leave your email and we'll tell you when the next version is ready. No spam, only updates that matter.</p>
        <div className="mt-8">
          <Waitlist />
        </div>
        <p className="mt-6 text-[15px] font-medium">
          Or jump straight in:{" "}
          <Link to="/home" className="inline-block py-2 font-bold underline underline-offset-4">
            play the prototype
          </Link>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-6 bg-ink text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-10">
        <Logo dark />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-1">
          <a href="#how" className="py-2 text-white/80 hover:text-orange">How it works</a>
          <a href="#faq" className="py-2 text-white/80 hover:text-orange">FAQ</a>
          <a href="mailto:hello@movaquest.example" className="py-2 text-white/80 hover:text-orange">Contact</a>
          <Link to="/home" className="py-2 text-white/80 hover:text-orange">Play the prototype</Link>
          <Link to="/privacy" className="py-2 text-white/80 hover:text-orange">Privacy</Link>
        </nav>
        <p className="text-sm text-white/60">© 2026 MovaQuest team</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "MovaQuest — learn Spanish by saying it";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="landing-root min-h-screen overflow-x-clip">
      <Header />
      <main>
        <Hero />
        <Statement />
        <Showcase />
        <Features />
        <Levels />
        <Device />
        <Audience />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
