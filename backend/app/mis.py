from itertools import product

from .graph import EDGES, NODES

# QUBO penalty weight for including both endpoints of an edge. Any A > 1 is
# enough to make violating an edge always worse than the +1 gained from
# including an extra node (for this unweighted graph), so the unconstrained
# optimum of "size - PENALTY_A * violations" coincides with the true MIS.
PENALTY_A = 2.0


def is_independent(selection: dict[int, int]) -> bool:
    return all(not (selection[e.source] and selection[e.target]) for e in EDGES)


def set_size(selection: dict[int, int]) -> int:
    return sum(selection.values())


def brute_force_mis():
    n = len(NODES)
    best_size = -1
    best_selections: list[dict[int, int]] = []

    for bits in product([0, 1], repeat=n):
        selection = dict(zip(NODES, bits))
        if not is_independent(selection):
            continue
        size = set_size(selection)
        if size > best_size:
            best_size = size
            best_selections = [selection]
        elif size == best_size:
            best_selections.append(selection)

    return best_size, best_selections


def violation_count(selection: dict[int, int]) -> int:
    return sum(1 for e in EDGES if selection[e.source] and selection[e.target])


def objective_from_bitstring(bitstring: str) -> float:
    n = len(NODES)
    # Same little-endian convention as maxcut.cut_value_from_bitstring.
    selection = {NODES[i]: int(bitstring[n - 1 - i]) for i in range(n)}
    return set_size(selection) - PENALTY_A * violation_count(selection)


def expected_objective_value(probabilities: dict[str, float]) -> float:
    return sum(p * objective_from_bitstring(bits) for bits, p in probabilities.items())
