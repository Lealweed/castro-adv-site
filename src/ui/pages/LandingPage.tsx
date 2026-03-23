import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ShimmerButton } from '@/ui/primitives/ShimmerButton';

function SectionTitle({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-light uppercase tracking-[0.25em] text-amber-200/80">{kicker}</div>
      <div className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-70" />
      <h2 className="mt-8 text-4xl md:text-6xl font-serif font-light tracking-wide text-white drop-shadow-[0_2px_12px_rgba(233,207,167,0.10)]">{title}</h2>
      <p className="mt-6 text-lg leading-relaxed text-slate-300/90 font-light">{desc}</p>
    </div>
  );
}

const areas = [
  {
    title: 'Cível',
    items: ['Contratos', 'Responsabilidade civil', 'Cobranças e acordos'],
  },
  {
    title: 'Criminal',
    items: ['Orientação e acompanhamento', 'Defesa técnica', 'Atuação em fases investigatórias e processuais'],
  },
  {
    title: 'Empresarial',
    items: ['Apoio a rotinas empresariais', 'Contratos e negociações', 'Prevenção de riscos'],
  },
  {
    title: 'Família',
    items: ['Divórcio e dissolução', 'Guarda e convivência', 'Pensão e alimentos'],
  },
  {
    title: 'Trabalhista',
    items: ['Orientação em relações de trabalho', 'Acordos e tratativas', 'Acompanhamento de demandas'],
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
    bio: 'Atendimento humanizado e condução estratégica de casos, com comunicação clara e organização de informações do cliente.',
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
    bio: 'Suporte ao time jurídico, organização de demandas e acompanhamento de atividades para manter o atendimento ágil e preciso.',
  },
];

const address = {
  line1: 'Avenida Tupinambá, 19 — Galeria Parque 610, Sala 01',
  line2: 'Bairro Parque dos Carajás, Parauapebas — Pará, CEP 68515-000',
};

const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(
    'Avenida Tupinambá, 19 Galeria parque 610 Sala 01 Bairro Parque dos Carajás, Parauapebas - Pará 68515-000'
  );

const whatsappE164 = '5591983485747';
const whatsappDisplay = '(91) 98348-5747';

const testimonials = [
  { name: 'Ricardo P.', initials: 'RP', text: 'Profissionalismo impecável. Conduziram meu caso com total transparência e resolveram em tempo recorde. Recomendo de olhos fechados.', rating: 5 },
  { name: 'Juliana S.', initials: 'JS', text: 'Escritório extremamente organizado. O portal exclusivo para clientes me deu muita paz de espírito, conseguia acompanhar tudo pelo celular.', rating: 5 },
  { name: 'Empresa A. C.', initials: 'EA', text: 'A assessoria empresarial deles mudou a forma como fechamos contratos. Assertivos, diretos e sem juridiquês.', rating: 5 },
  { name: 'Marcos V.', initials: 'MV', text: 'Tive um problema trabalhista complexo e fui muito bem orientado. Eles focam na melhor estratégia sem falsas promessas.', rating: 5 },
  { name: 'Fernanda L.', initials: 'FL', text: 'Excelente atendimento desde a recepção até a advogada especialista. Muito respeito e ética profissional no trato com o cliente.', rating: 5 },
  { name: 'Carlos A.', initials: 'CA', text: 'Equipe sempre disponível e ágil. Ter os andamentos do tribunal atualizados na plataforma deles faz toda a diferença.', rating: 5 },
];

export function LandingPage() {
  return (
    <div className="bg-slate-950">
      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pb-28 pt-32 md:pb-44 md:pt-52">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#E9CFA7_0%,transparent_80%)]" />
        <div className="grid gap-32 md:grid-cols-2 md:items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-base font-light text-amber-200/80 shadow backdrop-blur-md tracking-widest">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-200/80 opacity-30"></span>
                <span className="relative inline-flex size-2 rounded-full bg-amber-200/80"></span>
              </span>
              Boutique Jurídica de Alto Padrão
            </div>

            <h1 className="mt-12 text-6xl md:text-8xl font-serif font-light leading-[1.08] tracking-wide text-white drop-shadow-[0_2px_16px_rgba(233,207,167,0.10)]">
              Castro e Oliveira <span className="hidden md:inline">|</span>
              <span className="block md:inline font-serif font-light text-amber-200/80 tracking-wide"> Advocacia Estratégica</span>
            </h1>

            <p className="mt-10 max-w-2xl text-2xl md:text-3xl font-sans font-light leading-snug text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
              Atenção meticulosa aos detalhes. Assessoria jurídica de alta complexidade com foco absoluto em resultados e exclusividade.
            </p>

            <div className="mt-16 flex flex-col gap-5 sm:flex-row items-center">
              <a href={`https://wa.me/${whatsappE164}`} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <ShimmerButton className="w-full sm:w-auto !px-12 !py-5 !text-lg font-light bg-gradient-to-r from-amber-200/80 via-white/60 to-white/10 text-slate-950 border-white/10 shadow-xl shadow-amber-200/10 hover:scale-105 hover:from-white hover:to-amber-200/80 transition-all duration-300">
                  Fale com a Equipe
                </ShimmerButton>
              </a>
              <Link
                to="/portal"
                className="group w-full sm:w-auto"
              >
                <ShimmerButton className="w-full sm:w-auto !px-12 !py-5 !text-lg font-light bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white border-white/10 hover:from-amber-200/80 hover:to-white/80 hover:text-slate-950 transition-all duration-300 shadow-xl shadow-amber-200/10">
                  Acessar Portal
                </ShimmerButton>
              </Link>
              <Link
                to="/app"
                className="group w-full sm:w-auto"
              >
                <ShimmerButton className="w-full sm:w-auto !px-12 !py-5 !text-lg font-light bg-white text-slate-950 border-white/10 hover:bg-amber-200/80 hover:text-white transition-all duration-300 shadow-md">
                  Acesso Restrito
                </ShimmerButton>
              </Link>
            </div>

            <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-12 border-t border-white/5 pt-12">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-light text-amber-200/80 font-serif drop-shadow-[0_2px_8px_rgba(233,207,167,0.18)]">100%</div>
                <div className="mt-3 text-base text-slate-200/80 uppercase tracking-widest font-light">Sigilo Absoluto</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-light text-amber-200/80 font-serif drop-shadow-[0_2px_8px_rgba(233,207,167,0.18)]">24/7</div>
                <div className="mt-3 text-base text-slate-200/80 uppercase tracking-widest font-light">Portal Exclusivo</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-light text-amber-200/80 font-serif drop-shadow-[0_2px_8px_rgba(233,207,167,0.18)]">Ágil</div>
                <div className="mt-3 text-base text-slate-200/80 uppercase tracking-widest font-light">Gestão de Prazos</div>
              </div>
            </div>
          </div>

          <div className="relative lg:ml-auto w-full max-w-lg">
            <div className="absolute -inset-10 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15),transparent_60%)] blur-3xl" />

            <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/80 p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl">
              <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 text-3xl font-serif text-gold shadow-inner border border-gold/10">
                  CO
                </div>
                <div className="text-center">
                  <div className="text-lg font-serif text-white">Portal do Cliente</div>
                  <div className="text-xs tracking-widest uppercase text-amber-300 mt-1">Ambiente Seguro</div>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  { title: 'Acompanhamento processual', desc: 'Acesso em tempo real aos andamentos' },
                  { title: 'Smart Drive Privado', desc: 'Envio seguro de documentos e provas' },
                  { title: 'Comunicação Oficial', desc: 'Histórico de atividades e prazos do caso' },
                ].map((item, i) => (
                  <div key={i} className="group rounded-2xl border border-neutral-100 bg-white/60 p-4 transition-all hover:border-gold/30 hover:bg-white hover:shadow-md hover:shadow-gold/5">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-gold/50 group-hover:bg-gold transition-colors" />
                      <div>
                        <div className="text-sm font-medium text-amber-400">{item.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÁREAS */}
      <motion.section
        className="mx-auto max-w-7xl px-4 py-20 md:py-32 bg-slate-950"
        id="areas"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <SectionTitle
          kicker="ESPECIALIDADES"
          title="Atuação Jurídica Estratégica"
          desc="Assessoramos nossos clientes com clareza, transparência e alta capacidade técnica, visando sempre a melhor condução do cenário apresentado."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <div key={a.title} className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-8 transition-all hover:border-[#D4AF37]/40 hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.08)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-xl font-serif text-white">{a.title}</div>
              <div className="mt-6 space-y-3">
                {a.items.map((it) => (
                  <div key={it} className="flex items-start gap-3">
                    <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-[#D4AF37]/80" />
                    <span className="text-sm text-slate-300 leading-relaxed">{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ESCRITÓRIO */}
      <motion.section
        className="bg-slate-950 border-y border-slate-800"
        id="escritorio"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] uppercase text-gold">O Escritório</div>
              <h2 className="mt-4 text-3xl font-light tracking-tight text-neutral-900 md:text-5xl font-serif">
                Princípios e<br/>Compromisso Ético
              </h2>
              <p className="mt-6 text-base text-neutral-600 leading-relaxed">
                O Castro e Oliveira Advocacia foi fundado com o propósito de oferecer uma advocacia organizada, ágil e absolutamente transparente. 
                Rejeitamos promessas irreais de resultado; focamos no estudo profundo de cada caso e na comunicação assertiva.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  { title: 'Ética', desc: 'Respeito estrito às normas.' },
                  { title: 'Clareza', desc: 'Comunicação sem juridiquês.' },
                  { title: 'Estratégia', desc: 'Foco na melhor resolução.' },
                  { title: 'Tecnologia', desc: 'Prazos e dados seguros.' },
                ].map((v) => (
                  <div key={v.title} className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-amber-400 uppercase tracking-wide">{v.title}</div>
                    <div className="mt-2 text-sm text-slate-400">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:ml-auto w-full max-w-md">
              <div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15),transparent_60%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-neutral-800 bg-neutral-950 p-10 text-white shadow-2xl">
                <div className="text-xs font-bold tracking-[0.3em] text-amber-300 uppercase">Diretriz Interna</div>
                <div className="mt-6 text-2xl font-serif font-light leading-snug">
                  "Atendimento voltado à orientação responsável, técnica apurada e absoluto respeito aos limites legais e factuais do caso concreto."
                </div>
                
                <div className="mt-10 h-px bg-white/10" />
                <div className="mt-6">
                  <div className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-2">Central de Atendimento</div>
                  <a href={`https://wa.me/${whatsappE164}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-lg text-white hover:text-amber-400 transition-colors">
                    {whatsappDisplay} <span className="text-amber-400">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* EQUIPE */}
      <motion.section
        className="mx-auto max-w-7xl px-4 py-20 md:py-32 bg-slate-950"
        id="equipe"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <SectionTitle
          kicker="Nossa Equipe"
          title="Profissionais Dedicados"
          desc="Uma estrutura coesa e organizada para garantir que a estratégia e o andamento do seu caso fluam com perfeição."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => {
            const initials = m.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0]!.toUpperCase())
              .join('');
            return (
              <div key={m.name} className="group rounded-3xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/10">
                <div className="flex items-center gap-4 mb-5">
                  <div className="grid size-14 shrink-0 place-items-center rounded-full bg-slate-950 border border-slate-800 text-lg font-serif text-[#D4AF37] group-hover:scale-105 transition-transform">
                    {initials}
                  </div>
                  <div>
                    <div className="text-lg font-serif text-white">{m.name}</div>
                    <div className="text-sm font-medium text-[#D4AF37]">{m.role}</div>
                    {m.oab && <div className="text-xs text-slate-400 mt-0.5">{m.oab}</div>}
                  </div>
                </div>
                <div className="text-sm leading-relaxed text-slate-300">{m.bio}</div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:pb-32 bg-slate-950" id="avaliacoes">
        <SectionTitle
          kicker="DEPOIMENTOS"
          title="O que dizem sobre nós"
          desc="Opiniões de quem confiou em nosso trabalho. A satisfação de nossos clientes é o maior atestado da nossa competência."
        />

        <div className="mt-16 w-full flex-col items-center justify-center overflow-hidden flex">
          <div className="group flex overflow-hidden p-2 [--gap:1.5rem] [gap:var(--gap)] flex-row [--duration:60s] w-full max-w-7xl relative">
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused] w-full">
              {[...Array(3)].map((_, setIndex) =>
                testimonials.map((t, i) => (
                  <div key={`${setIndex}-${i}`} className="w-[350px] shrink-0 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_20px_40px_-15px_rgba(212,175,55,0.05)] transition-transform hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-amber-300/20 to-amber-100/5 text-amber-400 font-serif font-bold border border-amber-300/20">
                        {t.initials}
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{t.name}</div>
                        <div className="text-base text-amber-400 flex gap-0.5 mt-0.5">
                          {[...Array(t.rating)].map((_, r) => (
                            <span key={r}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-lg text-slate-200 leading-relaxed italic font-light">"{t.text}"</p>
                  </div>
                )),
              )}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white to-transparent" />
          </div>
          
          <div className="mt-8 text-center">
            <a href="https://g.page/r/YOUR_GOOGLE_MAPS_LINK_HERE/review" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path><polygon points="9 9 9 14 14 9 9 9"></polygon></svg>
              Avaliar no Google
            </a>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <motion.section
        className="bg-slate-950 text-white"
        id="contato"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 lg:gap-24">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] uppercase text-amber-300">Agende uma Consulta</div>
              <h2 className="mt-4 text-4xl font-light tracking-tight md:text-5xl font-serif text-white">Fale com nossa<br/>equipe jurídica</h2>
              <p className="mt-6 text-lg text-slate-300 font-light max-w-md">
                Envie uma mensagem descrevendo brevemente seu cenário. Retornaremos com agilidade para analisar a viabilidade do atendimento.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-amber-400">✦</div>
                  <div>
                    <div className="font-semibold text-white">WhatsApp Direto</div>
                    <a href={`https://wa.me/${whatsappE164}`} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-200 transition-colors block mt-1">
                      {whatsappDisplay}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-amber-400">✦</div>
                  <div>
                    <div className="font-semibold text-white">Endereço Presencial</div>
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-200 transition-colors block mt-1 leading-relaxed">
                      {address.line1}<br/>{address.line2}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_70%)]" />
              <div className="relative rounded-[32px] border border-slate-800 bg-slate-900 p-8 backdrop-blur-sm sm:p-10">
                <div className="text-2xl font-serif font-light mb-8 text-white">Acesso Restrito</div>
                
                <p className="text-slate-300 mb-8 text-sm leading-relaxed">
                  Ambiente exclusivo para clientes e equipe técnica. Acompanhe processos, envie documentos e acesse prazos com total segurança e sigilo através da nossa plataforma.
                </p>

                <Link
                  to="/app"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-white px-10 py-4 text-lg font-bold text-slate-950 shadow-2xl shadow-amber-400/30 transition-all hover:bg-amber-200 hover:text-slate-950 group"
                >
                  Entrar no Portal
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
                
                <div className="mt-6 text-center text-xs text-slate-400">
                  Site com caráter exclusivamente informativo e institucional.
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
