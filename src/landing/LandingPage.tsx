import { useEffect, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import PixelScene from "./PixelScene";
import "./landing.css";

const JOIN = "Join the early access list";

function Button({
  href,
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "ochre";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 border-2 border-ink px-5 py-3 font-display text-base font-bold transition-transform duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-stop";
  const styles = {
    primary: "bg-tram text-white pixel-shadow-sm hover:bg-tram-dark",
    ochre: "bg-ochre text-ink pixel-shadow-sm hover:bg-[#f7c85a]",
    ghost: "bg-paper text-ink hover:bg-paper-deep",
  }[variant];
  const cls = `${base} ${styles} ${className}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

function Eyebrow({ children, tone = "ink" }: { children: ReactNode; tone?: "ink" | "paper" | "tram" }) {
  const c = { ink: "text-ink", paper: "text-paper", tram: "text-tram" }[tone];
  return (
    <p className={`font-pixel text-sm font-bold uppercase tracking-[0.14em] ${c}`}>
      <span className="mr-2 inline-block h-2.5 w-2.5 bg-ochre align-baseline outline-2 outline-current" />
      {children}
    </p>
  );
}

function Logo({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <a href="#top" className="flex items-center gap-2 py-2 focus-visible:outline-4 focus-visible:outline-stop" aria-label="MovaQuest home">
      <span aria-hidden className="grid h-8 w-8 place-items-center border-2 border-ink bg-ochre font-pixel text-lg font-bold leading-none text-ink">
        М
      </span>
      <span className={`font-display text-xl font-extrabold tracking-tight ${tone === "ink" ? "text-ink" : "text-paper"}`}>
        MovaQuest
      </span>
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-5 md:h-[72px] md:px-10">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {[
            ["How it works", "#how"],
            ["Features", "#features"],
            ["About", "#about"],
          ].map(([l, h]) => (
            <a key={h} href={h} className="py-3 font-medium text-ink underline-offset-8 hover:underline hover:decoration-tram hover:decoration-4">
              {l}
            </a>
          ))}
        </nav>
        <Button href="#join" className="!min-h-11 !px-3 text-sm md:!px-5 md:text-base">
          <span className="md:hidden">Join the list</span>
          <span className="hidden md:inline">{JOIN}</span>
        </Button>
      </div>
    </header>
  );
}

function GameWindow({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-2 border-ink bg-ink pixel-shadow ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 font-pixel text-xs uppercase tracking-widest text-paper">
        <span>{title}</span>
        <span aria-hidden className="flex gap-1">
          <i className="h-2 w-2 bg-ochre" />
          <i className="h-2 w-2 bg-tram" />
          <i className="h-2 w-2 bg-paper" />
        </span>
      </div>
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="dotgrid relative overflow-hidden">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-16 pt-10 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-28 lg:pt-20">
        <div>
          <Eyebrow tone="tram">A story-driven RPG for learning Ukrainian</Eyebrow>
          <h1 className="mt-5 font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-[84px]">
            Stop memorizing <span className="bg-ochre px-1 [box-decoration-break:clone]">words.</span> Start talking.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft lg:text-xl">
            Walk through a Ukrainian city, meet real characters, and use the language to get things done: buy a ticket, order a coffee, ask for directions. No judgment, no limit on tries.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="#join">{JOIN}</Button>
            <Button href="#how" variant="ghost">
              See how it works
            </Button>
          </div>
          <p className="mt-5 font-pixel text-sm text-ink-soft">Early prototype. Be among the first to try it.</p>
        </div>

        <div className="relative">
          <GameWindow title="Вінниця · 08:42">
            <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
              <PixelScene variant="street" slice className="h-full w-full" />
              <div className="absolute left-3 top-3 border-2 border-ink bg-paper px-2 py-1 font-pixel text-xs uppercase tracking-wider text-ink">
                Placeholder · game screenshot
              </div>
              <div className="absolute inset-x-3 bottom-3 border-2 border-ink bg-paper p-3 text-sm shadow-[4px_4px_0_#1c1b2e]">
                <p className="font-pixel text-xs uppercase tracking-wider text-tram">Автобусна станція</p>
                <p className="mt-1 font-medium">
                  Один квиток до Києва, будь ласка.<span className="blink ml-1">▮</span>
                </p>
              </div>
            </div>
          </GameWindow>
          <div className="absolute -right-2 -top-5 hidden rotate-6 border-2 border-ink bg-tram px-3 py-2 font-pixel text-sm font-bold text-white sm:block lg:-right-6">
            Tap any word →
          </div>
        </div>
      </div>
      <TransitStripe />
    </section>
  );
}

function TransitStripe() {
  return (
    <div aria-hidden className="h-3 w-full border-y-2 border-ink bg-[repeating-linear-gradient(90deg,#c9391f_0_36px,#f4ecdc_36px_72px,#1d6a4c_72px_108px,#f0b83a_108px_144px)]" />
  );
}

function ProblemCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="flex flex-col gap-4 border-2 border-paper bg-ink-soft p-6 transition-transform hover:-translate-y-1">
      <span className="font-pixel text-5xl font-bold leading-none text-ochre">{n}</span>
      <h3 className="font-display text-2xl font-bold leading-tight text-paper">{title}</h3>
      <p className="leading-relaxed text-paper/85">{body}</p>
    </article>
  );
}

function Problem() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
        <h2 className="max-w-4xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
          You know the words. So why can't you <span className="text-ochre">say</span> them?
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <ProblemCard n="01" title="Learning feels like a second job." body="After a long day, flashcards lose to anything more fun." />
          <ProblemCard n="02" title="Apps teach words, not conversations." body="Months of streaks, and still no idea how to answer a real person." />
          <ProblemCard n="03" title="Fear of getting it wrong." body="Cases, endings, pronunciation... and a real person waiting for your reply." />
        </div>
      </div>
    </section>
  );
}

function WhatIs() {
  return (
    <section id="about" className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:px-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-28">
      <div>
        <Eyebrow>What is MovaQuest</Eyebrow>
        <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
          Learn Ukrainian by living a day in Ukraine
        </h2>
      </div>
      <div className="self-end border-l-4 border-tram pl-6 lg:pl-8">
        <p className="text-xl leading-relaxed lg:text-2xl lg:leading-[1.45]">
          MovaQuest is a 2D story RPG where the language is your key to the world. You explore a city, talk to the people you meet, and every conversation moves the story forward. You are not answering quiz questions. You are solving real everyday situations, in Ukrainian.
        </p>
      </div>
    </section>
  );
}

function Step({ n, title, body, icon }: { n: number; title: string; body: string; icon: ReactNode }) {
  return (
    <li className="relative flex gap-5 border-2 border-ink bg-paper p-5 pixel-shadow-sm lg:flex-col lg:p-7">
      <div className="flex shrink-0 flex-col items-center gap-3 lg:flex-row lg:justify-between">
        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-tram font-pixel text-3xl font-bold text-white">{n}</span>
        <span aria-hidden className="hidden h-14 w-14 lg:block">{icon}</span>
      </div>
      <div>
        <h3 className="font-display text-3xl font-extrabold">{title}</h3>
        <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

const px = { shapeRendering: "crispEdges" as const, viewBox: "0 0 14 14" };
const IconWalk = (
  <svg {...px}>
    <rect x="5" y="1" width="4" height="4" fill="#1c1b2e" />
    <rect x="4" y="5" width="6" height="5" fill="#c9391f" />
    <rect x="4" y="10" width="2" height="3" fill="#1c1b2e" />
    <rect x="8" y="10" width="2" height="3" fill="#1c1b2e" />
  </svg>
);
const IconTalk = (
  <svg {...px}>
    <rect x="1" y="2" width="12" height="8" fill="#1c1b2e" />
    <rect x="3" y="10" width="3" height="3" fill="#1c1b2e" />
    <rect x="3" y="5" width="2" height="2" fill="#f0b83a" />
    <rect x="6" y="5" width="2" height="2" fill="#f0b83a" />
    <rect x="9" y="5" width="2" height="2" fill="#f0b83a" />
  </svg>
);
const IconRemember = (
  <svg {...px}>
    <rect x="2" y="3" width="10" height="9" fill="#1c1b2e" />
    <rect x="3" y="4" width="8" height="7" fill="#f4ecdc" />
    <rect x="6" y="1" width="2" height="3" fill="#1d6a4c" />
    <rect x="5" y="6" width="4" height="2" fill="#c9391f" />
  </svg>
);

function How() {
  return (
    <section id="how" className="border-y-2 border-ink bg-ochre">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
          Explore. Talk. Remember.
        </h2>
        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          <Step n={1} icon={IconWalk} title="Explore." body="Walk around the city: a bus station, a café, a park, the embankment." />
          <Step n={2} icon={IconTalk} title="Talk." body="Chat with locals in realistic dialogues. Tap any word to see its translation." />
          <Step n={3} icon={IconRemember} title="Remember." body="Words you meet come back in short exercises, so they actually stick." />
        </ol>
      </div>
    </section>
  );
}

function Feature({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-t-2 border-ink py-6 lg:grid-cols-[80px_1fr_1.2fr] lg:items-baseline lg:gap-x-8 lg:py-8">
      <span className="font-pixel text-xl font-bold text-tram">{n}</span>
      <h3 className="font-display text-2xl font-bold leading-tight lg:text-3xl">{title}</h3>
      <p className="col-start-2 leading-relaxed text-ink-soft lg:col-start-3 lg:text-lg">{body}</p>
    </li>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
      <Eyebrow>Features</Eyebrow>
      <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Why it feels different</h2>
      <ul className="mt-10 border-b-2 border-ink lg:mt-14">
        <Feature n="A" title="Language in context" body="Every phrase has a purpose: you say it to get a ticket, a coffee or an answer." />
        <Feature n="B" title="A safe place to make mistakes" body="Try again as many times as you like. No grades, no awkward silences." />
        <Feature n="C" title="Written by native speakers" body="Dialogues are built around the real stumbling blocks for learners, including cases and word endings." />
        <Feature n="D" title="A story, not a syllabus" body="Characters, small mysteries and an ending worth reaching." />
        <Feature n="E" title="English and Ukrainian interface" body="Play in the language you are most comfortable with." />
      </ul>
    </section>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block border-2 border-ink bg-paper px-2 py-0.5 font-pixel text-xs uppercase tracking-wider text-ink">{children}</span>;
}

function DialogueFrame() {
  const [picked, setPicked] = useState<number | null>(null);
  const choices = ["Один квиток, будь ласка.", "Скільки це коштує?", "Вибачте, повторіть?"];
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      <PixelScene variant="cafe" slice className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 bg-ink/95 p-3 text-paper sm:p-4">
        <p className="font-pixel text-xs uppercase tracking-wider text-ochre">Character name</p>
        <p className="mt-1 text-sm sm:text-base">Dialogue text goes here. Добрий день! Що будете замовляти?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {choices.map((c, i) => (
            <button
              key={c}
              onClick={() => setPicked(i)}
              aria-pressed={picked === i}
              className={`min-h-11 border-2 px-3 text-left text-xs transition-colors sm:text-sm ${
                picked === i ? "border-ochre bg-ochre text-ink" : "border-paper/70 hover:border-ochre hover:text-ochre"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Shot({ label, tag, children, className = "" }: { label: string; tag: string; children: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <div className="relative border-2 border-paper bg-ink-soft">
        {children}
        <div className="absolute left-2 top-2 border-2 border-ink bg-ochre px-2 py-0.5 font-pixel text-xs uppercase tracking-wider text-ink">
          Placeholder · {tag}
        </div>
      </div>
      <figcaption className="mt-2 font-pixel text-sm text-paper/80">{label}</figcaption>
    </figure>
  );
}

function Gallery() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Eyebrow tone="paper">Screenshots</Eyebrow>
            <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">A first look at the world</h2>
          </div>
          <p className="max-w-md text-paper/85 lg:text-lg">Scenes from our early prototype: Vinnytsia, a city you can actually walk through.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <Shot className="lg:col-span-7" tag="16:9 screenshot" label="01 · Street scene">
            <div className="aspect-video">
              <PixelScene variant="street" slice className="h-full w-full" />
            </div>
          </Shot>
          <Shot className="lg:col-span-5" tag="16:9 dialogue overlay" label="02 · Dialogue overlay (try the choices)">
            <DialogueFrame />
          </Shot>
          <Shot className="lg:col-span-5" tag="16:9 screenshot" label="03 · Embankment">
            <div className="aspect-video">
              <PixelScene variant="embankment" slice className="h-full w-full" />
            </div>
          </Shot>
          <Shot className="mx-auto w-[220px] lg:col-span-3 lg:mx-0 lg:w-full" tag="mobile frame" label="04 · Mobile, portrait">
            <div className="aspect-[9/16] overflow-hidden">
              <PixelScene variant="cafe" slice className="h-full w-full" />
            </div>
          </Shot>
          <div className="hidden border-2 border-dashed border-paper/50 p-6 lg:col-span-4 lg:flex lg:flex-col lg:justify-end">
            <p className="font-pixel text-sm uppercase tracking-wider text-ochre">Replace me</p>
            <p className="mt-2 text-paper/85">Swap each framed placeholder for a real prototype screenshot. Keep the 16:9 viewport and the 9:16 mobile crop.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Audience() {
  const items = [
    "You've been learning Ukrainian for a few months and want to move from words to conversations.",
    "You have Ukrainian friends, a partner, colleagues or roots, and want to speak with them without freezing up.",
    "You love story games and want a language challenge that feels like play.",
    "You are working with a tutor and want a fun way to practise between lessons.",
  ];
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
      <Eyebrow>Who it's for</Eyebrow>
      <h2 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
        Made for learners who feel stuck
      </h2>
      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {items.map((t, i) => (
          <li key={i} className={`flex gap-4 border-2 border-ink p-5 pixel-shadow-sm lg:p-7 ${["bg-paper", "bg-paper-deep", "bg-paper-deep", "bg-paper"][i]}`}>
            <span aria-hidden className="mt-1.5 h-4 w-4 shrink-0 bg-stop" />
            <p className="text-lg leading-relaxed">{t}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Status() {
  return (
    <section className="border-y-2 border-ink bg-stop text-white">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:px-10 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <Eyebrow tone="paper">Project status</Eyebrow>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Built in the open, tested with learners</h2>
        </div>
        <div>
          <p className="text-lg leading-relaxed lg:text-xl">
            MovaQuest is an early-stage project by a team of five native Ukrainian speakers. We have a playable prototype and we are talking to learners to shape what comes next. Your feedback decides what we build.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Tag>Playable prototype</Tag>
            <Tag>Vinnytsia, first city</Tag>
            <Tag>More cities planned</Tag>
          </div>
        </div>
      </div>
    </section>
  );
}

function Plan() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-24">
      <div className="grid gap-6 border-2 border-dashed border-ink p-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:p-12">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">What we are aiming for</h2>
        <p className="text-lg leading-relaxed text-ink-soft lg:text-xl">
          One-time purchase instead of a subscription, planned for PC and web. Final price and platforms will be confirmed closer to launch.
        </p>
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
      <div role="status" className="flex items-center gap-4 border-2 border-ink bg-ochre p-5 pixel-shadow-sm">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center bg-stop font-pixel text-xl text-white">✓</span>
        <p className="font-display text-xl font-bold text-ink">You're on the list. Thank you!</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
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
          className={`min-h-12 flex-1 border-2 bg-paper px-4 text-lg text-ink placeholder:text-ink-soft/70 focus:outline-4 focus:outline-offset-2 focus:outline-ochre ${
            state === "error" ? "border-tram shadow-[4px_4px_0_#c9391f]" : "border-ink pixel-shadow-sm"
          }`}
        />
        <Button type="submit" variant="ochre" className="!bg-ink !text-paper hover:!bg-ink-soft">
          Notify me
        </Button>
      </div>
      {state === "error" && (
        <p id="email-err" role="alert" className="mt-3 inline-block bg-paper px-2 py-1 font-medium text-tram">
          ⚠ That email doesn't look right. Check it and try again.
        </p>
      )}
    </form>
  );
}

function FinalCTA() {
  return (
    <section id="join" className="bg-tram text-white">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">Want to be one of the first to play?</h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/95">
              Leave your email and we'll let you know when the next version is ready. No spam, only updates that matter.
            </p>
          </div>
          <div className="border-2 border-ink bg-paper p-5 text-ink pixel-shadow lg:p-8">
            <Waitlist />
            <p className="mt-6 border-t-2 border-ink/20 pt-5 text-ink-soft">
              Learned Ukrainian recently? We would love a 20-minute chat.{" "}
              <a href="mailto:hello@movaquest.example" className="inline-block py-2 font-semibold text-tram underline underline-offset-4 hover:text-tram-dark">
                Talk to us
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <Logo tone="paper" />
        <nav aria-label="Footer" className="flex gap-6">
          <a href="mailto:hello@movaquest.example" className="py-3 hover:text-ochre">Contact</a>
          <Link to="/credits" className="py-3 hover:text-ochre">Credits</Link>
          <Link to="/play" className="py-3 hover:text-ochre">Play the prototype</Link>
        </nav>
        <p className="font-pixel text-sm text-paper/80">© 2026 MovaQuest team</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "MovaQuest — learn Ukrainian by playing";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="landing-root min-h-screen overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Problem />
        <WhatIs />
        <How />
        <Features />
        <Gallery />
        <Audience />
        <Status />
        <Plan />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
