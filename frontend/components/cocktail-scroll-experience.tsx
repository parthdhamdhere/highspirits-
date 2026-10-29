'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from 'next/link';
import type {ClubEvent} from '@highspirits/contracts';
import type {PublicConfig} from '../lib/api';

export function CocktailScrollExperience({next,navigation}: {next?: ClubEvent; config: PublicConfig; navigation?: ReactNode}) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [revealed, setRevealed] = useState(true);
  const [staticMode, setStaticMode] = useState(true);

  useEffect(() => {
    const section = root.current!;
    const media = video.current!;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let target = 0;
    let failed = Boolean(media.error);
    let disposed = false;
    const seek = () => {
      if (!media.seeking && media.readyState >= 1 && Math.abs(media.currentTime - target) > 1 / 48) {
        media.currentTime = target;
      }
    };
    const update = () => {
      raf = 0;
      const reduced = preference.matches || failed;
      setStaticMode(reduced);
      const distance = section.offsetHeight - section.querySelector<HTMLElement>('.sangria-stage')!.offsetHeight;
      const progress = reduced ? 1 : Math.max(0, Math.min(1, -section.getBoundingClientRect().top / Math.max(1, distance)));
      // Finish the film early enough to hold the readable hero for a full viewport.
      const filmProgress = Math.min(1, progress / .72);
      section.style.setProperty('--film-progress', String(filmProgress));
      const duration = Number.isFinite(media.duration) ? media.duration : 0;
      target = Math.min(Math.max(0, duration - .04), filmProgress * duration);
      setRevealed(reduced || progress >= .72);
      seek();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const fail = () => { failed = true; schedule(); };
    const timeout = setTimeout(() => { if (media.readyState < 2) fail(); }, 15000);
    const ready = () => { if (!disposed) { clearTimeout(timeout); schedule(); } };
    media.addEventListener('loadeddata', ready);
    media.addEventListener('seeked', seek);
    media.addEventListener('error', fail);
    preference.addEventListener('change', schedule);
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    // Install the tall scroll section before measuring it.
    setStaticMode(preference.matches);
    raf = requestAnimationFrame(update);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
      media.removeEventListener('loadeddata', ready);
      media.removeEventListener('seeked', seek);
      media.removeEventListener('error', fail);
      preference.removeEventListener('change', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const skip = () => {
    const section = root.current!;
    window.scrollTo({top: scrollY + section.getBoundingClientRect().top + (section.offsetHeight - section.querySelector<HTMLElement>('.sangria-stage')!.offsetHeight) * .72 + 1, behavior: 'instant'});
    setRevealed(true);
    requestAnimationFrame(() => heading.current?.focus({preventScroll: true}));
  };

  return <section ref={root} className={`sangria-story${staticMode ? ' sangria-static' : ''}${revealed ? ' sangria-revealed' : ''}`} aria-label="A sangria, slowly made">
    <div className="sangria-stage">
      <div className="sangria-navigation" inert={!revealed} aria-hidden={!revealed} style={{opacity:revealed?1:0}}>{navigation}</div>
      <img className="sangria-poster" src="/sangria/poster.jpg" width={1920} height={1080} alt="" aria-hidden="true" />
      <video ref={video} className="sangria-film" src="/sangria/pour.mp4" poster="/sangria/opening.jpg" preload="auto" muted playsInline aria-hidden="true" />
      {!revealed && <><button className="sangria-skip" onClick={skip}>Skip introduction</button><p className="sangria-cue">Scroll to pour</p></>}
      <div className="sangria-copy" inert={!revealed} aria-hidden={!revealed} style={{opacity: revealed ? 1 : 0}}>
        <h1 ref={heading} tabIndex={-1}>Good nights.<br/>High spirits.</h1>
        <p>Music brings us together.<br/>Stay for another round.</p>
        <div className="actions"><Link className="button light" href={next ? `/events/${next.id}` : '/events'}>Find your night</Link><Link className="text-link" href="/reservations">Reserve a table</Link></div>
      </div>
    </div>
  </section>;
}
