#include <emscripten/bind.h>
#include <vector>

// Linear layer forward pass
// Preconditions:
//   input.size() == inputSize (feature vector)
//   weights.size() == inputSize * outputSize (row-major layout: weight[i][j] = weights[i * inputSize + j])
//   bias.size() == outputSize (per-output bias)
// Computation: output[i] = sum(input[j] * weights[i * inputSize + j]) + bias[i]
// Returns: output vector of size outputSize
std::vector<float> linearForward(
    const std::vector<float>& input,
    const std::vector<float>& weights,
    const std::vector<float>& bias,
    int inputSize,
    int outputSize
) {
    // Validate input dimensions to prevent buffer overruns
    if ((int)input.size() != inputSize ||
        (int)weights.size() != inputSize * outputSize ||
        (int)bias.size() != outputSize) {
        return std::vector<float>(outputSize, 0.0f);  // Return zeros on size mismatch
    }

    std::vector<float> output(outputSize, 0.0f);

    // Matrix multiplication: output = input @ weights + bias
    // weights stored in row-major: weight[i][j] = weights[i * inputSize + j]
    for (int i = 0; i < outputSize; ++i) {
        output[i] = bias[i];
        for (int j = 0; j < inputSize; ++j) {
            output[i] += input[j] * weights[i * inputSize + j];
        }
    }

    return output;
}

EMSCRIPTEN_BINDINGS(modules) {
    emscripten::function("linearForward", &linearForward);
}
