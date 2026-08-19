import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from scipy.optimize import minimize

from .graph import Graph
from .mis import PENALTY_A, brute_force_mis, expected_objective_value

# QUBO objective: maximize size - PENALTY_A * violations, i.e. (using
# x_i = (1-Z_i)/2 for "node i included"):
#   H_obj = sum_i x_i - (A/4) * sum_edges (1 - Z_i - Z_j + Z_i*Z_j)
# Cost Hamiltonian H_C = -H_obj (minimizing H_C maximizes the objective,
# same convention as maxcut.py's H_C = sum Z_i*Z_j). Dropping constants:
#   H_C = sum_i [1/2 - (A/4)*deg(i)] * Z_i + (A/4) * sum_edges Z_i*Z_j
# Cost unitary exp(-i*gamma*H_C): RZ(2*gamma*coeff_i) per node,
# RZZ(2*gamma*A/4) = RZZ(gamma*A/2) per edge. Mixer is the same RX(2*beta)
# transverse-field mixer as Max-Cut. Verified against brute force: H_C
# computed directly from this formula equals -objective - 0.5 for every
# bitstring on the bowtie graph, confirming the sign/coefficients are correct.

GAMMA_MAX = 2 * np.pi
BETA_MAX = np.pi


def _degree(graph: Graph, node: int) -> int:
    return sum(1 for e in graph.edges if e.source == node or e.target == node)


def _z_coefficient(graph: Graph, node: int) -> float:
    return 0.5 - (PENALTY_A / 4) * _degree(graph, node)


def build_mis_circuit(graph: Graph, gammas: list[float], betas: list[float]) -> QuantumCircuit:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for gamma, beta in zip(gammas, betas):
        for i, node in enumerate(graph.nodes):
            qc.rz(2 * gamma * _z_coefficient(graph, node), i)
        for edge in graph.edges:
            qc.rzz(gamma * PENALTY_A / 2, edge.source, edge.target)
        qc.rx(2 * beta, range(n))
    return qc


def analyze_mis_p1(graph: Graph, gamma: float, beta: float) -> dict[str, float]:
    qc = build_mis_circuit(graph, [gamma], [beta])
    sv = Statevector.from_instruction(qc)
    return sv.probabilities_dict()


def expected_objective_at(graph: Graph, gammas: list[float], betas: list[float]) -> float:
    qc = build_mis_circuit(graph, gammas, betas)
    sv = Statevector.from_instruction(qc)
    return expected_objective_value(graph, sv.probabilities_dict())


def compute_mis_depth_scan(
    graph: Graph, max_p: int = 4, restarts: int = 6, cobyla_maxiter: int = 100, seed: int = 3
):
    rng = np.random.default_rng(seed)
    optimal_size, _ = brute_force_mis(graph)

    p_values = list(range(1, max_p + 1))
    best_values = []
    approximation_ratios = []

    for p in p_values:
        def objective(x, p=p):
            gammas = np.clip(x[:p], 0, GAMMA_MAX).tolist()
            betas = np.clip(x[p:], 0, BETA_MAX).tolist()
            return -expected_objective_at(graph, gammas, betas)

        best = -99.0
        for _ in range(restarts):
            x0 = np.concatenate([rng.uniform(0, GAMMA_MAX, p), rng.uniform(0, BETA_MAX, p)])
            result = minimize(objective, x0=x0, method="COBYLA", options={"maxiter": cobyla_maxiter, "rhobeg": 0.6})
            best = max(best, -result.fun)
        best_values.append(best)
        approximation_ratios.append(best / optimal_size)

    return {
        "pValues": p_values,
        "optimalSize": optimal_size,
        "bestExpectedObjectiveValues": best_values,
        "approximationRatios": approximation_ratios,
    }
