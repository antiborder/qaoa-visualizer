import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Pauli, Statevector, partial_trace

from .graph import Graph
from .maxcut import expected_cut_value

# Cost Hamiltonian convention used throughout this app: H_C = sum_{(i,j) in E} Z_i Z_j.
# A cut edge has Z_i != Z_j so Z_i*Z_j = -1; an uncut edge contributes +1.
# Maximizing the cut is therefore equivalent to MINIMIZING <H_C>.
# Cost unitary: U_C(gamma) = exp(-i*gamma*H_C) = product over edges of exp(-i*gamma*Z_i*Z_j),
# and RZZGate(theta) = exp(-i*theta/2 * Z_i*Z_j), so each edge gets RZZ(2*gamma).
#
# Mixer Hamiltonian: H_B = sum_i X_i.
# Mixer unitary: U_B(beta) = exp(-i*beta*H_B) = product over qubits of RX(2*beta),
# since RXGate(theta) = exp(-i*theta/2 * X).


def build_cost_only_circuit(graph: Graph, gamma: float) -> QuantumCircuit:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for edge in graph.edges:
        qc.rzz(2 * gamma, edge.source, edge.target)
    return qc


def build_p1_circuit(graph: Graph, gamma: float, beta: float) -> QuantumCircuit:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for edge in graph.edges:
        qc.rzz(2 * gamma, edge.source, edge.target)
    qc.rx(2 * beta, range(n))
    return qc


def build_qaoa_circuit(graph: Graph, gammas: list[float], betas: list[float]) -> QuantumCircuit:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for gamma, beta in zip(gammas, betas):
        for edge in graph.edges:
            qc.rzz(2 * gamma, edge.source, edge.target)
        qc.rx(2 * beta, range(n))
    return qc


def expected_cut_at_general(graph: Graph, gammas: list[float], betas: list[float]) -> float:
    qc = build_qaoa_circuit(graph, gammas, betas)
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(graph, sv.probabilities_dict())


def analyze_circuit(graph: Graph, qc: QuantumCircuit):
    n = len(graph.nodes)
    sv = Statevector.from_instruction(qc)

    probabilities = sv.probabilities_dict()

    bloch_vectors = []
    for qubit in range(n):
        traced_out = [q for q in range(n) if q != qubit]
        rho: DensityMatrix = partial_trace(sv, traced_out)
        x = float(np.real(rho.expectation_value(Pauli("X"))))
        y = float(np.real(rho.expectation_value(Pauli("Y"))))
        z = float(np.real(rho.expectation_value(Pauli("Z"))))
        bloch_vectors.append({"node": graph.nodes[qubit], "x": x, "y": y, "z": z})

    return {
        "probabilities": probabilities,
        "blochVectors": bloch_vectors,
    }


def max_probability_deviation(graph: Graph, probabilities: dict[str, float]) -> float:
    n = len(graph.nodes)
    uniform = 1 / (2**n)
    return max(abs(p - uniform) for p in probabilities.values())


def expected_cut_at(graph: Graph, gamma: float, beta: float) -> float:
    qc = build_p1_circuit(graph, gamma, beta)
    sv = Statevector.from_instruction(qc)
    return expected_cut_value(graph, sv.probabilities_dict())


def compute_landscape(
    graph: Graph,
    gamma_steps: int = 80,
    beta_steps: int = 80,
    prefix_gammas: list[float] = (),
    prefix_betas: list[float] = (),
):
    # prefix_gammas/prefix_betas hold earlier layers' angles fixed, so the
    # grid sweeps only the NEXT layer's (gamma, beta) - e.g. with one prefix
    # pair given, this is the p=2 landscape for layer 2 given a fixed layer 1.
    # Empty prefixes (the default) reduce exactly to the plain p=1 landscape.
    gamma_values = np.linspace(0, 2 * np.pi, gamma_steps)
    beta_values = np.linspace(0, np.pi, beta_steps)

    grid = np.zeros((gamma_steps, beta_steps))
    for i, g in enumerate(gamma_values):
        for j, b in enumerate(beta_values):
            grid[i, j] = expected_cut_at_general(
                graph, [*prefix_gammas, g], [*prefix_betas, b]
            )

    # Gradient of the expected-cut surface w.r.t. (gamma, beta), via central
    # finite differences on the same grid - this is what a gradient-based
    # optimizer would follow to climb toward better parameters.
    d_gamma, d_beta = np.gradient(grid, gamma_values, beta_values)

    # Subsample for arrow-field display: a 40x40 grid of arrows would be
    # visual noise, so plot the gradient on a coarser lattice.
    stride = max(1, gamma_steps // 10)
    gradient_field = [
        {
            "gamma": float(gamma_values[i]),
            "beta": float(beta_values[j]),
            "dGamma": float(d_gamma[i, j]),
            "dBeta": float(d_beta[i, j]),
            "expectedCutValue": float(grid[i, j]),
        }
        for i in range(0, gamma_steps, stride)
        for j in range(0, beta_steps, stride)
    ]

    best_index = np.unravel_index(np.argmax(grid), grid.shape)
    best_on_grid = {
        "gamma": float(gamma_values[best_index[0]]),
        "beta": float(beta_values[best_index[1]]),
        "expectedCutValue": float(grid[best_index]),
    }

    return {
        "gammaValues": gamma_values.tolist(),
        "betaValues": beta_values.tolist(),
        "expectedCutValues": grid.tolist(),
        "gradientField": gradient_field,
        "bestOnGrid": best_on_grid,
    }
