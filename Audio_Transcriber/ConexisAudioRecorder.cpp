#include <iostream>
#include <atomic>
#include <vector>
#include <thread>
#include <string>
#include <windows.h>
#include <Audioclient.h>
#include <Mmdeviceapi.h>
#include "Queue.h"
#include "QueueWorker.h"
#include "whisper.h"
#include "RawQueue.h"
#include "PreprocessWorker.h"
#include "vulkan.h"



std::atomic<bool> running(true);

void stdinListener() {
    std::string line;
    while (running) {
        if (std::getline(std::cin, line)) {
            if (line == "STOP") {
                running = false;
                break;
            }
        }
    }
}

bool has_vulkan_gpu() {
    VkInstance instance;
    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;

    if (vkCreateInstance(&createInfo, nullptr, &instance) != VK_SUCCESS)
        return false;

    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
    vkDestroyInstance(instance, nullptr);

    return deviceCount > 0;
}

int main(int argc, char* argv[]) {

    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <language>" << std::endl;
        return 1;
    }

    std::string language = argv[1];

    setvbuf(stdout, nullptr, _IONBF, 0);
	std::thread inputThread(stdinListener);

    HRESULT hr = CoInitialize(nullptr);
    if (FAILED(hr)) { std::cerr << "CoInitialize failed\n"; return -1; }

    IMMDeviceEnumerator* enumerator = nullptr;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator), (void**)&enumerator);
    if (FAILED(hr)) { std::cerr << "CoCreateInstance failed\n"; return -1; }

    IMMDevice* device = nullptr;
    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device);
    if (FAILED(hr)) { std::cerr << "GetDefaultAudioEndpoint failed\n"; return -1; }

    IAudioClient* audioClient = nullptr;
    hr = device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&audioClient);
    if (FAILED(hr)) { std::cerr << "Device Activate failed\n"; return -1; }

    WAVEFORMATEX* waveFormat = nullptr;
    hr = audioClient->GetMixFormat(&waveFormat);
    if (FAILED(hr)) { std::cerr << "GetMixFormat failed\n"; return -1; }

    HANDLE hEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    if (!hEvent) { std::cerr << "CreateEvent failed\n"; return -1; }

    hr = audioClient->Initialize(AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
        0, 0, waveFormat, nullptr);
    if (FAILED(hr)) { std::cerr << "AudioClient Initialize failed\n"; return -1; }

    hr = audioClient->SetEventHandle(hEvent);
    if (FAILED(hr)) { std::cerr << "SetEventHandle failed\n"; return -1; }

    IAudioCaptureClient* captureClient = nullptr;
    hr = audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
    if (FAILED(hr)) { std::cerr << "GetService CaptureClient failed\n"; return -1; }

    hr = audioClient->Start();
    if (FAILED(hr)) { std::cerr << "AudioClient Start failed\n"; return -1; }

    AudioQueue audioQueue;
	RawQueue rawQueue;

    // Configura Whisper
    struct whisper_context* ctx = nullptr;
    if (!has_vulkan_gpu()) {

        ctx = whisper_init_from_file_with_params(
            "./models/ggml-small-q5_1.bin",
            whisper_context_default_params()
        );
    }
    else {
        ctx = whisper_init_from_file_with_params(
            "./models/ggml-medium-q5_0.bin",
            whisper_context_default_params()
        );
        if (!ctx) {
            std::cerr << "Inizializzazione Vulkan/Modello fallita, uso modello SMALL su CPU\n";
            ctx = whisper_init_from_file_with_params(
                "./models/ggml-small-q5_1.bin",
                whisper_context_default_params()
            );
        }
	}
    if (!ctx) { std::cerr << "Errore caricamento modello\n"; return -1; }

    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_BEAM_SEARCH);
    params.print_progress = false;
    params.language = language.c_str();
	params.beam_search.beam_size = 5;

    WorkerCtx workerCtx{ audioQueue, params, ctx };
    PreprocessCtx preprocessCtx{ rawQueue, audioQueue, 16000, 1,
		waveFormat->nChannels, waveFormat->nSamplesPerSec };

	std::thread preprocessThread(preprocessWorker, std::ref(preprocessCtx));
    std::thread workerThread(queueWorker, std::ref(workerCtx));

    const size_t CHUNK_SECONDS = 5;
    size_t framesPerChunk = waveFormat->nSamplesPerSec * CHUNK_SECONDS;
    size_t samplesPerChunk = framesPerChunk * waveFormat->nChannels;

    std::vector<float> tempBuffer;

    while (running) {
        DWORD waitResult = WaitForSingleObject(hEvent, INFINITE);
        if (waitResult != WAIT_OBJECT_0) break;

        UINT32 packetLength = 0;
        captureClient->GetNextPacketSize(&packetLength);

        while (packetLength != 0) {
            BYTE* data = nullptr;
            UINT32 numFrames = 0;
            DWORD flags = 0;

            hr = captureClient->GetBuffer(&data, &numFrames, &flags, nullptr, nullptr);
            if (FAILED(hr)) {
                std::cerr << "[Loop] GetBuffer FAILED: 0x" << std::hex << hr << "\n";
                break;
            }

            float* floatData = reinterpret_cast<float*>(data);
            tempBuffer.insert(tempBuffer.end(), floatData, floatData + numFrames * waveFormat->nChannels);

            captureClient->ReleaseBuffer(numFrames);
            captureClient->GetNextPacketSize(&packetLength);

            if (tempBuffer.size() >= samplesPerChunk) {
                std::vector<float> chunk(tempBuffer.begin(),
                    tempBuffer.begin() + samplesPerChunk);
                rawQueue.push(std::move(chunk));

                tempBuffer.erase(tempBuffer.begin(),
                    tempBuffer.begin() + samplesPerChunk);
                if (tempBuffer.size() >= 1000) {
                    std::cerr << "[Loop] Errore: troppa latenza, tempBuffer troppo grande ("
                        << tempBuffer.size() << " samples)\n";
                    running = false;  
                    break;
                }
            }
        }
    }


    audioClient->Stop();
    captureClient->Release();
    audioClient->Release();
    device->Release();
    enumerator->Release();
    CloseHandle(hEvent);
    CoUninitialize();

    rawQueue.stop();
    preprocessThread.join();

    audioQueue.stop();
    workerThread.join();

	inputThread.join();

    whisper_free(ctx);

    std::cout << "[RECORDER_EXIT]\n" << std::flush;

    return 0;
}


