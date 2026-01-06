#pragma once
#include "RawQueue.h"
#include "Queue.h"
#include <vector>
#include <iostream>
#include <algorithm>

struct PreprocessCtx {
    RawQueue& rawQueue;
    AudioQueue& audioQueue;
    int targetSampleRate = 16000; // default per Whisper
    int targetChannels = 1;       // default mono
    int rawChannels;              // da aggiornare a runtime
    int inputSampleRate;          // da aggiornare a runtime
};

void preprocessWorker(PreprocessCtx& Ctx);
