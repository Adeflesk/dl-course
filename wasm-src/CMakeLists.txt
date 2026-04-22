cmake_minimum_required(VERSION 3.10)
project(tensorflowccp_wasm)

# Emscripten settings
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

# Include tensorflowccp headers from main repo
set(TENSORFLOWCCP_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../tensorflowccp")
include_directories(${TENSORFLOWCCP_PATH})

# Output to public/wasm
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm")

# WASM bindings library
add_executable(framework.js
    lstm_inference.cpp
    transformer_inference.cpp
    ops_wasm.cpp
)

# Emscripten-specific linker flags
target_link_options(framework.js PRIVATE
    -sWASM=1
    -sALLOW_MEMORY_GROWTH=1
    -sEXPORT_ES6=1
    -sMODULARIZE=1
    -sEXPORT_NAME=TensorflowCCP
    -sINVOKE_RUN=0
    -lembind
)
