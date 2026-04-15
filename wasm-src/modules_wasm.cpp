#include <emscripten/bind.h>
#include <vector>

// Linear layer forward pass
std::vector<float> linearForward(
    const std::vector<float>& input,
    const std::vector<float>& weights,
    const std::vector<float>& bias,
    int inputSize,
    int outputSize
) {
    std::vector<float> output(outputSize, 0.0f);
    
    // Matrix multiplication: output = input @ weights + bias
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
