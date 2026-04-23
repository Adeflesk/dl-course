#include <emscripten/bind.h>
#include <vector>
#include <cmath>
#include <random>
#include <algorithm>
#include <numeric>

// Pure C++ Transformer inference (no autodiff)
class TransformerInference {
private:
    int vocab_size, embed_dim, num_heads, num_layers, max_seq_len;
    int head_dim;  // embed_dim / num_heads

    // Sinusoidal positional encoding [max_seq_len, embed_dim]
    std::vector<float> pos_enc;

    // Per-layer weights
    struct LayerWeights {
        std::vector<float> W_q, W_k, W_v, W_o;  // attention projections
        std::vector<float> W_ff1, W_ff2;         // FFN weights
        std::vector<float> gamma1, beta1;        // pre-norm 1
        std::vector<float> gamma2, beta2;        // pre-norm 2
        std::vector<float> b_ff1, b_ff2, b_o;   // biases
    };
    std::vector<LayerWeights> layers;

    // Embedding and output
    std::vector<float> W_emb;                    // [vocab_size, embed_dim]
    std::vector<float> final_gamma, final_beta;  // final layer norm
    std::vector<float> W_out, b_out;             // output projection

    // Last forward pass attention weights for visualization
    // Shape: [num_layers][num_heads][seq_len][seq_len]
    std::vector<std::vector<std::vector<std::vector<float>>>> last_attn_weights;

    // Helpers
    static float sigmoid(float x) {
        return 1.0f / (1.0f + std::exp(-x));
    }

    static float relu(float x) {
        return x > 0.0f ? x : 0.0f;
    }

    static std::vector<float> softmax(const std::vector<float>& logits, float temperature = 1.0f) {
        std::vector<float> result = logits;
        float maxVal = *std::max_element(result.begin(), result.end());
        float sum = 0.0f;
        for (auto& v : result) {
            v = std::exp((v - maxVal) / temperature);
            sum += v;
        }
        for (auto& v : result) v /= sum;
        return result;
    }

    // Layer norm: (x - mean) / sqrt(var + eps) * gamma + beta
    std::vector<float> layernorm(const std::vector<float>& x, const std::vector<float>& gamma, const std::vector<float>& beta) {
        float mean = 0.0f, var = 0.0f;
        for (auto v : x) mean += v;
        mean /= x.size();
        for (auto v : x) var += (v - mean) * (v - mean);
        var /= x.size();

        std::vector<float> result(x.size());
        float eps = 1e-5f;
        for (size_t i = 0; i < x.size(); ++i) {
            result[i] = (x[i] - mean) / std::sqrt(var + eps) * gamma[i] + beta[i];
        }
        return result;
    }

    // Matrix multiply: [n, k] @ [k, m] -> [n, m]
    std::vector<float> matmul(const std::vector<float>& A, int n, int k,
                              const std::vector<float>& B, int m) {
        std::vector<float> C(n * m, 0.0f);
        for (int i = 0; i < n; ++i) {
            for (int j = 0; j < m; ++j) {
                for (int p = 0; p < k; ++p) {
                    C[i * m + j] += A[i * k + p] * B[p * m + j];
                }
            }
        }
        return C;
    }

    // Add bias: result[i][j] += bias[j]
    void add_bias(std::vector<float>& x, const std::vector<float>& bias, int cols) {
        for (size_t i = 0; i < x.size(); i += cols) {
            for (int j = 0; j < cols; ++j) {
                x[i + j] += bias[j];
            }
        }
    }

public:
    TransformerInference(int vocab_size, int embed_dim, int num_heads, int num_layers, int max_seq_len)
        : vocab_size(vocab_size), embed_dim(embed_dim), num_heads(num_heads),
          num_layers(num_layers), max_seq_len(max_seq_len) {

        head_dim = embed_dim / num_heads;

        // Initialize embedding and output
        W_emb.resize(vocab_size * embed_dim);
        W_out.resize(embed_dim * vocab_size);
        b_out.resize(vocab_size);
        final_gamma.resize(embed_dim);
        final_beta.resize(embed_dim);

        // Initialize positional encoding (sinusoidal)
        pos_enc.resize(max_seq_len * embed_dim);
        for (int pos = 0; pos < max_seq_len; ++pos) {
            for (int j = 0; j < embed_dim; ++j) {
                float angle = pos / std::pow(10000.0f, 2.0f * j / embed_dim);
                if (j % 2 == 0) {
                    pos_enc[pos * embed_dim + j] = std::sin(angle);
                } else {
                    pos_enc[pos * embed_dim + j] = std::cos(angle);
                }
            }
        }

        // Initialize layers
        layers.resize(num_layers);
        for (auto& layer : layers) {
            layer.W_q.resize(embed_dim * embed_dim);
            layer.W_k.resize(embed_dim * embed_dim);
            layer.W_v.resize(embed_dim * embed_dim);
            layer.W_o.resize(embed_dim * embed_dim);
            layer.W_ff1.resize(embed_dim * 4 * embed_dim);
            layer.W_ff2.resize(4 * embed_dim * embed_dim);
            layer.gamma1.resize(embed_dim);
            layer.beta1.resize(embed_dim);
            layer.gamma2.resize(embed_dim);
            layer.beta2.resize(embed_dim);
            layer.b_ff1.resize(4 * embed_dim);
            layer.b_ff2.resize(embed_dim);
            layer.b_o.resize(embed_dim);
        }

        last_attn_weights.resize(num_layers, std::vector<std::vector<std::vector<float>>>(num_heads));
    }

    void loadWeights(const std::vector<float>& flat_weights) {
        size_t offset = 0;

        // Embedding
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_emb.size(), W_emb.begin());
        offset += W_emb.size();

        // Per-layer weights
        for (int layer_idx = 0; layer_idx < num_layers; ++layer_idx) {
            auto& layer = layers[layer_idx];

            // Attention
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_q.size(), layer.W_q.begin());
            offset += layer.W_q.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_k.size(), layer.W_k.begin());
            offset += layer.W_k.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_v.size(), layer.W_v.begin());
            offset += layer.W_v.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_o.size(), layer.W_o.begin());
            offset += layer.W_o.size();

            // Layer norm 1
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.gamma1.size(), layer.gamma1.begin());
            offset += layer.gamma1.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.beta1.size(), layer.beta1.begin());
            offset += layer.beta1.size();

            // FFN
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_ff1.size(), layer.W_ff1.begin());
            offset += layer.W_ff1.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.b_ff1.size(), layer.b_ff1.begin());
            offset += layer.b_ff1.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.W_ff2.size(), layer.W_ff2.begin());
            offset += layer.W_ff2.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.b_ff2.size(), layer.b_ff2.begin());
            offset += layer.b_ff2.size();

            // Layer norm 2
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.gamma2.size(), layer.gamma2.begin());
            offset += layer.gamma2.size();
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.beta2.size(), layer.beta2.begin());
            offset += layer.beta2.size();

            // Output bias
            std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + layer.b_o.size(), layer.b_o.begin());
            offset += layer.b_o.size();
        }

        // Final layer norm
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + final_gamma.size(), final_gamma.begin());
        offset += final_gamma.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + final_beta.size(), final_beta.begin());
        offset += final_beta.size();

        // Output projection
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + W_out.size(), W_out.begin());
        offset += W_out.size();
        std::copy(flat_weights.begin() + offset, flat_weights.begin() + offset + b_out.size(), b_out.begin());
    }

    // Scaled dot-product attention with causal mask
    std::pair<std::vector<float>, std::vector<float>> attention(
        const std::vector<float>& Q,  // [seq_len, embed_dim]
        const std::vector<float>& K,  // [seq_len, embed_dim]
        const std::vector<float>& V,  // [seq_len, embed_dim]
        int seq_len, int layer_idx, int head_idx) {

        // Split into heads: each head gets [seq_len, head_dim]
        std::vector<float> Q_head(seq_len * head_dim), K_head(seq_len * head_dim), V_head(seq_len * head_dim);
        for (int i = 0; i < seq_len; ++i) {
            for (int j = 0; j < head_dim; ++j) {
                Q_head[i * head_dim + j] = Q[i * embed_dim + head_idx * head_dim + j];
                K_head[i * head_dim + j] = K[i * embed_dim + head_idx * head_dim + j];
                V_head[i * head_dim + j] = V[i * embed_dim + head_idx * head_dim + j];
            }
        }

        // Scaled dot-product: Q @ K^T / sqrt(head_dim)
        auto QKT = matmul(Q_head, seq_len, head_dim, K_head, seq_len);
        for (auto& v : QKT) v /= std::sqrt(head_dim);

        // Apply causal mask and softmax per row
        std::vector<float> attn_weights(seq_len * seq_len);
        for (int i = 0; i < seq_len; ++i) {
            std::vector<float> row(seq_len);
            for (int j = 0; j < seq_len; ++j) {
                row[j] = (j > i) ? -1e9f : QKT[i * seq_len + j];
            }
            auto weights = softmax(row);
            std::copy(weights.begin(), weights.end(), attn_weights.begin() + i * seq_len);
        }

        // Store attention weights for visualization
        if (layer_idx >= 0 && layer_idx < num_layers && head_idx >= 0 && head_idx < num_heads) {
            last_attn_weights[layer_idx][head_idx].resize(seq_len);
            for (int i = 0; i < seq_len; ++i) {
                last_attn_weights[layer_idx][head_idx][i].resize(seq_len);
                std::copy(attn_weights.begin() + i * seq_len, attn_weights.begin() + (i + 1) * seq_len,
                         last_attn_weights[layer_idx][head_idx][i].begin());
            }
        }

        // Output: attn_weights @ V
        auto output = matmul(attn_weights, seq_len, seq_len, V_head, head_dim);
        return {output, attn_weights};
    }

    // Multi-head attention forward
    std::vector<float> multi_head_attention(
        const std::vector<float>& x,  // [seq_len, embed_dim]
        int seq_len, const LayerWeights& layer, int layer_idx) {

        // Project Q, K, V
        auto Q = matmul(x, seq_len, embed_dim, layer.W_q, embed_dim);
        auto K = matmul(x, seq_len, embed_dim, layer.W_k, embed_dim);
        auto V = matmul(x, seq_len, embed_dim, layer.W_v, embed_dim);

        // Apply attention heads
        std::vector<float> concat_heads(seq_len * embed_dim, 0.0f);
        for (int h = 0; h < num_heads; ++h) {
            auto [attn_out, _] = attention(Q, K, V, seq_len, layer_idx, h);
            for (int i = 0; i < seq_len; ++i) {
                for (int j = 0; j < head_dim; ++j) {
                    concat_heads[i * embed_dim + h * head_dim + j] = attn_out[i * head_dim + j];
                }
            }
        }

        // Output projection
        auto output = matmul(concat_heads, seq_len, embed_dim, layer.W_o, embed_dim);
        add_bias(output, layer.b_o, embed_dim);
        return output;
    }

    // Forward pass
    std::vector<float> forward(const std::vector<int>& tokens) {
        int seq_len = tokens.size();
        if (seq_len > max_seq_len) seq_len = max_seq_len;

        // Embedding
        std::vector<float> x(seq_len * embed_dim);
        for (int i = 0; i < seq_len; ++i) {
            int token = tokens[i];
            if (token >= 0 && token < vocab_size) {
                std::copy(W_emb.begin() + token * embed_dim, W_emb.begin() + (token + 1) * embed_dim,
                         x.begin() + i * embed_dim);
            }
            // Add positional encoding
            for (int j = 0; j < embed_dim; ++j) {
                x[i * embed_dim + j] += pos_enc[i * embed_dim + j];
            }
        }

        // Transformer blocks
        for (int layer_idx = 0; layer_idx < num_layers; ++layer_idx) {
            auto& layer = layers[layer_idx];

            // Pre-norm attention
            auto x_norm = layernorm(x, layer.gamma1, layer.beta1);
            auto attn_out = multi_head_attention(x_norm, seq_len, layer, layer_idx);
            // Residual
            for (size_t i = 0; i < x.size(); ++i) x[i] += attn_out[i];

            // Pre-norm FFN
            x_norm = layernorm(x, layer.gamma2, layer.beta2);
            auto ffn_hidden = matmul(x_norm, seq_len, embed_dim, layer.W_ff1, 4 * embed_dim);
            add_bias(ffn_hidden, layer.b_ff1, 4 * embed_dim);
            for (auto& v : ffn_hidden) v = relu(v);
            auto ffn_out = matmul(ffn_hidden, seq_len, 4 * embed_dim, layer.W_ff2, embed_dim);
            add_bias(ffn_out, layer.b_ff2, embed_dim);
            // Residual
            for (size_t i = 0; i < x.size(); ++i) x[i] += ffn_out[i];
        }

        // Final layer norm
        x = layernorm(x, final_gamma, final_beta);

        // Output projection
        auto logits = matmul(x, seq_len, embed_dim, W_out, vocab_size);
        add_bias(logits, b_out, vocab_size);

        return logits;  // [seq_len * vocab_size]
    }

    // Get attention weights from last forward pass
    std::vector<float> getAttentionWeights() {
        std::vector<float> result;
        for (int l = 0; l < num_layers; ++l) {
            for (int h = 0; h < num_heads; ++h) {
                if (!last_attn_weights[l][h].empty()) {
                    for (auto& row : last_attn_weights[l][h]) {
                        result.insert(result.end(), row.begin(), row.end());
                    }
                }
            }
        }
        return result;
    }

    // Generate text greedily
    std::vector<int> generateGreedy(const std::vector<int>& seed_tokens, int max_new) {
        std::vector<int> result = seed_tokens;
        for (int i = 0; i < max_new; ++i) {
            auto logits = forward(result);
            int seq_len = result.size();
            int vocab_size_local = logits.size() / seq_len;
            auto last_logits_start = logits.begin() + (seq_len - 1) * vocab_size_local;
            int next_token = std::max_element(last_logits_start, last_logits_start + vocab_size_local) - last_logits_start;
            result.push_back(next_token);
        }
        return result;
    }

    // Generate with temperature sampling
    std::vector<int> generateSample(const std::vector<int>& seed_tokens, int max_new, float temperature) {
        std::vector<int> result = seed_tokens;
        std::mt19937 rng(std::random_device{}());
        for (int i = 0; i < max_new; ++i) {
            auto logits = forward(result);
            int seq_len = result.size();
            auto last_logits_start = logits.begin() + (seq_len - 1) * vocab_size;
            std::vector<float> last_logits(last_logits_start, last_logits_start + vocab_size);
            auto probs = softmax(last_logits, temperature);
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

EMSCRIPTEN_BINDINGS(transformer_inference) {
    emscripten::class_<TransformerInference>("TransformerInference")
        .constructor<int, int, int, int, int>()
        .function("loadWeights", &TransformerInference::loadWeights)
        .function("forward", &TransformerInference::forward)
        .function("getAttentionWeights", &TransformerInference::getAttentionWeights)
        .function("generateGreedy", &TransformerInference::generateGreedy)
        .function("generateSample", &TransformerInference::generateSample);


}
