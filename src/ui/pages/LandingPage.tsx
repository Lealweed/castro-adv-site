import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Compass,
  Cpu,
  Globe,
  HeartHandshake,
  Lock,
  MapPin,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const itemFade = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const areas: Array<{ title: string; icon: LucideIcon; items: string[] }> = [
  {
    title: 'Cível',
    icon: Scale,
    items: ['Contratos e obrigações', 'Responsabilidade civil', 'Cobranças e acordos'],
  },
  {
    title: 'Criminal',
    icon: ShieldCheck,
    items: ['Orientação e acompanhamento', 'Defesa técnica especializada', 'Fases investigatórias e processuais'],
  },
  {
    title: 'Empresarial',
    icon: Building2,
    items: ['Apoio a rotinas empresariais', 'Contratos e negociações', 'Prevenção e gestão de riscos'],
  },
  {
    title: 'Família',
    icon: HeartHandshake,
    items: ['Divórcio e dissolução', 'Guarda e convivência', 'Pensão alimentícia'],
  },
  {
    title: 'Trabalhista',
    icon: Briefcase,
    items: ['Relações e orientação trabalhista', 'Acordos e tratativas', 'Acompanhamento de demandas'],
  },
];

const team = [
  {
    name: 'Letícia Oliveira',
    role: 'Advogada',
    oab: 'OAB/PA 28811',
    bio: 'Atuação com foco em orientação jurídica, análise técnica e acompanhamento responsável de demandas cíveis e familiares.',
  },
  {
    name: 'Zuleide Castro',
    role: 'Advogada',
    bio: 'Atendimento humanizado e condução estratégica de casos, com comunicação clara e organização das informações do cliente.',
  },
  {
    name: 'Victor',
    role: 'Controller Jurídico',
    bio: 'Gestão interna, padronização de rotinas e apoio à organização de documentos, prazos e atendimentos do escritório.',
  },
  {
    name: 'Olga',
    role: 'Assessora Jurídica',
    bio: 'Apoio operacional e jurídico: triagem de informações, preparação de documentos e suporte ao fluxo de atendimento.',
  },
  {
    name: 'Maria',
    role: 'Assessora Jurídica',
    bio: 'Suporte ao time jurídico, organização de demandas e acompanhamento de atividades para manter o atendimento ágil.',
  },
];

const testimonials = [
  {
    name: 'Ricardo P.',
    initials: 'RP',
    text: 'Profissionalismo impecável. Conduziram meu caso com total transparência e resolveram em tempo recorde. Recomendo de olhos fechados.',
    rating: 5,
  },
  {
    name: 'Juliana S.',
    initials: 'JS',
    text: 'Escritório extremamente organizado. O portal exclusivo para clientes me deu muita paz de espírito — acompanhava tudo pelo celular.',
    rating: 5,
  },
  {
    name: 'Empresa A. C.',
    initials: 'EA',
    text: 'A assessoria empresarial mudou a forma como fechamos contratos. Assertivos, diretos e sem juridiquês.',
    rating: 5,
  },
  {
    name: 'Marcos V.',
    initials: 'MV',
    text: 'Tive um problema trabalhista complexo e fui muito bem orientado. Eles focam na melhor estratégia sem falsas promessas.',
    rating: 5,
  },
  {
    name: 'Fernanda L.',
    initials: 'FL',
    text: 'Excelente atendimento desde a recepção até a advogada especialista. Muito respeito e ética profissional no trato com o cliente.',
    rating: 5,
  },
  {
    name: 'Carlos A.',
    initials: 'CA',
    text: 'Equipe sempre disponível e ágil. Ter os andamentos do tribunal atualizados na plataforma deles faz toda a diferença.',
    rating: 5,
  },
];

const principles: Array<{ title: string; desc: string; icon: LucideIcon }> = [
  { title: 'Ética', desc: 'Respeito estrito às normas e limites da atuação.', icon: ShieldCheck },
  { title: 'Clareza', desc: 'Comunicação direta, sem juridiquês.', icon: Sparkles },
  { title: 'Estratégia', desc: 'Foco na melhor resolução possível.', icon: Compass },
  { title: 'Tecnologia', desc: 'Prazos e dados seguros em plataforma própria.', icon: Cpu },
];

const whatsappE164 = '5591983485747';
const whatsappDisplay = '(91) 98348-5747';
const address = {
  line1: 'Avenida Tupinambá, 19 — Galeria Parque 610, Sala 01',
  line2: 'Bairro Parque dos Carajás, Parauapebas — Pará',
};
const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(
    'Avenida Tupinambá, 19 Galeria parque 610 Sala 01 Bairro Parque dos Carajás, Parauapebas - Pará 68515-000',
  );

// ---------------------------------------------------------------------------
// Button class helpers
// ---------------------------------------------------------------------------
const techPrimaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-400 to-sky-500 text-slate-950 font-semibold text-xs uppercase tracking-[0.14em] px-7 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_12px_32px_-10px_rgba(14,165,233,0.6)] hover:from-sky-300 hover:to-sky-400 transition-all duration-200';

const techOutlineBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/5 text-sky-300 font-semibold text-xs uppercase tracking-[0.14em] px-7 py-3.5 hover:bg-sky-400/15 hover:border-sky-400/60 transition-all duration-200';

const techGhostBtn =
  'group inline-flex items-center justify-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-[0.16em] hover:text-white transition-colors duration-200';

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------
function TechDivider() {
  return (
    <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
  );
}

function SectionTitle({
  kicker,
  title,
  desc,
}: {
  kicker: string;
  title: string;
  desc: string;
}) {
  return (
    <motion.div className="mx-auto max-w-2xl text-center" variants={stagger}>
      <motion.span
        variants={itemFade}
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400"
      >
        {kicker}
      </motion.span>
      <motion.div variants={itemFade}>
        <TechDivider />
      </motion.div>
      <motion.h2
        variants={itemFade}
        className="mt-7 text-3xl font-semibold tracking-tight text-slate-100 md:text-5xl"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={itemFade}
        className="mt-4 text-base leading-relaxed text-slate-400"
      >
        {desc}
      </motion.p>
    </motion.div>
  );
}

function AreaCard({ area, wide = false }: { area: (typeof areas)[number]; wide?: boolean }) {
  void wide;
  const Icon = area.icon;
  return (
    <div className="group relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/65 p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-[0_20px_48px_-16px_rgba(14,165,233,0.16)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-slate-100">{area.title}</h3>
      </div>
      <ul className="mt-5 space-y-2.5">
        {area.items.map((it) => (
          <li key={it} className="flex items-start gap-3">
            <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-sky-400/50 transition-colors group-hover:bg-sky-400" />
            <span className="text-sm leading-relaxed text-slate-400">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamCard({ member }: { member: (typeof team)[number] }) {
  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-slate-950/65 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/30">
      <div className="mb-4 flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-sky-400/25 bg-gradient-to-br from-sky-400/15 to-indigo-500/15 text-base font-bold text-sky-200 transition-all group-hover:border-sky-400/45">
          {initials}
        </div>
        <div>
          <div className="text-base font-semibold text-slate-100">{member.name}</div>
          <div className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-sky-400/90">
            {member.role}
          </div>
          {member.oab && (
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">{member.oab}</div>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">{member.bio}</p>
    </div>
  );
}

function TestimonialCard({ name, initials, text, rating }: (typeof testimonials)[number]) {
  return (
    <div className="w-[340px] shrink-0 rounded-2xl border border-white/[0.08] bg-slate-950/65 p-6 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-sky-400/25">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-xs font-bold text-sky-300">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">{name}</div>
          <div className="mt-1 flex gap-0.5 text-sky-400">
            {Array.from({ length: rating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-sky-400 text-sky-400" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function LandingPage() {
  return (
    <div className="overflow-x-hidden bg-[#050811] text-slate-100">
      {/* ================================================================= */}
      {/* HERO                                                              */}
      {/* ================================================================= */}
      <section className="relative flex min-h-screen flex-col justify-center px-4 pb-16 pt-8 tech-grid-bg">
        {/* Background atmosphere */}
        <div className="pointer-events-none absolute right-0 top-0 h-[760px] w-[760px] bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.12),transparent_62%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[520px] w-[520px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.09),transparent_65%)]" />

        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[1fr_420px] lg:items-center xl:grid-cols-[1fr_460px]">
            {/* ---- Left: Headline + CTA ---- */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1.5"
              >
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">
                  Assessoria Jurídica Digital de Alto Padrão
                </span>
              </motion.div>

              <h1 className="text-[clamp(2.8rem,6.8vw,5.4rem)] font-bold leading-[1.03] tracking-tight text-slate-100">
                {(['Castro e', 'Oliveira'] as const).map((line, i) => (
                  <motion.span
                    key={line}
                    className="block"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.11, duration: 0.65, ease: EASE }}
                  >
                    {line}
                  </motion.span>
                ))}
                <motion.span
                  className="block bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.65, ease: EASE }}
                >
                  Advocacia Estratégica
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.55, ease: EASE }}
                className="mt-7 max-w-[520px] text-base leading-relaxed text-slate-400 sm:text-lg"
              >
                Atenção meticulosa aos detalhes, engenharia jurídica e plataforma própria com foco
                absoluto em resultados, agilidade e transparência.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.78, duration: 0.55, ease: EASE }}
                className="mt-10 flex flex-col items-start gap-3.5 sm:flex-row sm:items-center"
              >
                <a
                  href={`https://wa.me/${whatsappE164}`}
                  target="_blank"
                  rel="noreferrer"
                  className={techPrimaryBtn}
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                  Fale com a Equipe
                </a>
                <Link to="/portal" className={techOutlineBtn}>
                  <Globe className="h-4 w-4" strokeWidth={1.75} />
                  Acessar Portal
                </Link>
                <Link to="/app" className={techGhostBtn}>
                  Acesso Restrito
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.75} />
                </Link>
              </motion.div>

              {/* Trust metrics */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95, duration: 0.6 }}
                className="mt-14 grid grid-cols-3 gap-6 border-t border-white/[0.08] pt-10"
              >
                {[
                  { value: '100%', label: 'Sigilo Absoluto' },
                  { value: '24/7', label: 'Portal Exclusivo' },
                  { value: 'SLA', label: 'Gestão de Prazos' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="font-mono text-2xl font-bold text-sky-300 md:text-3xl">
                      {m.value}
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {m.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ---- Right: Portal preview card ---- */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.75, ease: EASE }}
              className="relative w-full"
            >
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.14),transparent_65%)] blur-3xl" />

              <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/80 p-7 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

                <div className="mb-7 flex items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-sky-400/25 bg-slate-900">
                    <img src="/brand/logo.jpg" alt="CO" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white">Portal do Cliente</div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-400/80">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Ambiente Criptografado
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Acompanhamento processual', desc: 'Acesso em tempo real aos andamentos e tribunais' },
                    { title: 'Smart Drive Privado', desc: 'Envio seguro de documentos, provas e assinaturas' },
                    { title: 'Comunicação Oficial', desc: 'Histórico de atividades, prazos e financeiro do caso' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group/item rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 transition-all hover:border-sky-400/25 hover:bg-sky-400/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-[7px] size-1.5 shrink-0 rounded-full bg-sky-400/60 transition-colors group-hover/item:bg-sky-300" />
                        <div>
                          <div className="text-sm font-medium text-slate-200">{item.title}</div>
                          <div className="mt-0.5 text-xs text-slate-400">{item.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/[0.08] pt-5">
                  <Link
                    to="/portal"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 transition-all hover:border-sky-400/50 hover:bg-sky-400/20"
                  >
                    Acessar Portal
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-slate-500">
            Explorar
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-sky-400/60"
          >
            <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* ÁREAS DE ATUAÇÃO                                                  */}
      {/* ================================================================= */}
      <motion.section
        id="areas"
        className="mx-auto max-w-7xl px-4 py-24 md:py-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <SectionTitle
          kicker="Especialidades"
          title="Atuação Jurídica Estratégica"
          desc="Assessoramos nossos clientes com clareza, transparência e alta capacidade técnica, visando sempre a melhor condução do cenário apresentado."
        />

        <motion.div variants={stagger} className="mt-14 grid gap-4 md:grid-cols-3">
          {areas.slice(0, 3).map((a) => (
            <motion.div key={a.title} variants={itemFade}>
              <AreaCard area={a} />
            </motion.div>
          ))}
          <motion.div variants={itemFade} className="md:col-span-2">
            <AreaCard area={areas[3]!} wide />
          </motion.div>
          <motion.div variants={itemFade}>
            <AreaCard area={areas[4]!} />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ================================================================= */}
      {/* O ESCRITÓRIO                                                      */}
      {/* ================================================================= */}
      <motion.section
        id="escritorio"
        className="border-y border-white/[0.06] bg-slate-950/40"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <div className="grid gap-14 md:grid-cols-2 md:items-center">
            <div>
              <motion.span
                variants={itemFade}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400"
              >
                O Escritório
              </motion.span>
              <motion.h2
                variants={itemFade}
                className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-100 md:text-5xl"
              >
                Princípios e<br />Compromisso Ético
              </motion.h2>
              <motion.p variants={itemFade} className="mt-5 text-base leading-relaxed text-slate-400">
                O Castro e Oliveira Advocacia foi fundado com o propósito de oferecer uma
                advocacia organizada, ágil e absolutamente transparente. Rejeitamos promessas
                irreais; focamos no estudo profundo de cada caso e na comunicação assertiva.
              </motion.p>

              <motion.div variants={stagger} className="mt-8 grid gap-3 sm:grid-cols-2">
                {principles.map((v) => {
                  const PIcon = v.icon;
                  return (
                    <motion.div
                      key={v.title}
                      variants={itemFade}
                      className="rounded-xl border border-white/[0.08] bg-slate-950/60 p-4 transition-all hover:border-sky-400/25"
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                        <PIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {v.title}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{v.desc}</div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <motion.div variants={itemFade} className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.10),transparent_65%)] blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/80 p-8 shadow-xl backdrop-blur-xl sm:p-10">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-400/80">
                  Diretriz Interna
                </div>
                <p className="mt-6 text-xl font-medium leading-relaxed text-slate-200 sm:text-2xl">
                  &ldquo;Atendimento voltado à orientação responsável, técnica apurada e absoluto
                  respeito aos limites legais e factuais do caso concreto.&rdquo;
                </p>
                <div className="mt-8 h-px bg-white/[0.08]" />
                <div className="mt-6">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Central de Atendimento
                  </div>
                  <a
                    href={`https://wa.me/${whatsappE164}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-slate-200 transition-colors hover:text-sky-300"
                  >
                    {whatsappDisplay}
                    <ArrowUpRight className="h-4 w-4 text-sky-400" strokeWidth={1.75} />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ================================================================= */}
      {/* EQUIPE                                                            */}
      {/* ================================================================= */}
      <motion.section
        id="equipe"
        className="mx-auto max-w-7xl px-4 py-24 md:py-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <SectionTitle
          kicker="Nossa Equipe"
          title="Profissionais Dedicados"
          desc="Uma estrutura coesa e organizada para garantir que a estratégia e o andamento do seu caso fluam com perfeição."
        />

        <motion.div variants={stagger} className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <motion.div key={m.name} variants={itemFade}>
              <TeamCard member={m} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ================================================================= */}
      {/* DEPOIMENTOS                                                       */}
      {/* ================================================================= */}
      <section id="avaliacoes" className="border-y border-white/[0.06] bg-slate-950/40 py-24 md:py-28">
        <motion.div
          className="mx-auto max-w-7xl px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
        >
          <SectionTitle
            kicker="Depoimentos"
            title="O que dizem sobre nós"
            desc="Opiniões de quem confiou em nosso trabalho. A satisfação de nossos clientes é o maior atestado da nossa competência."
          />
        </motion.div>

        <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex gap-4">
            <div className="flex shrink-0 animate-marquee gap-4">
              {testimonials.map((t, i) => (
                <TestimonialCard key={`a-${i}`} {...t} />
              ))}
            </div>
            <div className="flex shrink-0 animate-marquee gap-4" aria-hidden>
              {testimonials.map((t, i) => (
                <TestimonialCard key={`b-${i}`} {...t} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CONTATO                                                           */}
      {/* ================================================================= */}
      <motion.section
        id="contato"
        className="mx-auto max-w-7xl px-4 py-24 md:py-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <div className="grid gap-12 md:grid-cols-2 lg:gap-20">
          <div>
            <motion.span
              variants={itemFade}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400"
            >
              Agende uma Consulta
            </motion.span>
            <motion.h2
              variants={itemFade}
              className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-100 md:text-5xl"
            >
              Fale com nossa<br />equipe jurídica
            </motion.h2>
            <motion.p
              variants={itemFade}
              className="mt-5 max-w-md text-base leading-relaxed text-slate-400"
            >
              Envie uma mensagem descrevendo brevemente seu cenário. Retornaremos com agilidade
              para analisar a viabilidade do atendimento.
            </motion.p>

            <motion.div variants={stagger} className="mt-9 space-y-5">
              <motion.div variants={itemFade} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">WhatsApp Direto</div>
                  <a
                    href={`https://wa.me/${whatsappE164}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
                  >
                    {whatsappDisplay}
                  </a>
                </div>
              </motion.div>

              <motion.div variants={itemFade} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Endereço Presencial</div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm leading-relaxed text-sky-300 transition-colors hover:text-sky-200"
                  >
                    {address.line1}
                    <br />
                    {address.line2}
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div variants={itemFade} className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.10),transparent_65%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/80 p-8 shadow-xl backdrop-blur-xl sm:p-10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-slate-100">Acesso Restrito</div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Ambiente exclusivo para clientes e equipe técnica. Acompanhe processos, envie
                documentos e acesse prazos com total segurança e sigilo.
              </p>
              <Link to="/app" className={`${techPrimaryBtn} group mt-8 w-full py-3.5`}>
                Entrar no Sistema
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.75} />
              </Link>
              <div className="mt-5 text-center text-[11px] text-slate-500">
                Site com caráter exclusivamente informativo e institucional.
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
