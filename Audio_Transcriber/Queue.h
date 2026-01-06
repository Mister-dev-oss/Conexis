#pragma once

#include <mutex>
#include <condition_variable>
#include <queue>
#include <vector>


class AudioQueue {
private:
	std::queue<std::vector<float>> q;
	std::mutex mtx;
	std::condition_variable cv;
	bool finished = false;
public:

	void stop() {
		std::lock_guard<std::mutex> lock(mtx);
		finished = true;
		cv.notify_all();
	}

	void push(std::vector<float>&& chunk) {
		{
			std::lock_guard<std::mutex> lock(mtx);
			q.push(std::move(chunk));
		}
		cv.notify_one();
	}

	std::vector<float> pop() {
		std::unique_lock<std::mutex> lock(mtx);
		cv.wait(lock, [this] { return !q.empty() || finished; });
		if (finished && q.empty()) {
			return {};
		}
		auto chunk = std::move(q.front());
		q.pop();
		return chunk;
	}
};
