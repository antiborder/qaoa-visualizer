from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .graph import EDGES, NODES
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


@app.get("/api/graph")
def get_graph():
    return {
        "nodes": [{"id": n} for n in NODES],
        "edges": [{"source": e.source, "target": e.target} for e in EDGES],
    }


@app.get("/api/maxcut/optimal")
def get_optimal():
    best_value, best_partitions = brute_force_max_cut()
    return {
        "cutValue": best_value,
        "totalEdges": len(EDGES),
        "partitions": [
            [{"node": node, "group": group} for node, group in p.items()]
            for p in best_partitions
        ],
        "gwApproximationRatio": GW_APPROXIMATION_RATIO,
        "gwGuaranteedCutValue": round(GW_APPROXIMATION_RATIO * best_value, 3),
    }


@app.get("/api/qaoa/cost-only")
def get_cost_only(gamma: float):
    qc = build_cost_only_circuit(gamma)
    analysis = analyze_circuit(qc)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "cutValue": cut_value_from_bitstring(bitstring),
        }
        for bitstring, probability in analysis["probabilities"].items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "maxProbabilityDeviation": max_probability_deviation(analysis["probabilities"]),
        "distribution": distribution,
        "blochVectors": analysis["blochVectors"],
    }


@app.get("/api/qaoa/p1")
def get_p1(gamma: float, beta: float):
    qc = build_p1_circuit(gamma, beta)
    analysis = analyze_circuit(qc)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "cutValue": cut_value_from_bitstring(bitstring),
        }
        for bitstring, probability in analysis["probabilities"].items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "beta": beta,
        "expectedCutValue": expected_cut_value(analysis["probabilities"]),
        "distribution": distribution,
        "blochVectors": analysis["blochVectors"],
    }


@app.get("/api/qaoa/landscape")
def get_landscape():
    return compute_landscape()


OPTIMIZERS = {
    "cobyla": run_cobyla,
    "spsa": run_spsa,
    "gradient": run_gradient_ascent,
}


@app.get("/api/qaoa/optimize")
def get_optimize(method: str, gamma0: float, beta0: float):
    runner = OPTIMIZERS.get(method)
    if runner is None:
        raise HTTPException(status_code=400, detail=f"unknown method: {method}")
    trajectory = runner(gamma0, beta0)
    return {"method": method, "trajectory": trajectory}


@app.get("/api/qaoa/depth-scan")
def get_depth_scan():
    return compute_depth_scan(max_p=5, restarts=5, cobyla_maxiter=100, gradient_samples=40)


@app.get("/api/qaoa/noisy-p1")
def get_noisy_p1(gamma: float, beta: float, singleQubitError: float, twoQubitError: float):
    return run_noisy_p1(gamma, beta, singleQubitError, twoQubitError)


@app.get("/api/mis/optimal")
def get_mis_optimal():
    best_size, best_selections = brute_force_mis()
    return {
        "size": best_size,
        "selections": [
            [{"node": node, "selected": selected} for node, selected in s.items()]
            for s in best_selections
        ],
    }


@app.get("/api/mis/p1")
def get_mis_p1(gamma: float, beta: float):
    probabilities = analyze_mis_p1(gamma, beta)
    distribution = [
        {
            "bitstring": bitstring,
            "probability": probability,
            "objectiveValue": objective_from_bitstring(bitstring),
        }
        for bitstring, probability in probabilities.items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])
    return {
        "gamma": gamma,
        "beta": beta,
        "expectedObjectiveValue": expected_objective_value(probabilities),
        "distribution": distribution,
    }


@app.get("/api/mis/depth-scan")
def get_mis_depth_scan():
    return compute_mis_depth_scan(max_p=4, restarts=12, cobyla_maxiter=120)
