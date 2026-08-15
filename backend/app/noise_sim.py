from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error

from .maxcut import cut_value_from_bitstring, expected_cut_value
from .qaoa import build_p1_circuit, expected_cut_at


def build_noise_model(single_qubit_error: float, two_qubit_error: float) -> NoiseModel:
    noise_model = NoiseModel()
    noise_model.add_all_qubit_quantum_error(depolarizing_error(single_qubit_error, 1), ["h", "rx"])
    noise_model.add_all_qubit_quantum_error(depolarizing_error(two_qubit_error, 2), ["rzz"])
    return noise_model


def run_noisy_p1(
    gamma: float,
    beta: float,
    single_qubit_error: float,
    two_qubit_error: float,
    shots: int = 4096,
):
    qc = build_p1_circuit(gamma, beta)
    qc.measure_all()

    noise_model = build_noise_model(single_qubit_error, two_qubit_error)
    simulator = AerSimulator(noise_model=noise_model)
    transpiled = transpile(qc, simulator)
    result = simulator.run(transpiled, shots=shots).result()
    counts = result.get_counts()

    # measure_all() adds its own classical register; Aer's count keys use
    # the same little-endian convention as Statevector.probabilities_dict().
    distribution = [
        {
            "bitstring": bitstring,
            "probability": count / shots,
            "cutValue": cut_value_from_bitstring(bitstring),
        }
        for bitstring, count in counts.items()
    ]
    distribution.sort(key=lambda entry: entry["bitstring"])

    probabilities = {bitstring: count / shots for bitstring, count in counts.items()}
    noisy_expected_cut = expected_cut_value(probabilities)
    ideal_expected_cut = expected_cut_at(gamma, beta)

    return {
        "gamma": gamma,
        "beta": beta,
        "idealExpectedCutValue": ideal_expected_cut,
        "noisyExpectedCutValue": noisy_expected_cut,
        "distribution": distribution,
    }
