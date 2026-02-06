import { Link } from 'react-router-dom';

import { ShimmerButton } from '@/ui/primitives/ShimmerButton';

function SectionTitle({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-semibold tracking-[0.22em] text-gold">{kicker}</div>
      <div className="mx-auto mt-3 h-px w-16 bg-[linear-gradient(to_right,transparent,rgba(212,175,55,0.65),transparent)]" />
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">{title}</h2>
      <p className="mt-3 text-sm text-neutral-700 md:text-base">{desc}</p>
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
const cityDisplay = 'Parauapebas — Pará';

export function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 md:pb-20 md:pt-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-neutral-700">
              <span className="size-1.5 rounded-full bg-gold" />
              {cityDisplay}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="hidden size-16 overflow-hidden rounded-2xl border border-black/10 bg-white sm:block">
                <img
                  src="/brand/logo.jpg"
                  alt="Castro de Oliveira Advocacia"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Castro de Oliveira Advocacia
              </h1>
            </div>
            <p className="mt-4 text-base text-neutral-700">
              Orientação jurídica com clareza, responsabilidade e estratégia. Atendimento e acompanhamento em áreas essenciais do direito.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={`https://wa.me/${whatsappE164}`} target="_blank" rel="noreferrer">
                <ShimmerButton className="w-full sm:w-auto">Falar no WhatsApp</ShimmerButton>
              </a>
              <Link
                to="/app"
                className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-black/5 sm:w-auto"
              >
                Área do Advogado (CRM)
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-neutral-700 sm:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <div className="text-neutral-950">Atuação</div>
                <div>multidisciplinar</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <div className="text-neutral-950">Atendimento</div>
                <div>objetivo e humano</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <div className="text-neutral-950">Transparência</div>
                <div>orientação clara</div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute -inset-10 rounded-[32px] bg-[radial-gradient(circle_at_30%_10%,rgba(212,175,55,0.38),transparent_58%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-white">
              <div className="border-b border-black/10 bg-white px-5 py-4">
                <div className="text-xs font-semibold tracking-[0.22em] text-gold">ÁREAS</div>
                <div className="mt-1 text-sm font-semibold text-neutral-950">Atendimento em áreas essenciais</div>
              </div>
              <div className="p-5">
                <div className="grid gap-3">
                  {areas.map((a) => (
                    <div
                      key={a.title}
                      className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 py-4"
                    >
                      <span className="text-sm font-semibold text-neutral-950">{a.title}</span>
                      <span className="text-xs font-semibold text-gold">Saiba mais</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                  <div className="text-xs font-semibold tracking-[0.22em] text-gold">ENDEREÇO</div>
                  <div className="mt-2 text-sm text-neutral-700">{address.line1}</div>
                  <div className="text-sm text-neutral-700">{address.line2}</div>
                  <a
                    className="mt-3 inline-flex text-xs font-semibold text-neutral-950 underline decoration-[rgba(212,175,55,0.7)] underline-offset-4 hover:decoration-[rgba(212,175,55,1)]"
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir no Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÁREAS */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20" id="areas">
        <SectionTitle
          kicker="ÁREAS DE ATUAÇÃO"
          title="Atendimento em áreas essenciais"
          desc="Atuamos com foco em orientação, prevenção e condução processual conforme a necessidade de cada caso."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {areas.map((a) => (
            <div key={a.title} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-950">{a.title}</div>
                <div className="text-xs font-semibold text-gold">Atuação</div>
              </div>
              <div className="mt-3 text-sm text-neutral-700">
                <ul className="grid gap-2">
                  {a.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 h-px bg-black/10" />
              <div className="mt-4 text-xs text-neutral-600">
                Atendimento mediante análise do caso concreto.
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ESCRITÓRIO */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20" id="escritorio">
        <div className="rounded-3xl border border-black/10 bg-white p-8 md:p-10">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs font-semibold tracking-[0.22em] text-gold">O ESCRITÓRIO</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                Princípios, forma de atuação e compromisso com a ética
              </div>
              <p className="mt-3 text-sm text-neutral-700 md:text-base">
                O Castro de Oliveira Advocacia atua com foco em orientação clara, organização e condução responsável de demandas jurídicas.
                Este site possui caráter informativo e institucional.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'Ética', desc: 'Atuação pautada por responsabilidade e discrição.' },
                  { title: 'Clareza', desc: 'Comunicação objetiva para decisões bem informadas.' },
                  { title: 'Estratégia', desc: 'Análise do caso e condução com método.' },
                  { title: 'Organização', desc: 'Controle de informações e prazos com rotina.' },
                ].map((v) => (
                  <div key={v.title} className="rounded-2xl border border-black/10 bg-[#fbfaf7] p-4">
                    <div className="text-sm font-semibold text-neutral-950">{v.title}</div>
                    <div className="mt-1 text-sm text-neutral-700">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[28px] bg-[radial-gradient(circle_at_60%_10%,rgba(212,175,55,0.28),transparent_60%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#0b0b0b] p-7 text-white">
                <div className="text-xs font-semibold tracking-[0.22em] text-[rgba(212,175,55,0.9)]">DIRETRIZ</div>
                <div className="mt-3 text-lg font-semibold">Comunicação sóbria, sem promessas de resultado</div>
                <div className="mt-3 text-sm text-white/80">
                  Atendimento direcionado ao caso concreto, com orientação responsável e respeito às normas aplicáveis.
                </div>
                <div className="mt-6 h-px bg-white/10" />
                <div className="mt-6 text-sm text-white/80">
                  <div className="font-semibold text-white">Contato</div>
                  <div className="mt-2">WhatsApp: {whatsappDisplay}</div>
                  <div className="mt-2">{cityDisplay}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EQUIPE */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20" id="equipe">
        <SectionTitle
          kicker="EQUIPE"
          title="Pessoas por trás do trabalho"
          desc="Estrutura enxuta e organizada para atendimento e gestão interna."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {team.map((m) => {
            const initials = m.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0]!.toUpperCase())
              .join('');

            return (
              <div key={m.name} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full border border-black/10 bg-[#fbfaf7] text-sm font-semibold text-neutral-950">
                    <span className="text-gold">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-950">{m.name}</div>
                    <div className="mt-0.5 text-sm text-neutral-700">{m.role}</div>
                    {m.oab ? <div className="mt-0.5 text-xs text-neutral-600">{m.oab}</div> : null}
                  </div>
                </div>

                <div className="mt-4 h-px bg-black/10" />
                <div className="mt-4 text-xs leading-relaxed text-neutral-700">{m.bio}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONTATO */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20" id="contato">
        <SectionTitle
          kicker="CONTATO"
          title="Fale com a equipe"
          desc="Para atendimento, envie uma mensagem no WhatsApp. Retornamos conforme disponibilidade."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-black/10 bg-white p-7 md:p-9">
            <div className="text-xs font-semibold tracking-[0.22em] text-gold">WHATSAPP</div>
            <div className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 md:text-2xl">
              Atendimento via WhatsApp
            </div>
            <p className="mt-3 text-sm text-neutral-700">
              Envie uma mensagem e informe brevemente o assunto. Se preferir, inclua seu nome e um resumo do caso.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={`https://wa.me/${whatsappE164}`} target="_blank" rel="noreferrer">
                <ShimmerButton className="w-full sm:w-auto">Abrir WhatsApp</ShimmerButton>
              </a>
              <Link
                to="/app"
                className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-black/5 sm:w-auto"
              >
                Área do Advogado
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-[#fbfaf7] p-4 text-sm text-neutral-700">
              <div>
                <span className="font-semibold text-neutral-950">Número:</span> {whatsappDisplay}
              </div>
              <div className="mt-2 text-xs text-neutral-600">Ao clicar, você será direcionado para o WhatsApp.</div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-7 md:p-9">
            <div className="text-xs font-semibold tracking-[0.22em] text-gold">ENDEREÇO</div>
            <div className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 md:text-2xl">
              Atendimento presencial
            </div>
            <p className="mt-3 text-sm text-neutral-700">
              Endereço para referência e localização. Consulte a equipe para confirmar disponibilidade.
            </p>

            <div className="mt-6 rounded-2xl border border-black/10 bg-[#fbfaf7] p-4 text-sm text-neutral-700">
              <div className="font-semibold text-neutral-950">{address.line1}</div>
              <div className="mt-1">{address.line2}</div>
              <a
                className="mt-3 inline-flex text-xs font-semibold text-neutral-950 underline decoration-[rgba(212,175,55,0.7)] underline-offset-4 hover:decoration-[rgba(212,175,55,1)]"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir no Google Maps
              </a>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
              <div className="text-xs font-semibold tracking-[0.22em] text-gold">LOCALIZAÇÃO</div>
              <div className="mt-2 text-sm text-neutral-700">{cityDisplay}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-12">
        <div className="text-xs text-neutral-600">
          Aviso: este site possui caráter exclusivamente informativo e institucional.
        </div>
      </div>
    </div>
  );
}
