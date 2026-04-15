#include <emscripten/bind.h>
#include <vector>

using emscripten::val;

// Stub: Neural network modules will be bound here as we build demos
// For now, placeholder for Linear layer computation

// Placeholder: Linear layer computation
std::vector<float> linearForward(
    const std::vector<float>& input,
    const std::vector<float>& weights,
    const std::vector<float>& bias,
    int inputSize,
    int outputSize
) {
    std::vector<float> output(outputSize, 0.0f);

    // Simple matrix multiplication: output = input @ weights + bias
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
