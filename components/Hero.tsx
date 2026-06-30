import type { Messages } from "@/lib/i18n";
import { NeptuneLogo } from "./NeptuneLogo";

interface HeroProps {
  messages: Messages;
}

export function Hero({ messages }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-5 pt-0 text-center sm:px-8 sm:pb-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto">
          <div className="mb-6 flex justify-center">
            <NeptuneLogo size="lg" />
          </div>
          <h1 className="relative left-1/2 mx-0 w-screen -translate-x-1/2 px-5 text-center text-4xl font-semibold leading-[1.08] tracking-normal text-slate-950 text-balance sm:px-8 sm:text-5xl">
            {messages.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-5xl text-base leading-7 text-slate-600 sm:text-lg xl:whitespace-nowrap">
            {messages.hero.description}
          </p>
        </div>
      </div>
    </section>
  );
}
