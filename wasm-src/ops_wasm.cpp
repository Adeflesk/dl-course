#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <algorithm>

// ReLU activation: max(0, x)
// Returns: x if x > 0, else 0
float relu(float x) {
    return x > 0.0f ? x : 0.0f;
}

// Softmax normalization: exp(x - max) / sum(exp(x - max))
// Uses numerically stable max-subtraction to prevent overflow.
// Input: logit vector (e.g., unnormalized log probabilities)
// Returns: probability distribution (all values in (0, 1], sum = 1)
std::vector<float> softmax(const std::vector<float>& input) {
    std::vector<float> result = input;

    // Find max for numerical stability: prevents exp overflow
    float maxVal = *std::max_element(result.begin(), result.end());
    float sum = 0.0f;

    // Compute exp(x - max) and accumulate sum
    for (auto& v : result) {
        v = std::exp(v - maxVal);
        sum += v;
    }

    // Normalize: divide by sum to get probability distribution
    for (auto& v : result) {
        v /= sum;
    }

    return result;
}

EMSCRIPTEN_BINDINGS(ops) {
    emscripten::function("relu", &relu);
    emscripten::function("softmax", &softmax);
}
