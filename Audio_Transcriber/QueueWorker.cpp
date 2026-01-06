
#include "QueueWorker.h"
#include <iostream>
#include <fstream>
#include <string>
#include <cstdint>
#include <vector>
#include <windows.h>
#include <locale>

void queueWorker(WorkerCtx& Ctx) {
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
    std::locale::global(std::locale(""));
    while (true) {
        auto chunk = Ctx.queue.pop();
        if (chunk.empty()) {
            break;
        }

        std::cout << "[Worker] Processato chunk con "
            << chunk.size() << " frames\n";

        if (whisper_full(Ctx.ctx, Ctx.params, chunk.data(), chunk.size()) != 0) {
            std::cerr << "Errore durante la trascrizione\n";
            continue;
        }


        int n_segments = whisper_full_n_segments(Ctx.ctx);
 
        for (int i = 0; i < n_segments; i++) {
            const char* text = whisper_full_get_segment_text(Ctx.ctx, i);
            std::cout <<"[TRANSCRIPTION]" << text << "\n";
        }

    }
}

