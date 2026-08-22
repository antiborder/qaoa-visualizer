from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .circuit_diagram import DIAGRAM_BUILDERS, render_circuit_png
from .graph import DEFAULT_GRAPH_ID, GRAPHS, Graph
from .maxcut import (
    GW_APPROXIMATION_RATIO,
    brute_force_max_cut,
    cut_value_from_bitstring,
    expected_cut_value,
)
from .depth_scan import compute_depth_scan
from .mis import brute_force_mis, expected_objective_value, objective_from_bitstring
from .mis_qaoa import analyze_mis_p1, compute_mis_depth_scan
from .noise_sim import run_noisy_p1
from .optimize import run_cobyla, run_gradient_ascent, run_spsa
from .qaoa import (
    analyze_circuit,
    build_cost_only_circuit,
    build_p1_circuit,
    compute_landscape,
    expected_cut_at_general,
    max_probability_deviation,
)

app = FastAPI(title="QAOA Visualizer API")

app.add_middleware(
    CORSMiddleware,
    # Vite picks the next free port when 5173 is taken (as it is here by
    # other quantum-trials projects' dev servers), so match any localhost
    # port instead of hardcoding one.
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_graph(graphId: str = DEFAULT_GRAPH_ID) -> Graph:
    graph = GRAPHS.get(graphId)
    if graph is None:
        raise HTTPException(status_code=400, detail=f"unknown graphId: {graphId}")
    return graph


@app.get("/api/graphs")
def list_graphs():
    return [
        {
            "id": g.id,
            "label": g.label,
            "nodes": [{"id": n, "x": g.positions[n].x, "y": g.positions[n].y} for n in g.nodes],
            "edges": [{"source": e.source, "target": e.target} for e in g.edges],
        }
        for g in GRAPHS.values()
    ]


@app.get("/api/graph")
def get_graph(graph: Graph = Depends(_resolve_graph)):
    return {
        "id": graph.id,
        "nodes": [
            {"id": n, "x": graph.positions[n].x, "y": graph.positions[n].y} for n in graph.nodes
        ],
        "edges": [{"source": e.source, "target": e.target} for e in graph.edges],
    }


@app.get("/api/maxcut/optimal")
def get_optimal(graph: Graph = Depends(_resolve_graph)):
    best_value, best_partitions = brute_force_max_cut(graph)
    return {
        "cutValue": best_value,
        "totalEdges": len(graph.edges),
        "partitions": [
            [{"node": node, "group": group} for node, group in p.items()]
            for p in best_partitions
        ],
        "gwApproximationRatio": GW_APPROXIMATION_RATIO,
        "gwGuaranteedCutValue": round(GW_APPROXIMATION_RATIO * best_value, 3),
    }


@app.get("/api/qaoa/cost-only")
def get_cost_only(gamma: float, graph: Graph = Depends(_resolve_graph)):
    qc = build_cost_only_circuit(graph, gamma)
    analysis = analyze_circuit(graph, qc)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "cutValue": cut_value_from_bitstring(graph, bitstring),
        }
        for bitstring, probability in analysis["probabilities"].items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "maxProbabilityDeviation": max_probability_deviation(graph, analysis["probabilities"]),
        "distribution": distribution,
        "blochVectors": analysis["blochVectors"],
    }


@app.get("/api/qaoa/p1")
def get_p1(gamma: float, beta: float, graph: Graph = Depends(_resolve_graph)):
    qc = build_p1_circuit(graph, gamma, beta)
    analysis = analyze_circuit(graph, qc)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "cutValue": cut_value_from_bitstring(graph, bitstring),
        }
        for bitstring, probability in analysis["probabilities"].items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "beta": beta,
        "expectedCutValue": expected_cut_value(graph, analysis["probabilities"]),
        "distribution": distribution,
        "blochVectors": analysis["blochVectors"],
    }


@app.get("/api/qaoa/landscape")
def get_landscape(graph: Graph = Depends(_resolve_graph)):
    return compute_landscape(graph)


@app.get("/api/qaoa/layer-landscape")
def get_layer_landscape(gamma1: float, beta1: float, graph: Graph = Depends(_resolve_graph)):
    # p=2 landscape for the SECOND layer's (gamma2, beta2), holding the first
    # layer's (gamma1, beta1) fixed - a coarser grid than the p=1 landscape
    # since this recomputes on every slider drag.
    landscape = compute_landscape(
        graph, gamma_steps=40, beta_steps=40, prefix_gammas=[gamma1], prefix_betas=[beta1]
    )
    one_layer_value = expected_cut_at_general(graph, [gamma1], [beta1])
    return {**landscape, "oneLayerValue": one_layer_value}


@app.get("/api/qaoa/two-layer-point")
def get_two_layer_point(
    gamma1: float,
    beta1: float,
    gamma2: float,
    beta2: float,
    graph: Graph = Depends(_resolve_graph),
):
    # Exact expected cut for one specific 2-layer (gamma1,beta1,gamma2,beta2)
    # point, for a slider-driven single-point readout (as opposed to the
    # whole layer-landscape grid).
    return {
        "expectedCutValue": expected_cut_at_general(graph, [gamma1, gamma2], [beta1, beta2])
    }


OPTIMIZERS = {
    "cobyla": run_cobyla,
    "spsa": run_spsa,
    "gradient": run_gradient_ascent,
}


@app.get("/api/qaoa/optimize")
def get_optimize(method: str, gamma0: float, beta0: float, graph: Graph = Depends(_resolve_graph)):
    runner = OPTIMIZERS.get(method)
    if runner is None:
        raise HTTPException(status_code=400, detail=f"unknown method: {method}")
    trajectory = runner(graph, gamma0, beta0)
    return {"method": method, "trajectory": trajectory}


@app.get("/api/qaoa/depth-scan")
def get_depth_scan(graph: Graph = Depends(_resolve_graph)):
    return compute_depth_scan(graph, max_p=5, restarts=5, cobyla_maxiter=100, gradient_samples=40)


@app.get("/api/qaoa/noisy-p1")
def get_noisy_p1(
    gamma: float,
    beta: float,
    singleQubitError: float,
    twoQubitError: float,
    graph: Graph = Depends(_resolve_graph),
):
    return run_noisy_p1(graph, gamma, beta, singleQubitError, twoQubitError)


@app.get("/api/mis/optimal")
def get_mis_optimal(graph: Graph = Depends(_resolve_graph)):
    best_size, best_selections = brute_force_mis(graph)
    return {
        "size": best_size,
        "selections": [
            [{"node": node, "selected": selected} for node, selected in s.items()]
            for s in best_selections
        ],
    }


@app.get("/api/mis/p1")
def get_mis_p1(gamma: float, beta: float, graph: Graph = Depends(_resolve_graph)):
    probabilities = analyze_mis_p1(graph, gamma, beta)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "objectiveValue": objective_from_bitstring(graph, bitstring),
        }
        for bitstring, probability in probabilities.items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "beta": beta,
        "expectedObjectiveValue": expected_objective_value(graph, probabilities),
        "distribution": distribution,
    }


@app.get("/api/mis/depth-scan")
def get_mis_depth_scan(graph: Graph = Depends(_resolve_graph)):
    return compute_mis_depth_scan(graph, max_p=4, restarts=12, cobyla_maxiter=120)


@app.get("/api/circuit-diagram")
def get_circuit_diagram(kind: str, graph: Graph = Depends(_resolve_graph)):
    if kind not in DIAGRAM_BUILDERS:
        raise HTTPException(status_code=400, detail=f"unknown diagram kind: {kind}")
    png_bytes = render_circuit_png(graph, kind)
    return Response(content=png_bytes, media_type="image/png")
