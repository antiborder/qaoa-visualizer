from io import BytesIO

import matplotlib

matplotlib.use("Agg")  # headless rendering - no display server in a FastAPI process
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit
from qiskit.circuit import Parameter

from .graph import Graph
from .mis_qaoa import PENALTY_A, _z_coefficient

# These build circuits with symbolic Qiskit Parameters (gamma/beta as
# Greek-letter labels, not bound numbers) purely for rendering a diagram -
# separate from qaoa.py/mis_qaoa.py's build_*_circuit functions, which take
# concrete float angles for actual statevector simulation. Topology (which
# qubits/edges get gates) still comes from the real Graph, so the diagram
# reflects whichever graph the user has selected.


def build_cost_only_diagram(graph: Graph) -> QuantumCircuit:
    n = len(graph.nodes)
    gamma = Parameter("γ")
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for edge in graph.edges:
        qc.rzz(2 * gamma, edge.source, edge.target)
    return qc


def build_p1_diagram(graph: Graph) -> QuantumCircuit:
    n = len(graph.nodes)
    gamma = Parameter("γ")
    beta = Parameter("β")
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for edge in graph.edges:
        qc.rzz(2 * gamma, edge.source, edge.target)
    qc.rx(2 * beta, range(n))
    return qc


def build_p_layers_diagram(graph: Graph) -> QuantumCircuit:
    n = len(graph.nodes)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for layer in (1, 2):
        gamma = Parameter(f"γ_{layer}")
        beta = Parameter(f"β_{layer}")
        for edge in graph.edges:
            qc.rzz(2 * gamma, edge.source, edge.target)
        qc.rx(2 * beta, range(n))
        if layer == 1:
            qc.barrier()
    return qc


def build_mis_p1_diagram(graph: Graph) -> QuantumCircuit:
    n = len(graph.nodes)
    gamma = Parameter("γ")
    beta = Parameter("β")
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for i, node in enumerate(graph.nodes):
        qc.rz(2 * gamma * _z_coefficient(graph, node), i)
    for edge in graph.edges:
        qc.rzz(gamma * PENALTY_A / 2, edge.source, edge.target)
    qc.rx(2 * beta, range(n))
    return qc


DIAGRAM_BUILDERS = {
    "cost_only": build_cost_only_diagram,
    "p1": build_p1_diagram,
    "p_layers": build_p_layers_diagram,
    "mis_p1": build_mis_p1_diagram,
}


def render_circuit_png(graph: Graph, kind: str) -> bytes:
    builder = DIAGRAM_BUILDERS[kind]
    qc = builder(graph)
    # fold=-1: never wrap onto a second row - the frontend already wraps
    # circuit images in a horizontally-scrolling container for this reason.
    fig = qc.draw(output="mpl", style="bw", fold=-1)
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    plt.close(fig)
    return buf.getvalue()
