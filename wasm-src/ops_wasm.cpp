#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <algorithm>

// ReLU operation
float relu(float x) {
    return x > 0.0f ? x : 0.0f;
}

// Softmax operation
std::vector<float> softmax(const std::vector<float>& input) {
    std::vector<float> result = input;
    
    // Find max for numerical stability
    float maxVal = *std::max_element(result.begin(), result.end());
    float sum = 0.0f;
    
    // Compute exp and sum
    for (auto& v : result) {
        v = std::exp(v - maxVal);
        sum += v;
    }
    
    // Normalize
    for (auto& v : result) {
        v /= sum;
    }
    
    return result;
}

EMSCRIPTEN_BINDINGS(ops) {
    emscripten::function("relu", &relu);
    emscripten::function("softmax", &softmax);
}
