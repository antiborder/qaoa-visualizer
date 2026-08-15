from dataclasses import dataclass


@dataclass(frozen=True)
class Edge:
    source: int
    target: int


# Bowtie graph: two triangles sharing node 2.
# Contains odd cycles (triangles), so no partition can cut every edge -
# this makes Max-Cut on it a genuinely non-trivial optimization target,
# unlike a bipartite graph where a trivial 100%-cut partition exists.
NODES = [0, 1, 2, 3, 4]
EDGES = [
    Edge(0, 1),
    Edge(1, 2),
    Edge(2, 0),
    Edge(2, 3),
    Edge(3, 4),
    Edge(4, 2),
]
