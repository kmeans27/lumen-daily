# LUMEN — the daily light puzzle

> A one-to-three-minute browser game you play once a day. Everyone gets the same
> puzzle. You bend a beam of light through a dark grid and light up every target.

---

## The mastermind: why this succeeds

The daily-puzzle genre (Wordle, NYT Connections, Krillion) is successful because it
nails a specific set of design properties. We studied *why* they work, then built a
different game that satisfies the same *why*. The genre's success is not about any one
mechanic — it's about a **ritual**. That ritual is the mastermind.

**The seven properties that make a daily game stick:**

1. **One shared puzzle per day.** Every player worldwide gets the identical puzzle.
   This is what creates a community, comparison, and spoiler-free bragging. It is the
   single biggest engagement driver in the genre.
2. **A 1–3 minute commitment.** Low enough that playing daily never feels like a chore —
   which is exactly what lets streaks survive.
3. **Rules learnable in ~30 seconds, but real skill underneath.** A tiny rulebook, deep
   play.
4. **Every try is informative.** A visible "you were close" signal makes each attempt
   feel like progress (the Wordle "getting the feel" phenomenon).
5. **Streaks + a shareable, non-spoiling result card.** Bragging rights that leak nothing.
6. **A difficulty rhythm through the week** — easy at the start of the week, hard by the
   weekend. It gives the week a pulse.
7. **Zero friction:** no install, no paywall, no login, mobile-first.

**What Krillion specifically taught us:** its unique hook is *rarity* — reward what you
know that others don't. That tension (be correct, but be obscure) is the elegant part. We
carry that *design philosophy* — a puzzle that rewards elegant, minimal solutions —
without copying its trivia-dive mechanic.

## Our unique hook

**LUMEN's twist is economy + optics.** You are *given* exactly enough mirrors to solve the
puzzle — no spares. The beam is a real optical simulation (mirrors reflect, prisms split,
filters recolor). A solution that lights every target with the *right color* is forced to be
elegant because there is no slack. The satisfaction loop is: **place → watch the light
bend → see how close you are → adjust.** The light *is* the feedback.

This is genuinely different from Wordle (deduction), Connections (grouping), and Krillion
(trivia rarity) — but it inherits the genre's ritual, which is the actual reason the genre
works.

## Design decisions (the "why" behind each)

| Property | How LUMEN satisfies it |
|---|---|
| Shared daily puzzle | Puzzle is generated from a deterministic PRNG seeded by the date. No server, no backend — everyone computes the identical board. |
| 1–3 min | Small grids (5×5–8×8). A solve is a handful of mirror placements. |
| Simple rules, deep play | One rule: light must reach every target with matching color. Difficulty comes from geometry, not rules. |
| Informative tries | The beam animates on every placement; unlit targets and a "close" glow tell you exactly where you're off. |
| Streak + share card | Local streak/records in `localStorage`; a spoiler-free emoji result card you can paste anywhere. |
| Weekly difficulty ramp | Monday = easy (small grid, few targets, hints). Sunday = hard (large grid, colored targets, no hints). |
| Zero friction | Single static HTML/CSS/JS. Works on GitHub Pages, mobile-first, no login. |
| Rewards elegance (the Krillion philosophy) | Exact mirror count = forced elegance. The share card exposes *how economical* your solve was. |

## How to play

- A beam of light enters the grid from one edge.
- Place the **exact number of mirrors** you were given to bend the beam.
- **Light up every target.** A colored target must be hit by a beam of that color.
- Prisms **split** the beam; filters **recolor** it. You don't place those — they're fixed
  fixtures on the board.
- No spare mirrors. Fewer moves = a cleaner solve.

## Difficulty ramp

| Day | Grid | Targets | Fixtures | Hints |
|---|---|---|---|---|
| Mon | 5×5 | 1 | none | 1 pre-placed |
| Tue | 5×5 | 2 | none | 1 |
| Wed | 6×6 | 2 | 1 prism | 1 |
| Thu | 6×6 | 2 | 1 filter | 0 |
| Fri | 7×7 | 3 | 1 prism, 1 filter | 0 |
| Sat | 7×7 | 3 | 2 fixtures | 0 |
| Sun | 8×8 | 4 | 2 prisms, 2 filters | 0 |

## Running it

Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Deployed to GitHub Pages it just works — it's a single static page, no build step, no
dependencies, no network calls.

## Repository layout

```
lumen/
  README.md          this manifesto (the "mastermind")
  index.html         the game — HTML shell, loads src/
  src/
    style.css        the visual system (dark, glowing, high-contrast)
    engine.js        the optical engine: PRNG, board generator, beam simulation
    generator.js     builds a daily board FROM A KNOWN SOLUTION (guarantees solvability)
    game.js          game loop, input, streaks, share card, animations
  test/run.js        verifies every daily board is solvable by construction (70/70)
  LICENSE
```

## Why it's an original product, not a clone

- **Genre mechanics borrowed, expression original.** The *ritual* (shared daily puzzle,
  streaks, share card, weekly ramp) is what makes the genre sticky — we kept that because
  it's why the genre works. The *mechanic* (optical light-bending with economy) is ours.
- **No trivia bank, no hidden word, no grouping.** The core verb — aim light through
  mirrors/prisms/filters — is a new verb in the daily-game space.
- **Fair by construction.** Puzzles are *generated from a known solution*, so every daily
  board is guaranteed solvable with exactly the mirrors given. No unfair "guess the answer"
  dead-ends.

## License

MIT — see LICENSE.
