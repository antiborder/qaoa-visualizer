import numpy as np
from qiskit import QuantumCircuit
from scipy.optimize import minimize

from .graph import Graph
from .maxcut import brute_force_max_cut, expected_cut_value
from .qaoa import expected_cut_at_general
from qiskit.quantum_info import Statevector

GAMMA_MAX = 2 * np.pi
BETA_MAX = np.pi
SHIFT = np.pi / 2


def _best_cut_for_depth(
    graph: Graph, p: int, rng: np.random.Generator, restarts: int, maxiter: int
) -> tuple[float, list[float], list[float]]:
    def objective(x):
        gammas = np.clip(x[:p], 0, GAMMA_MAX)
        betas = np.clip(x[p:], 0, BETA_MAX)
        return -expected_cut_at_general(graph, gammas.tolist(), betas.tolist())

    best = -1.0
    best_gammas: list[float] = []
    best_betas: list[float] = []
    for _ in range(restarts):
        x0 = np.concatenate([rng.uniform(0, GAMMA_MAX, p), rng.uniform(0, BETA_MAX, p)])
        result = minimize(objective, x0=x0, method="COBYLA", options={"maxiter": maxiter, "rhobeg": 0.6})
        gammas = np.clip(result.x[:p], 0, GAMMA_MAX)
        betas = np.clip(result.x[p:], 0, BETA_MAX)
        value = expected_cut_at_general(graph, gammas.tolist(), betas.tolist())
        if value > best:
            best = value
            best_gammas = gammas.tolist()
            best_betas = betas.tolist()
    return best, best_gammas, best_betas


# The Trotterized-adiabatic schedule (gamma_i = s_i * scale, beta_i = (1-s_i)
# * scale, linear s_i = i/p) for comparison against the actually-optimized
# angles. There's no canonical value for the overall time budget T in this
# discrete-QAOA setting (the adiabatic theorem only requires T large enough
# relative to the spectral gap, not a specific number) - scale=pi is chosen
# purely so the curve's shape fits the same axes as the real gamma/beta
# (gamma in [0, 2pi], beta in [0, pi]) rather than claiming this is "the"
# correct annealing time. Only the shape (monotonic increase/decrease) is
# meant to be compared, not absolute magnitudes.
def _adiabatic_schedule(p: int) -> tuple[list[float], list[float]]:
    scale = np.pi
    s = [i / p for i in range(1, p + 1)]
    gammas = [si * scale for si in s]
    betas = [(1 - si) * scale for si in s]
    return gammas, betas


# Same per-gate parameter-shift-and-sum technique as optimize.py, generalized
# to p layers: gamma_0 (the first layer's angle) still drives one RZZ gate
# per edge, all confined to layer 0, so shifting each of those and summing
# gives the exact derivative d<cut>/d(gamma_0) - used as the barren-plateau
# diagnostic.
def _expected_cut_general_shifted(
    graph: Graph, gammas: list[float], betas: list[float], edge_index: int, delta: float
) -> float:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for layer, (gamma, beta) in enumerate(zip(gammas, betas)):
        for idx, edge in enumerate(graph.edges):
            angle = 2 * gamma + (delta if (layer == 0 and idx == edge_index) else 0.0)
            qc.rzz(angle, edge.source, edge.target)
        qc.rx(2 * beta, range(n))
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(graph, sv.probabilities_dict())


def _gradient_wrt_first_gamma(graph: Graph, gammas: list[float], betas: list[float]) -> float:
    return sum(
        _expected_cut_general_shifted(graph, gammas, betas, i, SHIFT)
        - _expected_cut_general_shifted(graph, gammas, betas, i, -SHIFT)
        for i in range(len(graph.edges))
    )


def compute_depth_scan(
    graph: Graph,
    max_p: int = 4,
    restarts: int = 3,
    cobyla_maxiter: int = 80,
    gradient_samples: int = 15,
    seed: int = 7,
):
    rng = np.random.default_rng(seed)
    optimal_cut, _ = brute_force_max_cut(graph)

    p_values = list(range(1, max_p + 1))
    best_expected_cut_values = []
    approximation_ratios = []
    gradient_variances = []
    best_gammas_by_p = []
    best_betas_by_p = []
    adiabatic_gammas_by_p = []
    adiabatic_betas_by_p = []

    for p in p_values:
        best, best_gammas, best_betas = _best_cut_for_depth(graph, p, rng, restarts, cobyla_maxiter)
        best_expected_cut_values.append(best)
        approximation_ratios.append(best / optimal_cut)
        best_gammas_by_p.append(best_gammas)
        best_betas_by_p.append(best_betas)

        adiabatic_gammas, adiabatic_betas = _adiabatic_schedule(p)
        adiabatic_gammas_by_p.append(adiabatic_gammas)
        adiabatic_betas_by_p.append(adiabatic_betas)

        # Barren-plateau diagnostic: variance of d<cut>/d(gamma_0) across
        # random parameter initializations. A shrinking variance as p grows
        # means gradient-based optimizers see a progressively flatter
        # landscape from a random start - harder to find a useful direction.
        grads = [
            _gradient_wrt_first_gamma(
                graph, rng.uniform(0, GAMMA_MAX, p).tolist(), rng.uniform(0, BETA_MAX, p).tolist()
            )
            for _ in range(gradient_samples)
        ]
        gradient_variances.append(float(np.var(grads)))

    return {
        "pValues": p_values,
        "optimalCutValue": optimal_cut,
        "bestExpectedCutValues": best_expected_cut_values,
        "approximationRatios": approximation_ratios,
        "gradientVariances": gradient_variances,
        "bestGammas": best_gammas_by_p,
        "bestBetas": best_betas_by_p,
        "adiabaticGammas": adiabatic_gammas_by_p,
        "adiabaticBetas": adiabatic_betas_by_p,
    }
