from itertools import product

from .graph import Graph

# QUBO penalty weight for including both endpoints of an edge. Any A > 1 is
# enough to make violating an edge always worse than the +1 gained from
# including an extra node (for this unweighted graph), so the unconstrained
# optimum of "size - PENALTY_A * violations" coincides with the true MIS.
PENALTY_A = 2.0


def is_independent(graph: Graph, selection: dict[int, int]) -> bool:
    return all(not (selection[e.source] and selection[e.target]) for e in graph.edges)


def set_size(selection: dict[int, int]) -> int:
    return sum(selection.values())


def brute_force_mis(graph: Graph):
    n = len(graph.nodes)
    best_size = -1
    best_selections: list[dict[int, int]] = []

    for bits in product([0, 1], repeat=n):
        selection = dict(zip(graph.nodes, bits))
        if not is_independent(graph, selection):
            continue
        size = set_size(selection)
        if size > best_size:
            best_size = size
            best_selections = [selection]
        elif size == best_size:
            best_selections.append(selection)

    return best_size, best_selections


def violation_count(graph: Graph, selection: dict[int, int]) -> int:
    return sum(1 for e in graph.edges if selection[e.source] and selection[e.target])


def objective_from_bitstring(graph: Graph, bitstring: str) -> float:
    n = len(graph.nodes)
    # Same little-endian convention as maxcut.cut_value_from_bitstring.
    selection = {graph.nodes[i]: int(bitstring[n - 1 - i]) for i in range(n)}
    return set_size(selection) - PENALTY_A * violation_count(graph, selection)


def expected_objective_value(graph: Graph, probabilities: dict[str, float]) -> float:
    return sum(p * objective_from_bitstring(graph, bits) for bits, p in probabilities.items())
