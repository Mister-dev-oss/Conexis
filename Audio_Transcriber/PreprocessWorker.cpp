#include "PreprocessWorker.h"
#include "samplerate.h"
#include <iostream>
#include <vector>
#include <cmath>

void preprocessWorker(PreprocessCtx& Ctx) {
    while (true) {
        auto chunk = Ctx.rawQueue.pop();
        if (chunk.empty()) {
            std::cout << "[Preprocess] Stop signal ricevuto\n";
            break;
        }

        // 1. Se chunk è stereo -> mix a mono
        std::vector<float> mono;
        if (Ctx.targetChannels == 1 && Ctx.rawChannels == 2) {
            mono.reserve(chunk.size() / 2);
            for (size_t i = 0; i < chunk.size(); i += 2) {
                mono.push_back(0.5f * (chunk[i] + chunk[i + 1]));
            }
        }
        else {
            mono = std::move(chunk);
        }

        // 2. Resampling con libsamplerate
        double srcRatio = static_cast<double>(Ctx.targetSampleRate) / Ctx.inputSampleRate;
        std::vector<float> resampled(static_cast<size_t>(mono.size() * srcRatio) + 1);

        SRC_DATA srcData;
        srcData.data_in = mono.data();
        srcData.input_frames = mono.size() / Ctx.targetChannels;
        srcData.data_out = resampled.data();
        srcData.output_frames = resampled.size() / Ctx.targetChannels;
        srcData.end_of_input = 0;
        srcData.src_ratio = srcRatio;

        int error = src_simple(&srcData, SRC_SINC_BEST_QUALITY, Ctx.targetChannels);
        if (error) {
            std::cerr << "[Preprocess] Errore resampling: " << src_strerror(error) << "\n";
            continue;
        }

        resampled.resize(srcData.output_frames_gen * Ctx.targetChannels);

        // 3. Normalizzazione leggera [-1,1]
        float maxVal = 0.0f;
        for (float s : resampled) maxVal = std::max(maxVal, std::abs(s));
        if (maxVal > 1e-6f) {
            for (float& s : resampled) s /= maxVal;
        }

        // 3.5 Filtro chunk silenziosi
        float rms = 0.0f;
        for (float s : resampled) rms += s * s;
        rms = std::sqrt(rms / resampled.size());

        if (rms < 0.08f) { // soglia minima, da tarare
            continue;
        }

        // 4. Push nella coda per Whisper
        Ctx.audioQueue.push(std::move(resampled));

    }
}
