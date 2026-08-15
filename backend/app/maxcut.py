from itertools import product

from .graph import EDGES, NODES

# Goemans-Williamson (1995) worst-case approximation guarantee for Max-Cut:
# the SDP-rounding algorithm's expected cut is always >= 0.878 * optimal cut.
# We surface this as a reference bound rather than solving the SDP for this
# instance - the instance is small enough that brute force gives the exact
# optimum directly, which is a stronger result than any approximation.
GW_APPROXIMATION_RATIO = 0.878


def cut_value(partition: dict[int, int]) -> int:
    return sum(1 for e in EDGES if partition[e.source] != partition[e.target])


def cut_value_from_bitstring(bitstring: str) -> int:
    n = len(NODES)
    # Qiskit statevector keys are little-endian: the leftmost character is
    # the highest-index qubit, the rightmost is qubit 0.
    partition = {NODES[i]: int(bitstring[n - 1 - i]) for i in range(n)}
    return cut_value(partition)


def expected_cut_value(probabilities: dict[str, float]) -> float:
    return sum(p * cut_value_from_bitstring(bits) for bits, p in probabilities.items())


def brute_force_max_cut():
    n = len(NODES)
    best_value = -1
    best_partitions: list[dict[int, int]] = []

    # Fix NODES[0] to group 0: flipping every bit yields the same cut,
    # so this halves the search space without losing any distinct solution.
    for bits in product([0, 1], repeat=n - 1):
        partition = {NODES[0]: 0, **dict(zip(NODES[1:], bits))}
        value = cut_value(partition)
        if value > best_value:
            best_value = value
            best_partitions = [partition]
        elif value == best_value:
            best_partitions.append(partition)

    return best_value, best_partitions
