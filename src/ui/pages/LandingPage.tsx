import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const itemFade = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE },
  },
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const areas = [
  {
    title: 'Cível',
    items: ['Contratos e obrigações', 'Responsabilidade civil', 'Cobranças e acordos'],
  },
  {
    title: 'Criminal',
    items: ['Orientação e acompanhamento', 'Defesa técnica especializada', 'Fases investigatórias e processuais'],
  },
  {
    title: 'Empresarial',
    items: ['Apoio a rotinas empresariais', 'Contratos e negociações', 'Prevenção e gestão de riscos'],
  },
  {
    title: 'Família',
    items: ['Divórcio e dissolução', 'Guarda e convivência', 'Pensão alimentícia'],
  },
  {
    title: 'Trabalhista',
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

const principles = [
  { title: 'Ética', desc: 'Respeito estrito às normas e limites da atuação.' },
  { title: 'Clareza', desc: 'Comunicação direta, sem juridiquês.' },
  { title: 'Estratégia', desc: 'Foco na melhor resolução possível.' },
  { title: 'Tecnologia', desc: 'Prazos e dados seguros em plataforma própria.' },
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
const goldBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-300 text-luxury font-body font-semibold text-[11px] uppercase tracking-[0.2em] px-8 py-4 shadow-[0_0_24px_rgba(201,169,110,0.18)] hover:shadow-[0_0_40px_rgba(201,169,110,0.38)] hover:brightness-110 transition-all duration-300';

const outlineBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-gold-400/50 text-gold-400 font-body font-semibold text-[11px] uppercase tracking-[0.2em] px-8 py-4 hover:bg-gold-400/10 hover:border-gold-400 transition-all duration-300';

const ghostBtn =
  'group inline-flex items-center justify-center gap-1.5 text-cream/40 font-body text-[11px] uppercase tracking-[0.2em] hover:text-cream/70 transition-colors duration-300';

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------
function GoldDivider() {
  return (
    <div className="mx-auto mt-5 h-px w-14 bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
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
        className="font-body text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-400"
      >
        {kicker}
      </motion.span>
      <motion.div variants={itemFade}>
        <GoldDivider />
      </motion.div>
      <motion.h2
        variants={itemFade}
        className="mt-9 font-display text-4xl font-light italic leading-[1.1] text-cream md:text-5xl"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={itemFade}
        className="mt-5 font-body text-base font-light leading-relaxed text-cream/40"
      >
        {desc}
      </motion.p>
    </motion.div>
  );
}

function AreaCard({ area, wide = false }: { area: (typeof areas)[number]; wide?: boolean }) {
  void wide;
  return (
    <div className="group relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#131110] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/25 hover:shadow-[0_24px_48px_-12px_rgba(201,169,110,0.08)]">
      {/* Hover top-line accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <h3 className="font-display text-xl font-light italic text-cream">{area.title}</h3>
      <ul className="mt-5 space-y-2.5">
        {area.items.map((it) => (
          <li key={it} className="flex items-start gap-3">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-gold-400/50 transition-colors group-hover:bg-gold-400/80" />
            <span className="font-body text-sm font-light leading-relaxed text-cream/45">{it}</span>
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
    <div className="group rounded-3xl border border-white/5 bg-[#131110] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/25 hover:shadow-[0_16px_32px_-8px_rgba(201,169,110,0.08)]">
      <div className="mb-5 flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full border border-gold-400/20 bg-gold-400/8 font-display text-lg text-gold-400 transition-all group-hover:border-gold-400/40 group-hover:bg-gold-400/12">
          {initials}
        </div>
        <div>
          <div className="font-display text-base text-cream">{member.name}</div>
          <div className="mt-0.5 font-body text-xs font-medium uppercase tracking-[0.15em] text-gold-400/80">
            {member.role}
          </div>
          {member.oab && (
            <div className="mt-0.5 font-body text-[11px] text-cream/30">{member.oab}</div>
          )}
        </div>
      </div>
      <p className="font-body text-sm font-light leading-relaxed text-cream/40">{member.bio}</p>
    </div>
  );
}

function TestimonialCard({ name, initials, text, rating }: (typeof testimonials)[number]) {
  return (
    <div className="w-[340px] shrink-0 rounded-3xl border border-white/6 bg-[#131110] p-6 transition-all hover:-translate-y-0.5 hover:border-gold-400/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-full border border-gold-400/20 bg-gold-400/8 font-display text-sm font-semibold text-gold-400">
          {initials}
        </div>
        <div>
          <div className="font-body text-sm font-semibold text-cream">{name}</div>
          <div className="mt-0.5 flex gap-0.5 text-gold-400/80 text-xs">
            {'★'.repeat(rating)}
          </div>
        </div>
      </div>
      <p className="font-body text-sm font-light italic leading-relaxed text-cream/50">
        "{text}"
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function LandingPage() {
  return (
    <div className="overflow-x-hidden bg-luxury text-cream">
      {/* ================================================================= */}
      {/* HERO                                                                */}
      {/* ================================================================= */}
      <section className="relative flex min-h-screen flex-col justify-center px-4 pb-16 pt-8">
        {/* Background atmosphere */}
        <div className="pointer-events-none absolute inset-0 grain-overlay" />
        <div className="pointer-events-none absolute right-0 top-0 h-[800px] w-[800px] bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,110,0.07),transparent_62%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(201,169,110,0.04),transparent_65%)]" />

        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_400px] lg:items-center xl:grid-cols-[1fr_460px]">
            {/* ---- Left: Headline + CTA ---- */}
            <div>
              <h1 className="font-display text-[clamp(3.5rem,8vw,6.5rem)] font-light leading-[1.02] tracking-tight text-cream">
                {(['Castro e', 'Oliveira'] as const).map((line, i) => (
                  <motion.span
                    key={line}
                    className="block"
                    initial={{ opacity: 0, y: 36 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + i * 0.13, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {line}
                  </motion.span>
                ))}
                <motion.span
                  className="block italic text-gold-400"
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                >
                  Advocacia Estratégica
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 max-w-[480px] font-body text-lg font-light leading-relaxed text-cream/40"
              >
                Atenção meticulosa aos detalhes. Assessoria jurídica de alta complexidade com
                foco absoluto em resultados e exclusividade.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
              >
                <a
                  href={`https://wa.me/${whatsappE164}`}
                  target="_blank"
                  rel="noreferrer"
                  className={goldBtn}
                >
                  Fale com a Equipe
                </a>
                <Link to="/app/portal" className={outlineBtn}>
                  Acessar Portal
                </Link>
                <Link to="/app" className={ghostBtn}>
                  Acesso Restrito
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </motion.div>

              {/* Trust metrics */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.7 }}
                className="mt-16 grid grid-cols-3 gap-8 border-t border-white/5 pt-12"
              >
                {[
                  { value: '100%', label: 'Sigilo Absoluto' },
                  { value: '24/7', label: 'Portal Exclusivo' },
                  { value: 'Ágil', label: 'Gestão de Prazos' },
                ].map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="font-display text-3xl font-light text-gold-400 md:text-4xl">
                      {m.value}
                    </div>
                    <div className="mt-2 font-body text-[10px] uppercase tracking-[0.22em] text-cream/30">
                      {m.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ---- Right: Portal preview card ---- */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full"
            >
              {/* Glow behind card */}
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(201,169,110,0.10),transparent_65%)] blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl border border-gold-400/18 bg-[#0F0D0B] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                {/* Card header */}
                <div className="mb-8 flex items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-gold-400/25 bg-gold-400/8 font-display text-xl text-gold-400">
                    CO
                  </div>
                  <div>
                    <div className="font-display text-base text-cream">Portal do Cliente</div>
                    <div className="mt-0.5 font-body text-[10px] uppercase tracking-[0.22em] text-gold-400/60">
                      Ambiente Seguro
                    </div>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-3">
                  {[
                    { title: 'Acompanhamento processual', desc: 'Acesso em tempo real aos andamentos' },
                    { title: 'Smart Drive Privado', desc: 'Envio seguro de documentos e provas' },
                    { title: 'Comunicação Oficial', desc: 'Histórico de atividades e prazos do caso' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group/item rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition-all hover:border-gold-400/22 hover:bg-gold-400/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-[6px] size-1.5 shrink-0 rounded-full bg-gold-400/40 transition-colors group-hover/item:bg-gold-400/70" />
                        <div>
                          <div className="font-body text-sm font-medium text-cream/80">
                            {item.title}
                          </div>
                          <div className="mt-0.5 font-body text-xs font-light text-cream/35">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card CTA */}
                <div className="mt-6 border-t border-white/5 pt-6">
                  <Link
                    to="/app/portal"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-gold-400/22 bg-gold-400/8 py-3 font-body text-[10px] uppercase tracking-[0.2em] text-gold-400 transition-all hover:bg-gold-400/16 hover:border-gold-400/40"
                  >
                    Acessar Portal →
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
          transition={{ delay: 1.3, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <span className="font-body text-[9px] uppercase tracking-[0.35em] text-cream/25">
            Explorar
          </span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-sm text-gold-400/30"
          >
            ↓
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* ÁREAS DE ATUAÇÃO                                                   */}
      {/* ================================================================= */}
      <motion.section
        id="areas"
        className="mx-auto max-w-7xl px-4 py-24 md:py-36"
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

        <motion.div variants={stagger} className="mt-16 grid gap-4 md:grid-cols-3">
          {/* Row 1 */}
          {areas.slice(0, 3).map((a) => (
            <motion.div key={a.title} variants={itemFade}>
              <AreaCard area={a} />
            </motion.div>
          ))}
          {/* Row 2: Família (2 cols) + Trabalhista (1 col) */}
          <motion.div variants={itemFade} className="md:col-span-2">
            <AreaCard area={areas[3]!} wide />
          </motion.div>
          <motion.div variants={itemFade}>
            <AreaCard area={areas[4]!} />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ================================================================= */}
      {/* O ESCRITÓRIO                                                        */}
      {/* ================================================================= */}
      <motion.section
        id="escritorio"
        className="border-y border-white/5"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-36">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            {/* Left */}
            <div>
              <motion.span
                variants={itemFade}
                className="font-body text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-400"
              >
                O Escritório
              </motion.span>
              <motion.h2
                variants={itemFade}
                className="mt-5 font-display text-4xl font-light italic leading-[1.1] text-cream md:text-5xl"
              >
                Princípios e<br />Compromisso Ético
              </motion.h2>
              <motion.p variants={itemFade} className="mt-6 font-body text-base font-light leading-relaxed text-cream/40">
                O Castro e Oliveira Advocacia foi fundado com o propósito de oferecer uma
                advocacia organizada, ágil e absolutamente transparente. Rejeitamos promessas
                irreais; focamos no estudo profundo de cada caso e na comunicação assertiva.
              </motion.p>

              <motion.div
                variants={stagger}
                className="mt-10 grid gap-3 sm:grid-cols-2"
              >
                {principles.map((v) => (
                  <motion.div
                    key={v.title}
                    variants={itemFade}
                    className="rounded-2xl border border-white/5 bg-[#131110] p-5 transition-all hover:border-gold-400/20"
                  >
                    <div className="font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-400">
                      {v.title}
                    </div>
                    <div className="mt-2 font-body text-sm font-light text-cream/40">{v.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right: quote card */}
            <motion.div variants={itemFade} className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(201,169,110,0.08),transparent_65%)] blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-gold-400/15 bg-[#0F0D0B] p-10 shadow-xl">
                <div className="font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-400/70">
                  Diretriz Interna
                </div>
                <p className="mt-7 font-display text-2xl font-light italic leading-snug text-cream/80">
                  "Atendimento voltado à orientação responsável, técnica apurada e absoluto
                  respeito aos limites legais e factuais do caso concreto."
                </p>
                <div className="mt-10 h-px bg-white/5" />
                <div className="mt-6">
                  <div className="font-body text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/30">
                    Central de Atendimento
                  </div>
                  <a
                    href={`https://wa.me/${whatsappE164}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 font-body text-lg text-cream/70 transition-colors hover:text-gold-400"
                  >
                    {whatsappDisplay}{' '}
                    <span className="text-sm text-gold-400">↗</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ================================================================= */}
      {/* EQUIPE                                                              */}
      {/* ================================================================= */}
      <motion.section
        id="equipe"
        className="mx-auto max-w-7xl px-4 py-24 md:py-36"
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

        <motion.div
          variants={stagger}
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {team.map((m) => (
            <motion.div key={m.name} variants={itemFade}>
              <TeamCard member={m} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ================================================================= */}
      {/* DEPOIMENTOS                                                         */}
      {/* ================================================================= */}
      <section id="avaliacoes" className="border-y border-white/5 py-24 md:py-32">
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

        {/* Infinite marquee — two duplicate divs for seamless loop */}
        <div className="relative mt-16 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
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
      {/* CONTATO                                                             */}
      {/* ================================================================= */}
      <motion.section
        id="contato"
        className="mx-auto max-w-7xl px-4 py-24 md:py-36"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
      >
        <div className="grid gap-12 md:grid-cols-2 lg:gap-24">
          {/* Left: contact info */}
          <div>
            <motion.span
              variants={itemFade}
              className="font-body text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-400"
            >
              Agende uma Consulta
            </motion.span>
            <motion.h2
              variants={itemFade}
              className="mt-5 font-display text-4xl font-light italic leading-[1.1] text-cream md:text-5xl"
            >
              Fale com nossa<br />equipe jurídica
            </motion.h2>
            <motion.p
              variants={itemFade}
              className="mt-6 max-w-md font-body text-base font-light leading-relaxed text-cream/40"
            >
              Envie uma mensagem descrevendo brevemente seu cenário. Retornaremos com agilidade
              para analisar a viabilidade do atendimento.
            </motion.p>

            <motion.div variants={stagger} className="mt-10 space-y-6">
              <motion.div variants={itemFade} className="flex items-start gap-4">
                <div className="mt-1 font-body text-gold-400">✦</div>
                <div>
                  <div className="font-body text-sm font-semibold text-cream/80">
                    WhatsApp Direto
                  </div>
                  <a
                    href={`https://wa.me/${whatsappE164}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block font-body text-gold-400 transition-colors hover:text-gold-300"
                  >
                    {whatsappDisplay}
                  </a>
                </div>
              </motion.div>

              <motion.div variants={itemFade} className="flex items-start gap-4">
                <div className="mt-1 font-body text-gold-400">✦</div>
                <div>
                  <div className="font-body text-sm font-semibold text-cream/80">
                    Endereço Presencial
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block font-body text-sm leading-relaxed text-gold-400 transition-colors hover:text-gold-300"
                  >
                    {address.line1}
                    <br />
                    {address.line2}
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: restricted access card */}
          <motion.div variants={itemFade} className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(201,169,110,0.08),transparent_65%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-gold-400/15 bg-[#0F0D0B] p-8 shadow-xl sm:p-10">
              <div className="font-display text-2xl font-light italic text-cream/80">
                Acesso Restrito
              </div>
              <p className="mt-4 font-body text-sm font-light leading-relaxed text-cream/35">
                Ambiente exclusivo para clientes e equipe técnica. Acompanhe processos, envie
                documentos e acesse prazos com total segurança e sigilo.
              </p>
              <Link
                to="/app"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-300 px-10 py-4 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-luxury shadow-[0_0_32px_rgba(201,169,110,0.2)] transition-all hover:brightness-110 hover:shadow-[0_0_48px_rgba(201,169,110,0.35)] group"
              >
                Entrar no Portal
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <div className="mt-5 text-center font-body text-[11px] text-cream/20">
                Site com caráter exclusivamente informativo e institucional.
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
