import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from scipy.optimize import minimize

from .graph import EDGES, NODES
from .maxcut import expected_cut_value
from .qaoa import expected_cut_at

GAMMA_MAX = 2 * np.pi
BETA_MAX = np.pi
SHIFT = np.pi / 2


def _clip(gamma: float, beta: float) -> tuple[float, float]:
    return float(np.clip(gamma, 0, GAMMA_MAX)), float(np.clip(beta, 0, BETA_MAX))


def run_cobyla(gamma0: float, beta0: float, maxiter: int = 40):
    trajectory = []

    def objective(x):
        g, b = _clip(x[0], x[1])
        value = expected_cut_at(g, b)
        trajectory.append({"gamma": g, "beta": b, "expectedCutValue": value})
        return -value

    minimize(
        objective,
        x0=[gamma0, beta0],
        method="COBYLA",
        options={"maxiter": maxiter, "rhobeg": 0.6},
    )
    return trajectory


def run_spsa(gamma0: float, beta0: float, iterations: int = 40, seed: int = 42):
    rng = np.random.default_rng(seed)
    theta = np.array([gamma0, beta0], dtype=float)
    trajectory = []
    a, c, big_a, alpha, gamma_decay = 0.6, 0.2, 0, 0.602, 0.101

    for k in range(1, iterations + 1):
        ak = a / (k + big_a) ** alpha
        ck = c / k**gamma_decay
        delta = rng.choice([-1.0, 1.0], size=2)

        g_plus, b_plus = _clip(*(theta + ck * delta))
        g_minus, b_minus = _clip(*(theta - ck * delta))
        y_plus = expected_cut_at(g_plus, b_plus)
        y_minus = expected_cut_at(g_minus, b_minus)

        # Ascent step since we're maximizing expected cut directly (no sign
        # flip needed). Clip theta itself, not just the eval points - an
        # unclipped accumulator can drift far outside [0,2pi]x[0,pi] and get
        # stuck reporting a boundary value for many iterations before the
        # small perturbations ck*delta bring it back in range.
        ghat = (y_plus - y_minus) / (2 * ck * delta)
        theta = np.array(_clip(*(theta + ak * ghat)))

        trajectory.append(
            {"gamma": theta[0], "beta": theta[1], "expectedCutValue": expected_cut_at(theta[0], theta[1])}
        )

    return trajectory


# Parameter-shift rule for a rotation gate exp(-i*angle/2 * P) with P^2=I:
# d/d(angle) <H> = [f(angle+pi/2) - f(angle-pi/2)] / 2.
# gamma drives 6 independent RZZ(2*gamma) gates (one per edge) and beta
# drives 5 independent RX(2*beta) gates (one per qubit); since the SAME
# scalar feeds multiple gates, the total derivative is the sum of each
# gate's individual shifted contribution (multivariable chain rule), each
# evaluated by shifting only that one gate's angle away from 2*gamma/2*beta.
def _expected_cut_shifted_edge(gamma: float, beta: float, edge_index: int, delta: float) -> float:
    n = len(NODES)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for idx, edge in enumerate(EDGES):
        angle = 2 * gamma + (delta if idx == edge_index else 0.0)
        qc.rzz(angle, edge.source, edge.target)
    qc.rx(2 * beta, range(n))
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(sv.probabilities_dict())


def _expected_cut_shifted_qubit(gamma: float, beta: float, qubit_index: int, delta: float) -> float:
    n = len(NODES)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for edge in EDGES:
        qc.rzz(2 * gamma, edge.source, edge.target)
    for q in range(n):
        angle = 2 * beta + (delta if q == qubit_index else 0.0)
        qc.rx(angle, q)
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(sv.probabilities_dict())


def parameter_shift_gradient(gamma: float, beta: float) -> tuple[float, float]:
    d_gamma = sum(
        _expected_cut_shifted_edge(gamma, beta, i, SHIFT)
        - _expected_cut_shifted_edge(gamma, beta, i, -SHIFT)
        for i in range(len(EDGES))
    )
    d_beta = sum(
        _expected_cut_shifted_qubit(gamma, beta, q, SHIFT)
        - _expected_cut_shifted_qubit(gamma, beta, q, -SHIFT)
        for q in range(len(NODES))
    )
    return d_gamma, d_beta


def run_gradient_ascent(gamma0: float, beta0: float, iterations: int = 25, lr: float = 0.03):
    gamma, beta = gamma0, beta0
    trajectory = []
    for _ in range(iterations):
        d_gamma, d_beta = parameter_shift_gradient(gamma, beta)
        gamma, beta = _clip(gamma + lr * d_gamma, beta + lr * d_beta)
        trajectory.append(
            {"gamma": gamma, "beta": beta, "expectedCutValue": expected_cut_at(gamma, beta)}
        )
    return trajectory
