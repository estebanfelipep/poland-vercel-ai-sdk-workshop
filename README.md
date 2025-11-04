# Poland AI/TypeScript Workshop

This repository contains the material for a live workshop on building AI applications with TypeScript. The workshop covers various aspects of AI development, from basic text generation to advanced patterns like memory systems, multi-agent workflows, and human-in-the-loop interactions.

## 🎯 Learning Objectives

By the end of this workshop, you'll be able to:

- Build AI applications with TypeScript
- Deeply understand the AI SDK v5
- Work with different AI providers and models
- Create memory systems for AI applications
- Build multi-agent systems
- Implement human-in-the-loop workflows
- Evaluate and test AI systems
- Monitor and debug AI applications

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download) (version 22 or higher)
  - Version 24 recommended, based on personal experience
- [pnpm](https://pnpm.io/) (optional, you can use `npm`, `yarn` or `bun` instead)
- A free (or paid) [Gemini API Key](https://aistudio.google.com/apikey), or an API key from your AI provider of choice
- A free [Tavily](https://tavily.com/) API key (optional, for a couple of exercises)
- A [Docker Desktop](https://www.docker.com/products/docker-desktop/) installation (optional, only for ONE exercise)
- A free [Langfuse](https://langfuse.com/) account (optional, only for ONE exercise)

### Installation

1. Clone this repository:

```bash
git clone https://github.com/ai-hero-dev/poland-ai-ts-workshop.git
cd poland-ai-ts-workshop
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

4. Sign up to the required services and edit the `.env` file with your API keys.

## 📚 Running the Exercises

Start by running `pnpm dev`:

```bash
pnpm dev
```

This will allow you to choose between the different exercises.

You can also run `pnpm exercise <exercise-number>` to run a specific exercise.

## 📁 Repository Structure

### Exercise Organization

Exercises are organized in the `exercises/` directory with the following structure:

```
exercises/
├── 01-basics/
│   ├── 01.1-choosing-a-model/
│   │   ├── problem/
│   │   │   ├── readme.md
│   │   │   └── main.ts
│   │   └── solution/
│   │       └── main.ts
│   └── 01.2-stream-text-to-terminal/
│       ├── problem/
│       └── solution/
├── 02-naive-agents/
├── 03-persistence/
└── ...
```

## 📂 Understanding Exercise Folders

Each exercise contains different types of folders that serve specific purposes:

### Problem Folder (`problem/`)

- Contains the exercise you need to complete
- Includes a `readme.md` file with detailed instructions
  - Each `readme.md` contains a long introductory section, and a "Steps to Complete" section for more detailed instructions
- Each code file has `TODO`s in it that you need to fill in
- This is where you'll spend most of your time running through the exercises

### Solution Folder (`solution/`)

- Contains the completed, working version of the exercise
- Useful for reference when you're stuck or want to compare your approach
- Can be run to see the expected output

### Explainer Folder (`explainer/`)

- Contains additional explanations and walkthroughs
- May include detailed breakdowns of concepts covered in the exercise
- Useful for deeper understanding of the topics

## 🛠️ Workshop Flow

1. **Start with the problem**: Navigate to the `problem/` folder and read the `readme.md`
2. **Work through the exercise**: Follow the instructions and implement the solution
3. **Test your solution**: Run the exercise to see if it works as expected
4. **Compare with solution**: If there's a solution, check the `solution/` folder when you're done

## 📞 Support

If you encounter issues or have questions:

1. Check the solution folder for the exercise you're working on
2. Ensure your environment variables are properly configured
3. Verify you're using the correct Node.js and pnpm versions

Happy coding! 🚀
