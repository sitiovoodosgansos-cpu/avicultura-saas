"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bird,
  Check,
  ChevronRight,
  CircleDollarSign,
  Egg,
  FileBarChart2,
  FlaskConical,
  HeartPulse,
  Sparkles
} from "lucide-react";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const navItems = [
  { label: "Recursos", href: "#recursos" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Preço", href: "#preco" },
  { label: "FAQ", href: "#faq" }
];

const pains = [
  "ovos sem histórico",
  "aves doentes sem acompanhamento claro",
  "gastos espalhados",
  "falta de visão do lucro",
  "anotações perdidas"
];

const solutions = [
  "centraliza tudo",
  "organiza a rotina",
  "ajuda a tomar decisões",
  "profissionaliza o criatório"
];

const features: Feature[] = [
  {
    title: "Controle do plantel",
    description:
      "Cadastre espécies, raças, variedades, anilhas, reprodutores, matrizes e status de cada ave.",
    icon: Bird
  },
  {
    title: "Coleta de ovos",
    description:
      "Registre a produção por dia, lote, grupo ou calendário e acompanhe o desempenho da postura.",
    icon: Egg
  },
  {
    title: "Sanidade e enfermaria",
    description:
      "Anote sintomas, tratamentos, medicamentos, evolução do quadro e organize suas enfermarias.",
    icon: HeartPulse
  },
  {
    title: "Chocadeiras e nascimentos",
    description:
      "Controle máquinas, lotes, datas, eventos, nascimentos, perdas e porcentagens de eclosão.",
    icon: FlaskConical
  },
  {
    title: "Financeiro completo",
    description: "Registre entradas, saídas, despesas e vendas com clareza.",
    icon: CircleDollarSign
  },
  {
    title: "Relatórios inteligentes",
    description:
      "Veja o que está funcionando, o que gera lucro e o que precisa de atenção.",
    icon: FileBarChart2
  }
];

const benefits = [
  "Mais lucro",
  "Menos perda",
  "Organização total",
  "Crescimento com clareza",
  "Decisões com mais segurança"
];

const audience = [
  "quem está começando",
  "quem já cria e quer mais controle",
  "quem quer transformar a criação em negócio",
  "quem quer crescer com organização"
];

const testimonials = [
  {
    quote:
      "Antes eu anotava tudo espalhado. Hoje consigo acompanhar ovos, gastos e aves com muito mais clareza.",
    author: "Carlos M., criador ornamental"
  },
  {
    quote:
      "O que mais gostei foi conseguir visualizar melhor a produção e o financeiro no mesmo lugar.",
    author: "Fernanda R., criadora de aves ornamentais"
  },
  {
    quote:
      "O app ajuda a transformar a rotina do criatório em gestão de verdade.",
    author: "Rafael S., produtor e vendedor"
  }
];

const faqs = [
  {
    question: "Eu ainda tenho poucas aves.",
    answer:
      "Melhor ainda. Começar organizado é mais fácil do que corrigir bagunça depois."
  },
  {
    question: "Eu já anoto no caderno.",
    answer:
      "O problema não é anotar. É conseguir acompanhar, comparar e decidir com rapidez."
  },
  {
    question: "Não sei se vou usar tudo.",
    answer: "Você começa pelo básico e evolui conforme sua criação cresce."
  },
  {
    question: "R$37 por mês vale a pena?",
    answer:
      "Se o app te ajudar a evitar perdas, controlar melhor sua produção e enxergar seu resultado, ele já se paga."
  }
];

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  variant = "light"
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p
          className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
            isDark
              ? "border border-emerald-300/30 bg-emerald-200/20 text-emerald-100"
              : "border border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-heading text-3xl font-semibold tracking-tight sm:text-4xl ${
          isDark ? "text-white" : "text-slate-950"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${
            isDark ? "text-slate-200" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function PrimaryCTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(6,78,59,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-800"
    >
      {children}
    </Link>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <motion.article
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-50 text-emerald-800">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-slate-900">{feature.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
    </motion.article>
  );
}

function AppPhoneMockup() {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15 }}
      className="mx-auto w-full max-w-[340px] rounded-[2.4rem] border border-slate-200 bg-slate-900 p-3 shadow-[0_35px_80px_rgba(2,6,23,0.35)]"
    >
      <div className="overflow-hidden rounded-[2rem] bg-slate-50">
        <div className="h-7 w-full bg-slate-900" />
        <div className="space-y-3 p-4">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Hoje</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Ovos coletados: 28</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 w-4/5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Financeiro</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Saldo do mês: R$ 4.870</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Sanidade</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">2 aves em observação</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function OrnabirdLanding() {
  return (
    <div className="bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="#topo" className="font-heading text-xl font-semibold tracking-tight text-slate-950">
            Ornabird
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-emerald-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <PrimaryCTA href="#preco">Teste grátis</PrimaryCTA>
        </div>
      </header>

      <main id="topo">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(5,150,105,0.16),transparent_35%),radial-gradient(circle_at_90%_8%,rgba(245,158,11,0.18),transparent_30%)]" />
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 px-4 py-14 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-20 lg:py-24">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Gestão premium para criatórios
              </p>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Transforme seu criatório em uma operação organizada, lucrativa e profissional.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                O Ornabird é o aplicativo para criadores de aves ornamentais que querem controlar
                plantel, ovos, sanidade, chocadeiras, financeiro e relatórios em um só lugar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PrimaryCTA href="#preco">Começar meu teste grátis</PrimaryCTA>
                <Link
                  href="#como-funciona"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  Ver como funciona
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                7 dias grátis. Depois, R$37/mês. Cancele quando quiser.
              </p>
            </motion.div>

            <div className="relative">
              <div className="absolute -right-8 top-3 h-24 w-24 rounded-full bg-amber-200/70 blur-2xl" />
              <div className="absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-emerald-200/70 blur-2xl" />
              <AppPhoneMockup />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/70">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-8">
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className="rounded-3xl border border-rose-100 bg-white p-7 shadow-sm"
            >
              <h3 className="font-heading text-2xl font-semibold text-slate-900">Sem controle, o prejuízo é silencioso</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-600 sm:text-base">
                {pains.map((pain) => (
                  <li key={pain} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-400" />
                    {pain}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-7 shadow-sm"
            >
              <h3 className="font-heading text-2xl font-semibold text-slate-900">Com Ornabird, sua rotina vira gestão</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700 sm:text-base">
                {solutions.map((solution) => (
                  <li key={solution} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-emerald-700" />
                    {solution}
                  </li>
                ))}
              </ul>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Preview do Dashboard</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-900 p-3 text-white">
                    <p className="text-xs text-slate-300">Lucro estimado</p>
                    <p className="mt-1 text-sm font-semibold">R$ 9.420</p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-900">
                    <p className="text-xs">Taxa de eclosão</p>
                    <p className="mt-1 text-sm font-semibold">87%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="recursos" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            eyebrow="Recursos"
            title="Tudo para controlar o criatório em uma única plataforma"
            description="Fluxos pensados para quem precisa de produtividade no dia a dia e visão clara do resultado no fim do mês."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </section>

        <section id="beneficios" className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(5,150,105,0.3),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.25),transparent_30%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Benefícios"
              title="Mais clareza para operar, mais confiança para crescer"
              description="O Ornabird transforma dados de rotina em decisões práticas para sua criação render mais."
              variant="dark"
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-center text-sm font-semibold text-emerald-100 backdrop-blur"
                >
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            centered
            eyebrow="Como funciona"
            title="Da primeira ave ao relatório mensal em 3 passos"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "Cadastre seu criatório",
              "Registre sua rotina",
              "Acompanhe seus resultados"
            ].map((step, index) => (
              <div key={step} className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-xs font-semibold text-white">
                  {index + 1}
                </p>
                <h3 className="font-heading text-xl font-semibold text-slate-900">{step}</h3>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <PrimaryCTA href="#preco">Testar por 7 dias</PrimaryCTA>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Para quem"
              title="Feito para criadores em qualquer fase"
              description="Do início da criação ao crescimento com operação profissional."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {audience.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700"
                >
                  <Activity className="h-4 w-4 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            centered
            eyebrow="Prova social"
            title="Criadores estão buscando mais controle e mais resultado"
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.author} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <blockquote className="text-sm leading-relaxed text-slate-700 sm:text-base">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm font-semibold text-slate-900">
                  {testimonial.author}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="preco" className="bg-gradient-to-b from-white to-emerald-50/60 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHeading
              centered
              eyebrow="Preço"
              title="Plano único para organizar seu criatório inteiro"
              description="Menor que o custo de muitos erros que passam despercebidos no mês."
            />

            <div className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-[0_25px_100px_rgba(5,150,105,0.16)] sm:p-9">
              <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                7 dias grátis
              </p>
              <p className="mt-6 font-heading text-5xl font-semibold tracking-tight text-slate-950">R$37/mês</p>
              <p className="mt-2 text-sm text-slate-500">Cancele quando quiser</p>

              <ul className="mt-7 space-y-3 text-sm text-slate-700">
                {[
                  "controle do plantel",
                  "coleta de ovos",
                  "sanidade e enfermaria",
                  "controle de chocadeiras",
                  "financeiro",
                  "relatórios e dashboard"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-700" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <PrimaryCTA href="#topo">Começar agora</PrimaryCTA>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading centered eyebrow="FAQ" title="Dúvidas comuns antes de começar" />

          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-semibold text-slate-900">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-900 py-16 text-white sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(16,185,129,0.34),transparent_32%),radial-gradient(circle_at_92%_20%,rgba(245,158,11,0.28),transparent_28%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
              Seu criatório merece mais controle, mais clareza e mais resultado.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Pare de depender de anotações soltas, memória e improviso. Com o Ornabird, você
              profissionaliza sua rotina e acompanha sua criação com visão de negócio.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="#preco"
                className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
              >
                Começar meu teste grátis
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-300">7 dias grátis. Depois, R$37/mês.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-heading text-lg font-semibold text-slate-900">Ornabird</p>
            <p className="mt-1 text-sm text-slate-500">
              Ornabird - Gestão inteligente para criadores de aves ornamentais.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="#" className="hover:text-slate-900">
              Termos
            </Link>
            <Link href="#" className="hover:text-slate-900">
              Privacidade
            </Link>
            <Link href="#" className="hover:text-slate-900">
              Suporte
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
