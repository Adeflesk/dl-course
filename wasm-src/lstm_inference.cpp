#include <emscripten/bind.h>
#include <vector>
#include <cmath>
#include <random>
#include <algorithm>
#include <numeric>

// Pure C++ LSTM inference (no autodiff, no shared_ptr)
class LSTMInference {
private:
    int input_size, hidden_size, vocab_size;

    // LSTM weight matrices (forget/input/cell/output gates)
    std::vector<float> W_if, W_hf, b_f;  // forget gate
    std::vector<float> W_ii, W_hi, b_i;  // input gate
    std::vector<float> W_ic, W_hc, b_c;  // cell candidate
    std::vector<float> W_io, W_ho, b_o;  // output gate
    std::vector<float> W_emb;            // embedding [vocab_size, input_size]
    std::vector<float> W_out, b_out;     // output projection [hidden_size, vocab_size]

    // Helper: sigmoid activation
    static float sigmoid(float x) {
        return 1.0f / (1.0f + std::exp(-x));
    }

    // Helper: tanh activation
    static float tanh_act(float x) {
        return std::tanh(x);
    }

    // Helper: softmax with temperature
    static std::vector<float> softmax(const std::vector<float>& logits, float temperature = 1.0f) {
        std::vector<float> result = logits;
        float maxVal = *std::max_element(result.begin(), result.end());
        float sum = 0.0f;

        for (auto& v : result) {
            v = std::exp((v - maxVal) / temperature);
            sum += v;
        }

        for (auto& v : result) {
            v /= sum;
        }
        return result;
    }

    // Matrix-vector product: output[i] = sum_j(input[j] * weights[i*input_size + j]) + bias[i]
    static std::vector<float> matmul_add_bias(
        const std::vector<float>& input,
        const std::vector<float>& weights,
        const std::vector<float>& bias,
        int input_size, int output_size) {

        std::vector<float> output(output_size);
        for (int i = 0; i < output_size; ++i) {
            output[i] = bias[i];
            for (int j = 0; j < input_size; ++j) {
                output[i] += input[j] * weights[i * input_size + j];
            }
        }
        return output;
    }

    // Element-wise product
    static std::vector<float> elemwise_mul(const std::vector<float>& a, const std::vector<float>& b) {
        std::vector<float> result(a.size());
        for (size_t i = 0; i < a.size(); ++i) {
            result[i] = a[i] * b[i];
        }
        return result;
    }

    // Element-wise addition
    static std::vector<float> elemwise_add(const std::vector<float>& a, const std::vector<float>& b) {
        std::vector<float> result(a.size());
        for (size_t i = 0; i < a.size(); ++i) {
            result[i] = a[i] + b[i];
        }
        return result;
    }

public:
    LSTMInference(int input_size, int hidden_size, int vocab_size)
        : input_size(input_size), hidden_size(hidden_size), vocab_size(vocab_size) {
        // Initialize weight matrices with correct sizes
        W_if.resize(input_size * hidden_size);
        W_hf.resize(hidden_size * hidden_size);
        b_f.resize(hidden_size);

        W_ii.resize(input_size * hidden_size);
        W_hi.resize(hidden_size * hidden_size);
        b_i.resize(hidden_size);

        W_ic.resize(input_size * hidden_size);
        W_hc.resize(hidden_size * hidden_size);
        b_c.resize(hidden_size);

        W_io.resize(input_size * hidden_size);
        W_ho.resize(hidden_size * hidden_size);
        b_o.resize(hidden_size);

        W_emb.resize(vocab_size * input_size);
        W_out.resize(hidden_size * vocab_size);
        b_out.resize(vocab_size);
    }

    // Load weights from a flat array (from WASM binary weight file)
    void loadWeights(const std::vector<float>& flat_weights) {
        size_t offset = 0;

        // Copy each weight matrix in order (must match training save order)
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_emb.size(), W_emb.begin());
        offset += W_emb.size();

        // LSTM weights (in order: forget, input, cell, output)
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_if.size(), W_if.begin());
        offset += W_if.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_hf.size(), W_hf.begin());
        offset += W_hf.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_f.size(), b_f.begin());
        offset += b_f.size();

        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_ii.size(), W_ii.begin());
        offset += W_ii.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_hi.size(), W_hi.begin());
        offset += W_hi.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_i.size(), b_i.begin());
        offset += b_i.size();

        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_ic.size(), W_ic.begin());
        offset += W_ic.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_hc.size(), W_hc.begin());
        offset += W_hc.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_c.size(), b_c.begin());
        offset += b_c.size();

        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_io.size(), W_io.begin());
        offset += W_io.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_ho.size(), W_ho.begin());
        offset += W_ho.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_o.size(), b_o.begin());
        offset += b_o.size();

        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_out.size(), W_out.begin());
        offset += W_out.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_out.size(), b_out.begin());
    }

    // Forward pass for one LSTM step
    // Returns logits [vocab_size]
    std::vector<float> forwardStep(int token, const std::vector<float>& h, const std::vector<float>& c) {
        // Embed token
        std::vector<float> x(input_size, 0.0f);
        if (token >= 0 && token < vocab_size) {
            std::copy(W_emb.begin() + token * input_size,
                      W_emb.begin() + (token + 1) * input_size,
                      x.begin());
        }

        // LSTM gates
        auto f_xW = matmul_add_bias(x, W_if, std::vector<float>(hidden_size, 0.0f), input_size, hidden_size);
        auto f_hW = matmul_add_bias(h, W_hf, std::vector<float>(hidden_size, 0.0f), hidden_size, hidden_size);
        auto f_pre = elemwise_add(f_xW, f_hW);
        for (auto& v : f_pre) v += b_f[(&v - &f_pre[0])];
        auto f_gate = f_pre;
        for (auto& v : f_gate) v = sigmoid(v);

        auto i_xW = matmul_add_bias(x, W_ii, std::vector<float>(hidden_size, 0.0f), input_size, hidden_size);
        auto i_hW = matmul_add_bias(h, W_hi, std::vector<float>(hidden_size, 0.0f), hidden_size, hidden_size);
        auto i_pre = elemwise_add(i_xW, i_hW);
        for (int j = 0; j < hidden_size; ++j) i_pre[j] += b_i[j];
        auto i_gate = i_pre;
        for (auto& v : i_gate) v = sigmoid(v);

        auto c_xW = matmul_add_bias(x, W_ic, std::vector<float>(hidden_size, 0.0f), input_size, hidden_size);
        auto c_hW = matmul_add_bias(h, W_hc, std::vector<float>(hidden_size, 0.0f), hidden_size, hidden_size);
        auto c_pre = elemwise_add(c_xW, c_hW);
        for (int j = 0; j < hidden_size; ++j) c_pre[j] += b_c[j];
        auto c_cand = c_pre;
        for (auto& v : c_cand) v = tanh_act(v);

        auto o_xW = matmul_add_bias(x, W_io, std::vector<float>(hidden_size, 0.0f), input_size, hidden_size);
        auto o_hW = matmul_add_bias(h, W_ho, std::vector<float>(hidden_size, 0.0f), hidden_size, hidden_size);
        auto o_pre = elemwise_add(o_xW, o_hW);
        for (int j = 0; j < hidden_size; ++j) o_pre[j] += b_o[j];
        auto o_gate = o_pre;
        for (auto& v : o_gate) v = sigmoid(v);

        // Cell state and hidden state
        auto fc = elemwise_mul(f_gate, c);
        auto ic = elemwise_mul(i_gate, c_cand);
        auto c_new = elemwise_add(fc, ic);
        auto c_tanh = c_new;
        for (auto& v : c_tanh) v = tanh_act(v);
        auto h_new = elemwise_mul(o_gate, c_tanh);

        // Output projection
        auto logits = matmul_add_bias(h_new, W_out, b_out, hidden_size, vocab_size);

        return logits;
    }

    // Generate text greedily
    std::vector<int> generateGreedy(const std::vector<int>& seed_tokens, int max_new) {
        std::vector<int> result = seed_tokens;
        std::vector<float> h(hidden_size, 0.0f);
        std::vector<float> c(hidden_size, 0.0f);

        for (int i : seed_tokens) {
            auto logits = forwardStep(i, h, c);
        }

        for (int i = 0; i < max_new; ++i) {
            int last_token = result.back();
            auto logits = forwardStep(last_token, h, c);
            int next_token = std::max_element(logits.begin(), logits.end()) - logits.begin();
            result.push_back(next_token);
        }

        return result;
    }

    // Generate text with temperature sampling
    std::vector<int> generateSample(const std::vector<int>& seed_tokens, int max_new, float temperature) {
        std::vector<int> result = seed_tokens;
        std::vector<float> h(hidden_size, 0.0f);
        std::vector<float> c(hidden_size, 0.0f);
        std::mt19937 rng(std::random_device{}());

        for (int i : seed_tokens) {
            auto logits = forwardStep(i, h, c);
        }

        for (int i = 0; i < max_new; ++i) {
            int last_token = result.back();
            auto logits = forwardStep(last_token, h, c);
            auto probs = softmax(logits, temperature);

            std::uniform_real_distribution<float> dist(0.0f, 1.0f);
            float r = dist(rng);
            float cumsum = 0.0f;
            int next_token = vocab_size - 1;
            for (int j = 0; j < vocab_size; ++j) {
                cumsum += probs[j];
                if (r <= cumsum) {
                    next_token = j;
                    break;
                }
            }
            result.push_back(next_token);
        }

        return result;
    }
};

EMSCRIPTEN_BINDINGS(lstm_inference) {
    emscripten::class_<LSTMInference>("LSTMInference")
        .constructor<int, int, int>()
        .function("loadWeights", &LSTMInference::loadWeights)
        .function("generateGreedy", &LSTMInference::generateGreedy)
        .function("generateSample", &LSTMInference::generateSample);
    emscripten::register_vector<int>("VectorInt");
    emscripten::register_vector<float>("VectorFloat");
}
