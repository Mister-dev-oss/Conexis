#include <iostream>
#include <vector>
#include <string>
#include <faiss/IndexFlat.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

faiss::IndexFlatL2* index = nullptr;
std::vector<std::string> texts;
std::vector<size_t> ids;
const int EXPECTED_DIM = 384;


void cleanUpStop() {
    if (index) {
        delete index;
        index = nullptr;
    }
    texts.clear();
    ids.clear();
    std::cout << "[DEBUG] stop: FAISS e RAM puliti" << std::endl;
}

void cleanUp() {
    if (index) {
        index->reset();
    }
    texts.clear();
    ids.clear();
    std::cout << "[DEBUG] FAISS svuotato e RAM pulita" << std::endl;
}

bool processJSON() {
    uint32_t len;
    std::cin.read(reinterpret_cast<char*>(&len), sizeof(len));
    if (!std::cin) {
        std::cerr << "[ERROR] impossibile leggere lunghezza JSON" << std::endl;
        cleanUpStop();
        return false;
    }

    std::vector<char> buffer(len);
    std::cin.read(buffer.data(), len);
    if (!std::cin) {
        std::cerr << "[ERROR] impossibile leggere JSON data" << std::endl;
        cleanUpStop();
        return false;
    }

    std::string jsonStr(buffer.begin(), buffer.end());
    json j;
    try {
        j = json::parse(jsonStr);
    }
    catch (json::parse_error& e) {
        std::cerr << "[ERROR] parse JSON: " << e.what() << std::endl;
        cleanUpStop();
        return false;
    }

    std::string command = j.value("command", "");
    if (command == "push") {
        std::string text = j.value("text", "");
        std::vector<float> embedding = j.value("embedding", std::vector<float>{});
        if (embedding.size() != EXPECTED_DIM) {
            std::cerr << "[ERROR] embed_len atteso " << EXPECTED_DIM
                << ", ricevuto " << embedding.size() << std::endl;
            cleanUpStop();
            return false;
        }

        index->add(1, embedding.data());
        texts.push_back(text);
        ids.push_back(texts.size() - 1);
        std::cout << "[DEBUG] push: testo aggiunto, id = " << ids.back()
            << ", embedding[0] = " << embedding[0] << std::endl;
    }
    else if (command == "query") {
        std::vector<float> q = j.value("embedding", std::vector<float>{});
        if (q.size() != EXPECTED_DIM) {
            std::cerr << "[ERROR] embed_len query atteso " << EXPECTED_DIM
                << ", ricevuto " << q.size() << std::endl;
            cleanUpStop();
            return false;
        }

        std::vector<faiss::idx_t> I(2);
        std::vector<float> D(2);
        index->search(1, q.data(), 1, D.data(), I.data());

        bool found = false;
        for (int i = 0; i < 1; i++) {
            if (I[i] < 0 || I[i] >= (faiss::idx_t)ids.size()) continue;
            size_t id = ids[I[i]];
            std::cout << "[MATCH] " << texts[id] << std::endl;
            found = true;
        }
        if (!found) {
            std::cout << "[MATCH_NOT_FOUND]" << std::endl;
        }
    }
    else if (command == "clear") {
        std::cout << "[DEBUG] stop: ricevuto comando clear" << std::endl;
        cleanUp();
    }
    else if (command == "stop") {
        std::cout << "[DEBUG] stop: ricevuto comando stop" << std::endl;
        cleanUpStop();
        return false;
    }
    else {
        std::cerr << "[ERROR] comando sconosciuto: " << command << std::endl;
        cleanUpStop();
        return false;
    }

    return true;
}

int main() {
    index = new faiss::IndexFlatL2(EXPECTED_DIM);
    std::cout << "[DEBUG] FAISS inizializzato, dim = " << EXPECTED_DIM << std::endl;

    while (true) {
        if (!std::cin) break;
        if (!processJSON()) break;
    }

    return 0;
}

