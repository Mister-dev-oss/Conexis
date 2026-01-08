# Conexis AI Assistant

**Conexis AI Assistant** is a powerful desktop application built with **Electron**, designed to provide an AI chat experience directly on your desktop. It combines chat functionality, document parsing, and real-time audio transcription, with local RAG (Retrieval-Augmented Generation) capabilities for enhanced context awareness.

> ⚠️ Note: This project is in **local testing phase**. Some references are still pointing to `localhost`, and there may be minor bugs. Only the renderer and backend parts are included—no final build or boilerplate.
> ⚠️ Note: Some parts of the codebase and comments are written in both Italian and English.  
> I apologize for the inconsistency.

## Features

- **Real-time AI Chat**: Interact with an AI assistant on your desktop. The chat uses a **paid API** and communicates via a **local Go HTTP server**.  
- **Document Parsing**: Supports Excel, Word, and text files, allowing context retrieval for uploaded documents.  
- **Live Audio Transcription**: Transcribes audio in real time and generates immediate AI responses.  
- **Session and Transcription Saving**: Save your chat sessions and transcriptions locally for future reference.  
- **Local RAG Database**: Mini RAG DB implemented in C++ with FAISS, enabling fast search and retrieval for each session or document.  
- **Local AI Integration**: Whisper-based transcription and embeddings handled locally via C++ and ONNX Runtime—no external API required.  
- **Customizable Settings**: Themes, keyboard shortcuts, and other preferences configurable within the app.

## Technologies Used

- **Electron** – Frontend and desktop application framework.  
- **Go HTTP Server** – Local server for AI chat requests.  
- **C++** – For local Whisper transcription, embedding, and RAG DB.  
- **ONNX Runtime** – Run embedding models locally.
- **Whisper** - For local live transriptions.
- **FAISS** – Fast vector search for retrieval tasks.  

## Project Status

- **Local testing only**: references to `localhost` remain.  
- **Partial project**: includes only renderer and backend code.  
- **Bugs present**: some features may not work as expected.  

## Intended Use

This project is designed to showcase the architecture and functionality of a desktop AI assistant. It is **not production-ready**, but demonstrates a combination of AI chat, local processing, and RAG capabilities.

[Watch Conexis Demo](https://www.youtube.com/watch?v=_64bPUnEpYY)



