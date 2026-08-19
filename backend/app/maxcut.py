from itertools import product

from .graph import Graph

# Goemans-Williamson (1995) worst-case approximation guarantee for Max-Cut:
# the SDP-rounding algorithm's expected cut is always >= 0.878 * optimal cut.
# We surface this as a reference bound rather than solving the SDP for this
# instance - the instance is small enough that brute force gives the exact
# optimum directly, which is a stronger result than any approximation.
GW_APPROXIMATION_RATIO = 0.878


def cut_value(graph: Graph, partition: dict[int, int]) -> int:
    return sum(1 for e in graph.edges if partition[e.source] != partition[e.target])


def cut_value_from_bitstring(graph: Graph, bitstring: str) -> int:
    n = len(graph.nodes)
    # Qiskit statevector keys are little-endian: the leftmost character is
    # the highest-index qubit, the rightmost is qubit 0.
    partition = {graph.nodes[i]: int(bitstring[n - 1 - i]) for i in range(n)}
    return cut_value(graph, partition)


def expected_cut_value(graph: Graph, probabilities: dict[str, float]) -> float:
    return sum(p * cut_value_from_bitstring(graph, bits) for bits, p in probabilities.items())


def brute_force_max_cut(graph: Graph):
    n = len(graph.nodes)
    best_value = -1
    best_partitions: list[dict[int, int]] = []

    # Fix nodes[0] to group 0: flipping every bit yields the same cut,
    # so this halves the search space without losing any distinct solution.
    for bits in product([0, 1], repeat=n - 1):
        partition = {graph.nodes[0]: 0, **dict(zip(graph.nodes[1:], bits))}
        value = cut_value(graph, partition)
        if value > best_value:
            best_value = value
            best_partitions = [partition]
        elif value == best_value:
            best_partitions.append(partition)

    return best_value, best_partitions
