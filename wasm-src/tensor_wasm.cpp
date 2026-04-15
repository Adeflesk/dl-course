#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>

// Stub: This will expose Tensor operations to JavaScript
// For now, just a minimal binding that compiles. Full Tensor integration comes later.

class TensorWasm {
public:
    std::vector<float> data;
    std::vector<int> shape;

    TensorWasm(const std::vector<int>& s) : shape(s) {
        int size = 1;
        for (int d : shape) size *= d;
        data.resize(size, 0.0f);
    }

    // Basic API that JS will call
    emscripten::val getShape() const {
        emscripten::val result = emscripten::val::array();
        for (size_t i = 0; i < shape.size(); ++i) {
            result.set(i, shape[i]);
        }
        return result;
    }

    emscripten::val getData() const {
        emscripten::val result = emscripten::val::array();
        for (size_t i = 0; i < data.size(); ++i) {
            result.set(i, data[i]);
        }
        return result;
    }

    void setData(const std::vector<float>& newData) {
        data = newData;
    }

    int size() const { return data.size(); }
};

// Bindings to JavaScript
EMSCRIPTEN_BINDINGS(tensorflowccp) {
    emscripten::class_<TensorWasm>("Tensor")
        .constructor<std::vector<int>>()
        .function("getShape", &TensorWasm::getShape)
        .function("getData", &TensorWasm::getData)
        .function("setData", &TensorWasm::setData)
        .function("size", &TensorWasm::size);
}
