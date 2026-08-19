from dataclasses import dataclass


@dataclass(frozen=True)
class Edge:
    source: int
    target: int


@dataclass(frozen=True)
class Position:
    x: float
    y: float


@dataclass(frozen=True)
class Graph:
    id: str
    label: str
    nodes: list[int]
    edges: list[Edge]
    # Hand-placed layout rather than force-directed: every graph here is
    # small and fixed, and an explicit layout keeps each shape legible.
    positions: dict[int, Position]


# Bowtie graph: two triangles sharing node 2 (the original/default graph).
# Contains odd cycles (triangles), so no partition can cut every edge - this
# makes Max-Cut on it a genuinely non-trivial optimization target, unlike a
# bipartite graph where a trivial 100%-cut partition exists.
_BOWTIE = Graph(
    id="bowtie",
    label="bowtie（三角形2つ・5ノード）",
    nodes=[0, 1, 2, 3, 4],
    edges=[
        Edge(0, 1),
        Edge(1, 2),
        Edge(2, 0),
        Edge(2, 3),
        Edge(3, 4),
        Edge(4, 2),
    ],
    positions={
        0: Position(80, 80),
        1: Position(80, 220),
        2: Position(200, 150),
        3: Position(320, 80),
        4: Position(320, 220),
    },
)

# Triangle (K3): the simplest possible odd cycle - no partition can cut all
# 3 edges, so max cut is 2/3.
_TRIANGLE = Graph(
    id="triangle",
    label="triangle（三角形・3ノード）",
    nodes=[0, 1, 2],
    edges=[
        Edge(0, 1),
        Edge(1, 2),
        Edge(2, 0),
    ],
    positions={
        0: Position(200, 60),
        1: Position(320, 240),
        2: Position(80, 240),
    },
)

# Pentagon (C5): a single 5-cycle, also an odd cycle (unlike the bowtie's
# two triangles sharing a node) - a different non-bipartite topology.
_PENTAGON = Graph(
    id="pentagon",
    label="pentagon（5角形・5ノード）",
    nodes=[0, 1, 2, 3, 4],
    edges=[
        Edge(0, 1),
        Edge(1, 2),
        Edge(2, 3),
        Edge(3, 4),
        Edge(4, 0),
    ],
    positions={
        0: Position(200, 40),
        1: Position(305, 116),
        2: Position(265, 239),
        3: Position(135, 239),
        4: Position(95, 116),
    },
)

# K4: the complete graph on 4 nodes - every pair is connected, making it
# maximally "frustrated" (max cut is only 4 of 6 edges, via a 2-2 split).
_K4 = Graph(
    id="k4",
    label="K4（完全グラフ・4ノード）",
    nodes=[0, 1, 2, 3],
    edges=[
        Edge(0, 1),
        Edge(0, 2),
        Edge(0, 3),
        Edge(1, 2),
        Edge(1, 3),
        Edge(2, 3),
    ],
    positions={
        0: Position(120, 80),
        1: Position(280, 80),
        2: Position(280, 220),
        3: Position(120, 220),
    },
)

GRAPHS: dict[str, Graph] = {g.id: g for g in [_BOWTIE, _TRIANGLE, _PENTAGON, _K4]}
DEFAULT_GRAPH_ID = "bowtie"
