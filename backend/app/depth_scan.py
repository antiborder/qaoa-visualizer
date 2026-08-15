import numpy as np
from qiskit import QuantumCircuit
from scipy.optimize import minimize

from .graph import EDGES, NODES
from .maxcut import brute_force_max_cut, expected_cut_value
from .qaoa import expected_cut_at_general
from qiskit.quantum_info import Statevector

GAMMA_MAX = 2 * np.pi
BETA_MAX = np.pi
SHIFT = np.pi / 2


def _best_cut_for_depth(p: int, rng: np.random.Generator, restarts: int, maxiter: int) -> float:
    def objective(x):
        gammas = np.clip(x[:p], 0, GAMMA_MAX)
        betas = np.clip(x[p:], 0, BETA_MAX)
        return -expected_cut_at_general(gammas.tolist(), betas.tolist())

    best = -1.0
    for _ in range(restarts):
        x0 = np.concatenate([rng.uniform(0, GAMMA_MAX, p), rng.uniform(0, BETA_MAX, p)])
        result = minimize(objective, x0=x0, method="COBYLA", options={"maxiter": maxiter, "rhobeg": 0.6})
        gammas = np.clip(result.x[:p], 0, GAMMA_MAX)
        betas = np.clip(result.x[p:], 0, BETA_MAX)
        value = expected_cut_at_general(gammas.tolist(), betas.tolist())
        best = max(best, value)
    return best


# Same per-gate parameter-shift-and-sum technique as optimize.py, generalized
# to p layers: gamma_0 (the first layer's angle) still drives 6 RZZ gates,
# all confined to layer 0, so shifting each of those 6 and summing gives the
# exact derivative d<cut>/d(gamma_0) - used as the barren-plateau diagnostic.
def _expected_cut_general_shifted(gammas: list[float], betas: list[float], edge_index: int, delta: float) -> float:
    n = len(NODES)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for layer, (gamma, beta) in enumerate(zip(gammas, betas)):
        for idx, edge in enumerate(EDGES):
            angle = 2 * gamma + (delta if (layer == 0 and idx == edge_index) else 0.0)
            qc.rzz(angle, edge.source, edge.target)
        qc.rx(2 * beta, range(n))
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(sv.probabilities_dict())


def _gradient_wrt_first_gamma(gammas: list[float], betas: list[float]) -> float:
    return sum(
        _expected_cut_general_shifted(gammas, betas, i, SHIFT)
        - _expected_cut_general_shifted(gammas, betas, i, -SHIFT)
        for i in range(len(EDGES))
    )


def compute_depth_scan(
    max_p: int = 4,
    restarts: int = 3,
    cobyla_maxiter: int = 80,
    gradient_samples: int = 15,
    seed: int = 7,
):
    rng = np.random.default_rng(seed)
    optimal_cut, _ = brute_force_max_cut()

    p_values = list(range(1, max_p + 1))
    best_expected_cut_values = []
    approximation_ratios = []
    gradient_variances = []

    for p in p_values:
        best = _best_cut_for_depth(p, rng, restarts, cobyla_maxiter)
        best_expected_cut_values.append(best)
        approximation_ratios.append(best / optimal_cut)

        # Barren-plateau diagnostic: variance of d<cut>/d(gamma_0) across
        # random parameter initializations. A shrinking variance as p grows
        # means gradient-based optimizers see a progressively flatter
        # landscape from a random start - harder to find a useful direction.
        grads = [
            _gradient_wrt_first_gamma(
                rng.uniform(0, GAMMA_MAX, p).tolist(), rng.uniform(0, BETA_MAX, p).tolist()
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
    }
