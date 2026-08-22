# QAOA Visualizer

**Learn QAOA visually, step by step — no quantum computing background required.**

![QAOA Visualizer screenshot](docs/images/screenshot.jpg)

## What this is

An interactive, step-by-step walkthrough of the Quantum Approximate
Optimization Algorithm (QAOA), built around the Max-Cut problem. It takes
you through the full pipeline a real QAOA application goes through: define
a combinatorial problem → translate it into a quantum Hamiltonian → build
the parameterized quantum circuit (cost unitary + mixer unitary) → run a
classical optimizer to tune it → see what happens as you add more layers →
compare against a noisy, realistic simulation → generalize the same
machinery to a second problem (Maximum Independent Set).

Every circuit diagram and every numerical result is generated live for
whichever graph you pick — nothing is a canned screenshot.

## Who it's for

Anyone with the will to learn but no prior quantum computing background.
Each of the 31 steps introduces exactly one idea, so there's no point where
you need to already know something the app hasn't shown you yet. It's
built to be picked up anywhere, including on a phone: layouts are
responsive, and every interaction (choosing a graph, dragging a parameter
slider, rotating a 3D landscape) works with touch.

## Features

- **31 bite-sized steps** — one concept per step, auto-numbered from array
  position so the flow stays consistent as content evolves.
- **2D and 3D visualization** — graph structure and cuts in 2D; parameter
  landscapes, optimizer trajectories, and Bloch-sphere qubit states in
  interactive 3D.
- **Fully interactive, not just illustrated** — drag sliders to change
  $\gamma,\beta$ and watch the measurement histogram and Bloch spheres
  update live; switch graphs and watch every downstream circuit diagram
  and result recompute for that graph, not a fixed example.
- **Real computation throughout** — backed by Qiskit and Qiskit Aer; there
  are no precomputed/faked numbers anywhere in the walkthrough.
- **Honest about limits** — the app explicitly shows where QAOA doesn't
  guarantee an optimal answer, where it struggles (approximation ratio on
  MIS vs. Max-Cut), and where it faces open problems (barren plateaus).

## Getting started

```bash
# backend
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open the printed `localhost` URL. A "Concepts" reference page (linked from
the app) covers the underlying quantum-mechanics and adiabatic-theorem
background in more depth than fits into the step-by-step flow.

## Tech stack

FastAPI + Qiskit (Aer) backend · React + TypeScript frontend, no UI
framework.

## What you'll learn

- Graph fundamentals and the Max-Cut problem
- Translating a cost function into a quantum cost Hamiltonian and unitary
- The mixer unitary, and why it — not the cost unitary — is what turns
  hidden phase information into a measurable probability shift
- Reading the parameter $(\gamma,\beta)$ landscape as a 3D surface
- Classical optimization loops (COBYLA, SPSA, parameter-shift gradients)
  driving the quantum circuit
- Adding layers ($p>1$) and measuring the approximation-ratio payoff
- How gate noise degrades results on a realistic (noisy) simulator
- Generalizing the same pipeline to a second problem (Maximum Independent
  Set) via a QUBO / penalty-method reduction

## Mathematical formulation

QAOA prepares a parameterized quantum state by alternating two unitaries
$p$ times, starting from the uniform superposition:

$$
|\gamma,\beta\rangle \;=\; U_B(\beta_p)\,U_C(\gamma_p)\,\cdots\,U_B(\beta_1)\,U_C(\gamma_1)\,|+\rangle^{\otimes n}
$$

For a single layer ($p=1$, the case most of the app's steps build up to):

$$
|\gamma,\beta\rangle \;=\; U_B(\beta)\,U_C(\gamma)\,|+\rangle^{\otimes n}
$$

**What each piece does:**

- $|+\rangle^{\otimes n} = H^{\otimes n}|0\rangle^{\otimes n}$ — the equal
  superposition of all $2^n$ candidate bitstrings.
- $U_C(\gamma) = e^{-i\gamma H_C}$, the **cost unitary**. For Max-Cut,
  $H_C = \sum_{(i,j)\in E} Z_iZ_j$. $H_C$ is diagonal in the computational
  basis, so this step writes each bitstring's cut value into its
  **phase** — every basis state picks up a different phase, but
  measurement *probabilities* don't move at all yet (the app verifies
  this live: the measurement histogram is exactly flat after $U_C$ alone,
  for every $\gamma$).
- $U_B(\beta) = e^{-i\beta H_B}$, the **mixer unitary**, with
  $H_B = \sum_i X_i$. $X$ doesn't commute with $Z$, so this step
  interferes the phases $U_C$ just wrote in, converting them into an
  actual shift in measurement *probability* toward high-cut bitstrings.
  Without it, $U_C$'s phase information is completely unobservable.
- Both unitaries decompose exactly into native gates, with no Trotter
  approximation needed at $p=1$, because $H_C$ and $H_B$ are each sums of
  mutually commuting terms: $U_C(\gamma) = \prod_{(i,j)\in E}
  \text{RZZ}(2\gamma)_{i,j}$ and $U_B(\beta) = \prod_i \text{RX}(2\beta)_i$.

**What's actually being optimized:** not $|\gamma,\beta\rangle$ directly —
a classical optimizer (COBYLA, SPSA, or the parameter-shift gradient rule,
all implemented and compared live in the app) searches over $(\gamma,\beta)$
to maximize the *expected* cut value, estimated from the measured
probability distribution:

$$
\langle \text{cut} \rangle(\gamma,\beta) = \sum_b P(b)\,\text{cut}(b), \qquad P(b) = |\langle b|\gamma,\beta\rangle|^2
$$

Because $\text{Cut}(A,B) = (|E| - H_C)/2$ exactly, this is equivalent to
minimizing $\langle H_C \rangle$. QAOA gives no guarantee of finding the
true optimum — it's a variational heuristic that shifts probability mass
toward good solutions, with quality improving (empirically, not provably)
as the depth $p$ increases. The app measures this directly: approximation
ratio vs. $p$, on every bundled graph.

The same structure generalizes to other combinatorial problems by swapping
out $H_C$: for Maximum Independent Set, a penalty-method QUBO reduction
produces $H_C = \sum_i \left[\tfrac12 - \tfrac{A}{4}\deg(i)\right]Z_i +
\tfrac{A}{4}\sum_{(i,j)\in E} Z_iZ_j$ — same mixer, same optimization loop,
different cost Hamiltonian. The app derives this reduction from scratch
too (QUBO → Pauli substitution → per-node/per-edge gate angles), and shows
that QAOA's performance on it is noticeably worse than on Max-Cut at the
same depth — a real illustration of "same algorithm, different problem,
different difficulty."

## Project structure

- `frontend/src/*Walkthrough.tsx` — one file per chapter of the walkthrough
  (`Step1Walkthrough`, `CostUnitaryWalkthrough`, `MixerUnitaryWalkthrough`,
  `TwoLayerWalkthrough`, `MISWalkthrough`). Each exports a
  `build*Steps(...)` function returning a flat array of
  `{chapter, section, title, content}` entries; step numbers and the
  progress bar are computed automatically from array position, never
  hardcoded.
- `backend/app/qaoa.py`, `mis_qaoa.py` — circuit construction and exact
  statevector simulation (via Qiskit) for the numbers the app displays.
- `backend/app/circuit_diagram.py` — renders the circuit *diagrams* shown
  in the app, built with symbolic Qiskit `Parameter`s (not bound numbers)
  so the image reads cleanly, but with real per-graph topology.
- `backend/app/optimize.py`, `depth_scan.py`, `noise_sim.py` — the
  classical optimization loop, depth-vs-approximation-ratio scan, and
  noisy-simulator comparison shown in later steps.
