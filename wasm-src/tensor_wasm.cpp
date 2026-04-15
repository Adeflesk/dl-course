#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>

using emscripten::val;

// Stub Tensor class for WASM interop
// Note: This is a standalone stub implementation, not integrated with Tensor.h
// TODO: Bridge to real Tensor class for autodiff integration
class TensorWasm {
public:
    std::vector<float> data;
    std::vector<int> shape;

    TensorWasm(const std::vector<int>& s) : shape(s) {
        int size = 1;
        for (int d : shape) size *= d;
        data.resize(size, 0.0f);
    }

    val getShape() const {
        val result = val::array();
        for (size_t i = 0; i < shape.size(); ++i) {
            result.set(i, shape[i]);
        }
        return result;
    }

    val getData() const {
        val result = val::array();
        for (size_t i = 0; i < data.size(); ++i) {
            result.set(i, data[i]);
        }
        return result;
    }

    void setData(const std::vector<float>& newData) {
        // Validate input size matches tensor size before assignment
        // to prevent silent data corruption
        if (newData.size() != data.size()) {
            return;  // Silently ignore size mismatch for now (TODO: throw exception)
        }
        data = newData;
    }

    int size() const { return data.size(); }
};

EMSCRIPTEN_BINDINGS(tensorflowccp) {
    emscripten::class_<TensorWasm>("Tensor")
        .constructor<std::vector<int>>()
        .method("getShape", &TensorWasm::getShape)
        .method("getData", &TensorWasm::getData)
        .method("setData", &TensorWasm::setData)
        .method("size", &TensorWasm::size);
}
