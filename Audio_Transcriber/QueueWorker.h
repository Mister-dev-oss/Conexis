#pragma once

#include <Queue.h>
#include <whisper.h>

struct WorkerCtx {
    AudioQueue& queue;
    whisper_full_params params;
    struct whisper_context* ctx;
};

void queueWorker(WorkerCtx& Ctx);