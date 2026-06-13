'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import './landing.css'

const TOTAL_SLIDES = 5
const TARGET_DATE = new Date('2026-09-11T18:00:00-06:00').getTime()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [countdown, setCountdown] = useState({ d: '0', h: '00', m: '00', s: '00' })
  const [mountainVisible, setMountainVisible] = useState(false)
  const [mountainSettled, setMountainSettled] = useState(false)
  const [mountainFrozen, setMountainFrozen] = useState(false)
  const [mbLift, setMbLift] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const mountainRef = useRef<HTMLDivElement>(null)

  // Carousel
  const goTo = useCallback((i: number, manual = false) => {
    const next = ((i % TOTAL_SLIDES) + TOTAL_SLIDES) % TOTAL_SLIDES
    setCurrentSlide(next)
    if (manual) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => setCurrentSlide(c => (c + 1) % TOTAL_SLIDES), 6000)
    }
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentSlide(c => (c + 1) % TOTAL_SLIDES), 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Countdown
  useEffect(() => {
    function tick() {
      let diff = Math.max(0, TARGET_DATE - Date.now())
      const d = Math.floor(diff / 86400000); diff -= d * 86400000
      const h = Math.floor(diff / 3600000); diff -= h * 3600000
      const m = Math.floor(diff / 60000); diff -= m * 60000
      const s = Math.floor(diff / 1000)
      setCountdown({ d: String(d), h: pad(h), m: pad(m), s: pad(s) })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Mountain bg + footer lift
  useEffect(() => {
    const hero = heroRef.current
    const footer = footerRef.current
    if (!hero) return

    const observer = new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting
      setMountainVisible(show)
      if (show) {
        if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
        settleTimerRef.current = setTimeout(() => setMountainSettled(true), 1750)
      } else {
        setMountainSettled(false)
        if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null }
      }
    }, { threshold: 0.2 })
    observer.observe(hero)

    if (footer) {
      let ticking = false
      const update = () => {
        ticking = false
        const r = footer.getBoundingClientRect()
        const lift = Math.max(0, window.innerHeight - r.top)
        setMbLift(lift)
        setMountainFrozen(lift > 0)
      }
      const onScroll = () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(update)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      update()
      return () => {
        observer.disconnect()
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }
    return () => observer.disconnect()
  }, [])

  // Easter egg — Konami code
  useEffect(() => {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
    let i = 0
    const handler = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === seq[i]) {
        i++
        if (i === seq.length) {
          document.body.style.transition = 'filter 0.6s'
          document.body.style.filter = 'hue-rotate(45deg)'
          setTimeout(() => { document.body.style.filter = '' }, 4000)
          i = 0
        }
      } else { i = 0 }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const mountainClass = [
    'mountain-bg',
    mountainVisible ? 'is-visible' : '',
    mountainSettled ? 'is-settled' : '',
    mountainFrozen ? 'is-frozen' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="hackmty-landing">
      {/* ===================== HEADER ===================== */}
      <header className="site-header" style={{ backgroundColor: 'rgba(10, 10, 11, 0.965)' }}>
        <a
          className="mlh-badge-link"
          href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
          target="_blank"
          rel="noopener"
          aria-label="MLH 2027 Season Member Event"
        >
          <img
            src="/assets/mlh-trust-badge-2027-white.svg"
            alt="Major League Hacking 2026 Hackathon Season"
            className="mlh-badge-img"
            style={{ height: 150 }}
          />
        </a>
        <div className="brand-block">
          <a className="brand-link" href="/" aria-label="HackMTY home">
            <img src="/assets/hackmty-logo.webp" alt="HackMTY" className="hm-img" />
          </a>
          <div className="divider" />
          <a className="brand-link" href="https://tecacm.org" target="_blank" rel="noopener" aria-label="Tec ACM Student Chapter">
            <img src="/assets/tec-acm-logo.webp" alt="Tec ACM Student Chapter" className="tec-img" />
          </a>
        </div>
        <nav className="nav-links">
          <a href="#about" className="active" style={{ fontWeight: 500 }}>About</a>
          <a href="#" style={{ fontWeight: 500 }}>Schedule</a>
          <a href="#" style={{ fontWeight: 500 }}>Sponsors</a>
          <a href="#" style={{ fontWeight: 500 }}>Hall of Fame</a>
          <a href="#" style={{ fontWeight: 500 }}>FAQ</a>
          <a href="#" style={{ fontWeight: 500 }}>Contact</a>
        </nav>
        <button className="lang">ES</button>
        <div className="nav-right">
          <div className="socials">
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24">
                <rect x="1" y="1" width="22" height="22" rx="5" ry="5" fill="currentColor" />
                <circle cx="12" cy="12" r="4.6" fill="none" stroke="#0e0e10" strokeWidth="2.3" />
                <circle cx="17.6" cy="6.4" r="1.25" fill="#0e0e10" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <img src="/assets/facebook.svg" alt="" className="social-img" style={{ width: 16, height: 16, objectFit: 'cover' }} />
            </a>
            <a href="#" aria-label="LinkedIn">
              <img src="/assets/linkedin.png" alt="" className="social-img" style={{ width: 16, height: 16 }} />
            </a>
            <a href="#" aria-label="Discord">
              <svg viewBox="0 0 24 24">
                <rect x="1" y="1" width="22" height="22" rx="5" ry="5" fill="currentColor" />
                <path fill="#0e0e10" transform="translate(3.8 4.5) scale(0.7)" d="M20.32 4.37A19.79 19.79 0 0016.89 3l-.21.42a18.27 18.27 0 015.5 2.77c-1.65-.9-3.45-1.5-5.35-1.84a16.07 16.07 0 00-5.66 0c-1.9.34-3.7.94-5.35 1.84a18.27 18.27 0 015.5-2.77L7.32 3a19.79 19.79 0 00-3.43 1.37C1.83 7.46 1 11.5 1 15.42c1.85 1.45 4.2 2.36 6.6 2.46l.71-1.24c-1-.27-2-.66-2.86-1.18.24-.18.48-.36.71-.55a13.07 13.07 0 0011.7 0c.23.19.47.37.71.55-.86.52-1.86.91-2.86 1.18l.71 1.24c2.4-.1 4.75-1 6.6-2.46.18-3.92-.65-7.96-2.92-11.05zM8.5 13.5a1.96 1.96 0 01-2-2 1.96 1.96 0 012-2 1.96 1.96 0 012 2 1.96 1.96 0 01-2 2zm7 0a1.96 1.96 0 01-2-2 1.96 1.96 0 012-2 1.96 1.96 0 012 2 1.96 1.96 0 01-2 2z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* ===================== MOUNTAIN BACKGROUND ===================== */}
      <div
        ref={mountainRef}
        className={mountainClass}
        aria-hidden="true"
        style={{ bottom: mbLift }}
      >
        <svg className="mb-cloud-a" viewBox="0 0 135.18929 30.695786" xmlns="http://www.w3.org/2000/svg">
          <path d="m 0.19906977,29.828275 c -1.45675397,-3.83155 5.34754503,-7.60591 11.73179423,-6.50764 1.21763,0.20946 2.645873,0.56255 3.173873,0.78463 0.882965,0.37138 1.14983,0.30406 3.32564,-0.83888 2.167293,-1.13847 2.373821,-1.33383 2.463214,-2.33006 0.05367,-0.59807 0.313773,-1.50548 0.578014,-2.01647 1.532222,-2.96299 7.099748,-5.50407 12.059465,-5.50407 h 2.13187 l 0.214562,-1.3418 c 0.316418,-1.97877 1.694587,-4.2693102 3.636749,-6.0443302 2.070968,-1.89275 6.615051,-4.183352 10.150486,-5.11670501 3.298364,-0.870766 10.905764,-1.200277 14.48219,-0.62729 6.743698,1.08042301 12.80365,4.11990501 15.24887,7.64836501 l 0.84884,1.22488 2.56555,0.0488 c 3.22275,0.0612 6.06179,0.76493 8.48763,2.1037402 1.99929,1.10341 3.88313,3.20541 4.17338,4.6567 0.14985,0.74924 0.46486,0.94283 2.51624,1.54635 l 2.344943,0.68989 1.75905,-0.80531 c 5.03469,-2.30496 12.1166,-2.2859 17.04558,0.0459 2.19451,1.03817 4.47477,3.20837 4.83606,4.60265 0.25477,0.98317 0.29549,1.00137 2.53759,1.1341 5.37486,0.31818 9.22015,3.16941 8.61619,6.38879 l -0.21111,1.12527 H 67.722317 0.52889577 Z" />
        </svg>

        <svg className="mb-cloud-b" viewBox="0 0 117.38021 22.987417" xmlns="http://www.w3.org/2000/svg">
          <path d="m 117.21927,22.481287 c 0.89909,-2.34297 -2.05313,-4.57705 -6.75064,-5.10851 -1.29717,-0.14676 -2.7779,-0.0447 -4.60367,0.31736 l -2.69145,0.5337 -1.78022,-0.78771 c -1.560908,-0.69068 -1.827488,-0.94551 -2.163948,-2.06852 -0.86975,-2.90295 -4.60097,-4.77821 -10.62715,-5.34105 l -2.09133,-0.1953297 -0.54835,-1.54391 c -1.82402,-5.13564 -11.38447,-8.82539997 -21.30608,-8.22285997 -6.67143,0.40516 -12.4067,2.37517997 -15.44746,5.30607997 l -1.5905,1.53304 -3.10248,0.16208 c -4.80479,0.251 -9.09968,2.26895 -9.79478,4.6020597 -0.26464,0.88826 -0.49743,1.03034 -2.45988,1.50133 -2.06199,0.49488 -2.23482,0.49078 -3.5477,-0.0842 -3.46552,-1.5176 -9.61345,-1.68473 -13.73322,-0.37333 -2.16901,0.69044 -4.86412,2.66986 -5.2376701,3.84681 -0.1484,0.46757 -0.65507,0.63427 -2.47195,0.8133 -4.99691,0.49238 -8.03593999,2.67853 -7.10303999,5.10962 0.17613,0.459 5.63022999,0.50617 58.52576009,0.50617 52.895528,0 58.349628,-0.0472 58.525758,-0.50617 z" />
        </svg>

        <svg className="mb-sun" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <circle cx="512" cy="512" r="256" />
        </svg>

        <svg className="mb-cerro" viewBox="0 0 4000.1961 837.70972" xmlns="http://www.w3.org/2000/svg">
          <path d="m 1800.3283,34.723801 c -1.4212,-0.3238 -2.934,-0.2851 -4.4903,0.029 -10.3758,2.0929 -22.6894,16.3769 -22.6894,16.3769 C 1697.2677,125.5266 1533.8283,208.7528 1533.8283,208.7528 1407.98,236.7636 1294.5845,146.009 1187.0978,90.221501 1135.7334,58.697401 1001.4728,130.5712 1001.4728,130.5712 972.2877,153.2685 804.4285,95.437001 804.4285,95.437001 753.063,89.132401 546.39,357.5477 546.39,357.5477 541.8734,361.4879 0,842.981 0,842.981 c 0,0 397.6295,-7.5629 391.7653,-5.4411 h 429.9594 1797.0782 l 1073.34,-0.46094 C 3681.6321,828.63449 3614.4612,693.91997 3400.6139,548.17503 3277.6025,464.33819 3135.271,361.8372 2985.1559,348.97954 2872.93,339.36716 2701.8982,282.56041 2701.8982,282.56041 2640.0212,256.08001 2484.129,231.4442 2484.129,231.4442 c -16.0642,6.1976 -78.1132,-27.5393 -115.582,-49.1719 -53.3224,-0.87432 -8.9202,29.3112 -137.7598,-41.6113 -26.8485,-26.4804 -80.5527,34.043 -80.5527,34.043 -47.866,18.9139 -121.414,-63.0469 -121.4141,-63.0469 -30.052,-23.165999 -24.5704,-59.287899 -70.0488,-37.830099 -28.0315,44.455399 -40.6298,135.775899 -118.3687,75.467999 -34.9345,-25.7006 -31.0571,-99.424999 -31.0571,-99.424999 -1.3143,-9.9306 -4.7537,-14.1749 -9.0175,-15.1465 z" />
        </svg>

        <svg className="mb-cloud-bottom" viewBox="0 0 288.14969 58.720001" xmlns="http://www.w3.org/2000/svg">
          <path d="m 0.05586616,57.84 c -0.0956,-0.484 -0.06544,-1.456 0.06703,-2.16 C 1.5478122,48.10755 12.693979,44.69035 19.978697,49.59261 l 1.638178,1.10241 1.468129,-1.12065 c 1.707821,-1.30361 3.007044,-1.89377 4.857273,-2.20636 1.116363,-0.18861 1.327408,-0.34383 1.327408,-0.97628 0,-1.4731 1.023921,-5.13171 2.055397,-7.34421 2.184299,-4.6853 5.846822,-8.39024 10.584603,-10.70717 6.788123,-3.31962 15.237176,-2.94781 21.708644,0.95531 l 2.182827,1.31653 1.75422,-1.93848 c 2.451106,-2.70856 5.569618,-4.24486 9.022284,-4.44473 l 2.48847,-0.14406 0.54946,-1.54704 c 1.000365,-2.81659 3.32053,-4.83934 6.96064,-6.06839 1.7028,-0.57493 2.5999,-0.67278 5.25346,-0.57301 2.75912,0.10375 3.48866,0.25596 5.29516,1.10477 2.73724,1.28613 4.24588,2.64743 5.28284,4.76688 0.82822,1.69282 1.09866,4.09003 0.62854,5.57128 -0.1725,0.54348 -0.0786,0.57262 1.02175,0.31716 1.89935,-0.44094 5.85378,-0.34436 7.91841,0.19341 2.51919,0.65617 5.37988,2.22024 7.07625,3.86894 l 1.38987,1.3508 0.64942,-1.73574 c 1.63872,-4.37986 3.62227,-7.57548 6.68182,-10.76486 4.00634,-4.17635 8.33357,-6.27789 13.49593,-6.55438 5.10399,-0.27336 9.30488,1.16553 13.66842,4.68171 l 1.91338,1.54183 1.66947,-2.52415 C 161.22841,13.62058 164.86477,11.36 168.74219,11.36 h 1.86565 l 0.37682,-1.68 c 0.80183,-3.57479 3.52211,-6.98635 6.95653,-8.72433 C 179.68076,0.07536 180.09463,0 183.18968,0 c 3.06881,0 3.5264,0.0815 5.28,0.94034 5.49831,2.69286 8.59589,9.3623 6.9797,15.02807 -0.13996,0.49064 -0.058,0.56274 0.42337,0.37247 0.32831,-0.12976 1.4713,-0.37481 2.53998,-0.54456 5.57289,-0.88521 11.83759,2.35497 15.1196,7.82005 2.51466,4.1873 3.5069,9.817 2.53855,14.40301 l -0.46018,2.17938 1.46949,1.00408 c 2.49037,1.70164 4.54142,3.37939 7.79248,6.37423 l 3.12299,2.87686 1.6083,-1.446 c 0.88457,-0.7953 2.29188,-1.75494 3.12736,-2.13253 1.41293,-0.63857 1.5461,-0.8021 1.90632,-2.34096 1.08048,-4.61581 4.59982,-9.33088 8.33641,-11.16877 1.94906,-0.95868 2.37923,-1.04567 5.17077,-1.04567 2.8438,0 3.17461,0.0704 5.0098,1.0659 1.08072,0.58624 2.34967,1.46746 2.81988,1.95826 l 0.85494,0.89235 2.04635,-1.37222 c 3.67592,-2.46498 8.44261,-2.79276 12.38547,-0.8517 3.34573,1.64709 6.27613,5.37635 6.84219,8.70741 0.1573,0.92569 0.42071,1.22695 1.51828,1.73645 2.05969,0.95613 5.08409,4.23646 6.41062,6.95309 1.09143,2.23518 2.11734,5.49978 2.11734,6.73769 0,0.54951 -5.84601,0.57277 -143.96,0.57277 H 0.22969016 Z" />
        </svg>
      </div>

      {/* ===================== HERO ===================== */}
      <section className="hero" ref={heroRef}>
        <div className="hero-stage" id="hero-stage">
          {[1, 2, 3, 4, 5].map((n, i) => (
            <div key={n} className={`slide${currentSlide === i ? ' on' : ''}`} data-i={i}>
              <img src={`/assets/hero-${n}.webp`} alt="" />
            </div>
          ))}
        </div>

        <img src="/assets/hm-shield-hero.webp" alt="" className="hero-crest" aria-hidden="true" />

        <h1 className="hero-title" style={{ fontWeight: 700 }}>
          HackMTY<span className="apos">&apos;</span><span style={{ color: '#d4a84b' }}> 26</span>
        </h1>

        <div className="hero-where">
          <span className="where" style={{ fontWeight: 500, color: 'rgb(255, 255, 255)' }}>
            36 hour long Hackathon at Tec de Monterrey, Monterrey NL.
          </span>
        </div>

        <div className="countdown" id="countdown">
          <div className="unit">
            <b style={{ fontWeight: 600 }}>{countdown.d}</b>
            <span style={{ color: 'rgb(255, 255, 255)' }}>days</span>
          </div>
          <div className="unit">
            <b style={{ fontWeight: 600 }}>{countdown.h}</b>
            <span style={{ color: 'rgb(255, 255, 255)' }}>hours</span>
          </div>
          <div className="unit">
            <b style={{ fontWeight: 600 }}>{countdown.m}</b>
            <span style={{ color: 'rgb(255, 255, 255)' }}>minutes</span>
          </div>
          <div className="unit">
            <b style={{ fontWeight: 600 }}>{countdown.s}</b>
            <span style={{ color: 'rgb(255, 255, 255)' }}>seconds</span>
          </div>
        </div>
      </section>

      {/* Gold band */}
      <div className="hero-gold-band" aria-hidden="true" />

      {/* ===================== ABOUT ===================== */}
      <section className="section about-section" id="about">
        <div className="container">
          <div className="about-head">
            <h2>The largest student hackathon <i>in Latin America.</i></h2>
          </div>

          <div className="about-cards v2">
            <article className="about-card v2">
              <div className="v2-eyebrow">What makes us awesome</div>
              <div className="v2-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="14" width="48" height="30" rx="3" />
                  <path d="M4 50h56l-3 4H7z" />
                  <polyline points="26 24 20 29 26 34" />
                  <polyline points="38 24 44 29 38 34" />
                  <line x1="34" y1="22" x2="30" y2="36" />
                </svg>
              </div>
              <p className="v2-body">
                We are the <b>largest student hackathon in Mexico.</b> Hosted by Tecnológico de Monterrey, a globally recognized university ranked among the top 200 universities worldwide.
              </p>
            </article>

            <article className="about-card v2">
              <div className="v2-eyebrow">All students welcome!</div>
              <div className="v2-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="32" cy="16" r="6" />
                  <path d="M22 36 C 22 31, 26.5 27, 32 27 S 42 31, 42 36" />
                  <circle cx="18" cy="28" r="6" />
                  <path d="M8 48 C 8 43, 12.5 39, 18 39 S 28 43, 28 48" />
                  <circle cx="46" cy="28" r="6" />
                  <path d="M36 48 C 36 43, 40.5 39, 46 39 S 56 43, 56 48" />
                </svg>
              </div>
              <p className="v2-body">
                Whether it&apos;s your first hackathon or you&apos;re an experienced hacker, HackMTY is perfect for you and there&apos;s no entry fee.
              </p>
            </article>

            <article className="about-card v2 feature">
              <div className="v2-eyebrow">Made by Tec ACM</div>
              <div className="v2-icon tec-mark" aria-hidden="true">
                <img src="/assets/tec-acm-logo.webp" alt="" />
              </div>
              <p className="v2-body">
                HackMTY is built, planned and run end&#8209;to&#8209;end by Tec ACM, the student chapter of the Association for Computing Machinery at Tec de Monterrey. Make sure to follow us in our social media!
              </p>
              <span className="v2-meta">Student Chapter &middot; Est. 2015</span>
            </article>

            <article className="about-card v2">
              <div className="v2-eyebrow">The 36-hour experience</div>
              <div className="v2-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="32" cy="34" r="22" />
                  <polyline points="32 20 32 34 42 38" />
                  <line x1="25" y1="6" x2="39" y2="6" />
                  <line x1="32" y1="6" x2="32" y2="12" />
                </svg>
              </div>
              <p className="v2-body">
                36 hours of building, mentors on the floor, workshops with our sponsors, snacks at 3 am, and one big demo stage. An official MLH member event.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ===================== REG BANNER ===================== */}
      <section className="section reg-banner-section" aria-label="Registration status">
        <div className="container">
          <div className="reg-banner" role="status">
            <span className="reg-banner-text">Registration opening soon</span>
          </div>
        </div>
      </section>

      {/* ===================== LOCATION ===================== */}
      <section className="section location">
        <div className="container">
          <div className="loc-head">
            <div className="loc-head-l">
              <span className="eyebrow">Location</span>
              <h2>Arena <i>Borregos.</i></h2>
            </div>
          </div>

          <div className="loc-map-bleed">
            <iframe
              className="loc-map-iframe"
              title="Map of Arena Borregos, Tec de Monterrey"
              src="https://maps.google.com/maps?q=Arena%20Borregos%20Tec%20de%20Monterrey&t=m&z=16&output=embed&iwloc=near"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            <aside className="loc-card">
              <div className="loc-card-top">
                <span className="loc-card-eyebrow"><span className="dot" />Venue</span>
                <span className="loc-card-coord">25.6515&deg; N &nbsp;/&nbsp; 100.2899&deg; W</span>
              </div>
              <div className="loc-card-name">Arena <i>Borregos.</i></div>
              <div className="loc-card-addr">
                Av. Eugenio Garza Sada 2501 Sur<br />
                Tecnol&oacute;gico, 64849 Monterrey, N.L., M&eacute;xico
              </div>
              <div className="loc-card-meta">
                <div className="loc-card-row">
                  <span className="loc-card-lbl">When</span>
                  <span className="loc-card-val">September 11&ndash;13, 2026</span>
                </div>
                <div className="loc-card-row">
                  <span className="loc-card-lbl">Where</span>
                  <span className="loc-card-val">Monterrey, Nuevo Le&oacute;n</span>
                </div>
              </div>
              <a
                className="loc-card-cta"
                href="https://www.google.com/maps/search/?api=1&query=Arena+Borregos+Tec+de+Monterrey"
                target="_blank"
                rel="noopener"
              >
                View on Google Maps
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            </aside>
          </div>
        </div>
      </section>

      {/* ===================== WAITLIST ===================== */}
      <section className="section waitlist" aria-label="Join the waitlist">
        <div className="container">
          <h2>Be the first to know <i>when registration opens.</i></h2>
          <p className="wl-lede">
            Registration isn&apos;t live yet, but you can leave your name and email on our short Google Form and we&apos;ll send you a heads-up the second it opens.
          </p>
          <a className="wl-cta" href="https://forms.gle/ijusReCzdRE83Aas9" target="_blank" rel="noopener">
            <svg className="wl-form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="13" y2="16" />
            </svg>
            <span>Open the Google Form</span>
            <svg className="wl-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="18" x2="18" y2="6" />
              <polyline points="9 6 18 6 18 15" />
            </svg>
          </a>
          <p className="wl-note">Takes about 1 minute &middot; We&apos;ll only email you about HackMTY &apos;26</p>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="site-footer" ref={footerRef}>
        <div className="container">
          <div className="footer-brand">
            <div className="footer-logos">
              <img src="/assets/hm-footer-shield.webp" alt="HackMTY" className="footer-hm" />
              <span className="footer-divider" aria-hidden="true" />
              <img src="/assets/tec-acm-footer.webp" alt="Tec ACM Student Chapter" className="footer-tec" />
            </div>
            <p>Latin America&apos;s largest student hackathon. Built by Tec ACM at Tec de Monterrey since 2017.</p>
            <div className="badges">
              <span>MLH 2026</span>
              <span>TEC ACM</span>
              <span>EST. 2017</span>
            </div>
          </div>
          <div className="footer-col">
            <h5>The event</h5>
            <a href="#">About</a>
            <a href="#">Schedule</a>
            <a href="#">Sponsors</a>
            <a href="#">FAQ</a>
          </div>
          <div className="footer-col">
            <h5>Community</h5>
            <a href="#">Hall of Fame</a>
            <a href="#">Past editions</a>
            <a href="#">Discord</a>
            <a href="#">Instagram</a>
          </div>
          <div className="footer-col">
            <h5>Contact</h5>
            <a href="mailto:hello@hackmty.com">hello@hackmty.com</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 HackMTY / Tec ACM Student Chapter</span>
          <span className="easter" title="↑↑↓↓←→←→ba">↑↑↓↓←→←→ba</span>
        </div>
      </footer>
    </div>
  )
}
