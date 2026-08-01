"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Phase = "home" | "quiz" | "catcher" | "letter";
type FallingItem = { x: number; y: number; speed: number; type: "heart" | "bomb"; spin: number };

const QUESTIONS = [
  "You know I love you, right?",
  "Guess how much I love you",
  "What do we love doing?",
];

function ProgressPath({ step }: { step: number }) {
  const percent = Math.min(100, Math.max(0, (step / 3) * 100));
  return (
    <div className="game-progress" aria-label={`Quest progress: ${Math.min(step + 1, 4)} of 4`}>
      <div className="game-progress__meta">
        <span>{step < 3 ? `QUESTION ${step + 1} / 3` : "FINAL CHALLENGE"}</span>
        <small>{step < 3 ? QUESTIONS[step] : "Collect 67 hearts"}</small>
      </div>
      <div className="game-progress__track">
        <div className="game-progress__fill" style={{ width: `${percent}%` }} />
        <div className="game-progress__walker" style={{ left: `calc(${percent}% - 23px)` }}>
          <img src="/her-avatar.png" alt="" />
        </div>
        {[0, 1, 2, 3].map((node) => (
          <span className={node <= step ? "done" : ""} key={node}>{node === 3 ? "🎁" : "♡"}</span>
        ))}
      </div>
    </div>
  );
}

function QuestionFrame({ number, title, subtitle, children }: { number: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="question-card">
      <div className="question-card__number">0{number}</div>
      <p className="question-card__eyebrow">A tiny love test</p>
      <h2>{title}</h2>
      <p className="question-card__subtitle">{subtitle}</p>
      {children}
    </section>
  );
}

function HeartCatcher({ active, onWin }: { active: boolean; onWin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerX = useRef(300);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lastHit, setLastHit] = useState<"heart" | "bomb" | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 700;
    const height = 500;
    let frame = 0;
    let last = performance.now();
    let lastSpawn = 0;
    const items: FallingItem[] = [];
    const keys = { left: false, right: false };

    const resize = () => {
      width = Math.max(300, Math.floor(canvas.clientWidth));
      canvas.width = width * Math.min(window.devicePixelRatio || 1, 2);
      canvas.height = height * Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = `${height}px`;
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      playerX.current = Math.min(width - 46, Math.max(46, playerX.current || width / 2));
    };

    const heartPath = (x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.28);
      ctx.bezierCurveTo(x - size * 0.72, y - size * 0.15, x - size * 0.56, y - size * 0.72, x, y - size * 0.34);
      ctx.bezierCurveTo(x + size * 0.56, y - size * 0.72, x + size * 0.72, y - size * 0.15, x, y + size * 0.28);
      ctx.closePath();
    };

    const drawPlayer = () => {
      const x = playerX.current;
      const y = height - 62;
      ctx.save();
      ctx.fillStyle = "#a65c43";
      ctx.beginPath(); ctx.arc(x, y - 42, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2d201f";
      ctx.beginPath(); ctx.arc(x, y - 49, 20, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 19, y - 49, 5, 19); ctx.fillRect(x + 14, y - 49, 5, 19);
      ctx.strokeStyle = "#271c1b"; ctx.lineWidth = 3;
      ctx.strokeRect(x - 17, y - 47, 14, 9); ctx.strokeRect(x + 3, y - 47, 14, 9);
      ctx.beginPath(); ctx.moveTo(x - 3, y - 43); ctx.lineTo(x + 3, y - 43); ctx.stroke();
      ctx.fillStyle = "#d56e48";
      ctx.beginPath(); ctx.ellipse(x, y - 11, 35, 31, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b98647";
      ctx.fillRect(x - 45, y - 6, 90, 32);
      ctx.strokeStyle = "#7d542b"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y - 5, 35, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.42)"; ctx.lineWidth = 1;
      for (let line = -32; line <= 32; line += 16) { ctx.beginPath(); ctx.moveTo(x + line, y - 5); ctx.lineTo(x + line, y + 25); ctx.stroke(); }
      ctx.restore();
    };

    const drawBomb = (item: FallingItem) => {
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.spin);
      ctx.fillStyle = "#30262b"; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#b7924a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(9, -13); ctx.quadraticCurveTo(18, -25, 10, -31); ctx.stroke();
      ctx.fillStyle = "#e19b47"; ctx.beginPath(); ctx.arc(10, -31, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = true;
      if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = false;
      if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = false;
    };

    const loop = (now: number) => {
      const delta = Math.min(34, now - last) / 1000;
      last = now;
      if (keys.left) playerX.current -= 330 * delta;
      if (keys.right) playerX.current += 330 * delta;
      playerX.current = Math.max(46, Math.min(width - 46, playerX.current));

      const spawnEvery = Math.max(320, 690 - scoreRef.current * 3.4);
      if (now - lastSpawn > spawnEvery) {
        lastSpawn = now;
        const bombChance = Math.min(.34, .17 + scoreRef.current / 430);
        items.push({
          x: 30 + Math.random() * (width - 60), y: -34,
          speed: 130 + Math.random() * 85 + scoreRef.current * 1.15,
          type: Math.random() < bombChance ? "bomb" : "heart", spin: Math.random() * Math.PI,
        });
      }

      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#f4d7dc"); gradient.addColorStop(1, "#fff8ed");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(122,24,48,.08)";
      for (let dot = 0; dot < 12; dot++) { ctx.beginPath(); ctx.arc((dot * 83) % width, 30 + (dot * 47) % 360, 3, 0, Math.PI * 2); ctx.fill(); }

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]; item.y += item.speed * delta; item.spin += delta * 1.8;
        if (item.type === "heart") {
          ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.sin(item.spin) * .18);
          ctx.fillStyle = i % 3 === 0 ? "#9a2443" : "#d35d74"; heartPath(0, 0, 25); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.beginPath(); ctx.arc(-7, -7, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else drawBomb(item);

        const caught = item.y > height - 105 && item.y < height - 20 && Math.abs(item.x - playerX.current) < 55;
        if (caught) {
          const next = item.type === "heart" ? scoreRef.current + 1 : Math.max(0, scoreRef.current - 3);
          scoreRef.current = next; setScore(next); setLastHit(item.type);
          window.setTimeout(() => setLastHit(null), 260);
          items.splice(i, 1);
          if (next >= 67) { cancelAnimationFrame(frame); onWin(); return; }
        } else if (item.y > height + 45) items.splice(i, 1);
      }
      drawPlayer();
      frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [active, onWin]);

  const move = (amount: number) => {
    const width = canvasRef.current?.clientWidth || 700;
    playerX.current = Math.max(46, Math.min(width - 46, playerX.current + amount));
  };

  return (
    <div className={`catcher ${lastHit === "bomb" ? "catcher--hit" : lastHit === "heart" ? "catcher--love" : ""}`}>
      <div className="catcher__hud"><span>HEARTS CAUGHT</span><strong>{score}<small>/ 67</small></strong></div>
      <canvas
        ref={canvasRef}
        aria-label="Heart Catcher game. Move with arrow keys, A and D, or drag across the game. Avoid bombs."
        onPointerMove={(event) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          playerX.current = Math.max(46, Math.min(rect.width - 46, event.clientX - rect.left));
        }}
      />
      <div className="catcher__controls">
        <button onPointerDown={() => move(-65)} aria-label="Move left">←</button>
        <p>Drag to move · Hearts +1 · Bombs −3</p>
        <button onPointerDown={() => move(65)} aria-label="Move right">→</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("home");
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [noTries, setNoTries] = useState(0);
  const [noPosition, setNoPosition] = useState({ left: 68, top: 52 });
  const [stretchWidth, setStretchWidth] = useState(34);
  const [stretchPressure, setStretchPressure] = useState(0);
  const stretchDragging = useRef(false);
  const [boxBroken, setBoxBroken] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);
  const [noneCount, setNoneCount] = useState(0);
  const [won, setWon] = useState(false);

  const goNext = () => {
    setAnswered(false); setFeedback("");
    if (step < 2) setStep((value) => value + 1);
    else setPhase("catcher");
  };

  const dodgeNo = () => {
    setNoTries((value) => value + 1);
    setNoPosition({ left: 12 + Math.random() * 72, top: 16 + Math.random() * 66 });
    setFeedback(noTries > 3 ? "The button is running out of confidence…" : "Nice try. Ask the tiny button again.");
  };

  const dragStretch = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!stretchDragging.current || boxBroken) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawWidth = ((event.clientX - rect.left) / rect.width) * 100;
    const viewportEdge = ((window.innerWidth - rect.left) / rect.width) * 100;
    const breakPoint = 100 + Math.max(1.5, (viewportEdge - 100) * .58);

    if (rawWidth <= 100) {
      setStretchWidth(Math.max(34, rawWidth));
      setStretchPressure(0);
      return;
    }

    setStretchWidth(100);
    setStretchPressure(Math.min(1, (rawWidth - 100) / (breakPoint - 100)));

    if (rawWidth >= breakPoint) {
      setStretchWidth(viewportEdge + 4);
      setStretchPressure(1);
      setBoxBroken(true);
      setAnswered(true);
      setFeedback("You broke past the border. That is exactly how much.");
    }
  };

  const toggleActivity = (activity: string) => {
    if (activity === "None of the above") {
      setNoneCount((value) => value + 1); setFeedback("Are you sure?"); return;
    }
    setActivities((current) => {
      const next = current.includes(activity) ? current.filter((item) => item !== activity) : [...current, activity];
      if (["Cuddle", "Play games", "Gossip"].every((item) => next.includes(item))) {
        setAnswered(true);
        setFeedback("Correct. Why choose one when we love all three?");
      } else {
        setFeedback("");
      }
      return next;
    });
  };

  const onWin = useCallback(() => setWon(true), []);

  if (phase === "home") {
    return (
      <main className="love-shell love-shell--simple">
        <div className="paper-noise" />
        <header className="topbar">
          <span className="brand"><span className="brand__seal">♡</span>National Girlfriend&apos;s Day</span>
          <span className="topbar__note">Made just for you</span>
        </header>
        <section className="simple-hero">
          <div className="simple-hero__copy">
            <p className="eyebrow"><span /> August 1 · One little surprise</p>
            <h1>National<br />Girlfriend&apos;s <em>Day</em></h1>
            <p className="lede">I made a tiny adventure for my favorite person.</p>
            <button className="simple-play" onClick={() => setPhase("quiz")}><span>♡</span> PLAY <span>→</span></button>
            <p className="simple-hero__hint">3 questions · 1 mini game · 67 hearts</p>
          </div>
          <div className="portrait-card">
            <div className="portrait-card__arch"><img src="/her-avatar.png" alt="An illustrated portrait of the player" /></div>
            <span className="portrait-card__spark portrait-card__spark--one">✦</span>
            <span className="portrait-card__spark portrait-card__spark--two">♡</span>
            <div className="portrait-card__caption"><span>For my favorite girl</span><small>There&apos;s a present at the end</small></div>
          </div>
        </section>
        <div className="home-hearts"><span>♡</span><span>♡</span><span>♡</span><span>♡</span><span>♡</span></div>
      </main>
    );
  }

  if (phase === "letter") {
    return (
      <main className="letter-page">
        <div className="paper-noise" />
        <div className="confetti" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <span key={i}>♡</span>)}</div>
        <article className="letter">
          <div className="letter__seal">♡</div>
          <p className="letter__eyebrow">A note from me to you</p>
          <h1>Happy National<br />Girlfriend&apos;s Day</h1>
          <div className="letter__message">
            <p>I know I haven&apos;t always been the boyfriend you deserve, especially over the years.</p>
            <p>But I want you to know that I am always here for you, and I will support you through anything. I love you so much. I wish I could hug you right now.</p>
            <p>If there&apos;s anything you want, I&apos;ll always do my best for you.</p>
          </div>
          <p className="letter__signoff">I love you, always. ♡</p>
          <button onClick={() => { setPhase("home"); setStep(0); setWon(false); }}>Play again</button>
        </article>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="paper-noise" />
      <header className="game-header">
        <button className="game-logo" onClick={() => setPhase("home")} aria-label="Return home">♡ <span>National Girlfriend&apos;s Day</span></button>
        <span>Love quest</span>
      </header>
      <ProgressPath step={phase === "catcher" ? 3 : step} />

      {phase === "quiz" && step === 0 && (
        <QuestionFrame number={1} title="You know I love you, right?" subtitle="This should be the easiest question in the whole game.">
          <div className="yes-no-arena">
            <button className="answer answer--yes" style={{ transform: `scale(${Math.pow(1.32, noTries)})` }} onClick={() => { setAnswered(true); setFeedback("I knew you knew. ♡"); }}>Yes, of course</button>
            {!answered && <button className="answer answer--no" style={{ left: `${noPosition.left}%`, top: `${noPosition.top}%`, transform: `translate(-50%, -50%) scale(${Math.max(.24, 1 - noTries * .12)})` }} onClick={dodgeNo}>No</button>}
          </div>
          <div className="feedback" aria-live="polite">{feedback}</div>
          {answered && <button className="continue-button" onClick={goNext}>Next question →</button>}
        </QuestionFrame>
      )}

      {phase === "quiz" && step === 1 && (
        <QuestionFrame number={2} title="Guess how much I love you" subtitle="Stretch it to the border, then keep dragging right even when it refuses to move.">
          <div
            className={`stretch-zone ${stretchPressure > 0 && !boxBroken ? "stretch-zone--resisting" : ""} ${boxBroken ? "stretch-zone--broken" : ""}`}
            onPointerDown={(event) => { stretchDragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerUp={() => { stretchDragging.current = false; }} onPointerCancel={() => { stretchDragging.current = false; }} onPointerMove={dragStretch}
          >
            <div className="stretch-love" style={{ width: `${stretchWidth}%` }}><span>{boxBroken ? "TOO MUCH FOR THIS SCREEN!" : "This much"}</span><b>♡</b><i aria-hidden="true">⋮</i></div>
            <div className="game-border-label">game border</div>
          </div>
          <div className="feedback" aria-live="polite">{feedback || (stretchPressure > .72 ? "It is fighting back — pull farther!" : stretchPressure > 0 ? "It stopped at the border. Keep pulling right…" : stretchWidth > 80 ? "Almost at the normal limit…" : "Stretch it farther.")}</div>
          {answered && <button className="continue-button" onClick={goNext}>I broke it! →</button>}
        </QuestionFrame>
      )}

      {phase === "quiz" && step === 2 && (
        <QuestionFrame number={3} title="What do we love doing?" subtitle="This one has more than one right answer. Pick everything that belongs to us.">
          <div className="choice-grid">
            {["Cuddle", "Play games", "Gossip", "None of the above"].map((choice) => (
              <button key={choice} className={`${activities.includes(choice) ? "selected" : ""} ${choice === "None of the above" ? "choice-none" : ""}`} style={choice === "None of the above" ? { transform: `scale(${Math.max(.52, 1 - noneCount * .08)})` } : undefined} onClick={() => toggleActivity(choice)}>
                <span>{activities.includes(choice) ? "♥" : "♡"}</span>{choice}
              </button>
            ))}
          </div>
          {noneCount > 0 && (
            <div
              className="are-you-sure"
              style={{
                fontSize: `${18 + noneCount * 18}px`,
                transform: `scale(${Math.pow(1.14, Math.max(0, noneCount - 1))})`,
              }}
            >
              ARE YOU SURE?
            </div>
          )}
          <div className="feedback" aria-live="polite">{feedback}</div>
          {answered && <button className="continue-button" onClick={goNext}>Start Heart Catcher →</button>}
        </QuestionFrame>
      )}

      {phase === "catcher" && (
        <section className="catcher-card">
          <div className="catcher-card__intro"><p className="question-card__eyebrow">Final challenge</p><h2>Catch 67 hearts</h2><p>Move her basket, catch every heart, and dodge the bombs.</p></div>
          <HeartCatcher active={!won} onWin={onWin} />
          {won && <div className="gift-overlay"><div><p>You caught all 67 hearts!</p><button className="gift" onClick={() => setPhase("letter")} aria-label="Open your present"><span>🎀</span>🎁</button><small>Tap the present to open it</small></div></div>}
        </section>
      )}
    </main>
  );
}
