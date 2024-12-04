# Agent System Implementation Roadmap

## Overview
Building an agentic system where users can create projects with high-level goals. An overseer agent breaks down these goals into subtasks for specialized sub-agents. Each agent has specific tools and capabilities to complete their assigned tasks.

## Model
Using GPT-4o-mini for its capabilities in:
- Image and text inputs
- JSON output
- Function calling tools

## Implementation Steps

### 1. Database Setup
- Set up Prisma with PostgreSQL
- Create schemas for:
  - Projects (store user goals)
  - Agents (overseer and sub-agents with their system prompts)
  - Tasks (subtasks created by overseer)
  - TaskResults (outputs from each agent)
  - Tools (available functions for agents)

### 2. Core Agent Infrastructure
- Create base Agent class with:
  - System prompt management
  - Function calling capabilities
  - Input/output handling
- Implement the Overseer agent with:
  - Goal analysis
  - Task breakdown logic
  - Task delegation
  - Result verification

### 3. Initial Tools Implementation
- Create tool registry system
- Implement specific tools:
  - Image analysis tool (using GPT-4-mini)
  - Web search tool (for comic identification)
  - eBay sales history tool
- Tool result formatting

### 4. API Endpoints
- Project creation
- Project status checking
- Task monitoring
- Result retrieval

### 5. Agent Communication System
- Message passing between agents
- Result validation protocol
- Error handling and recovery

### 6. Task Flow Management
- Task queue system
- State management
- Progress tracking
- Error recovery

### 7. Testing & Monitoring
- Unit tests for each agent
- Integration tests for workflows
- Logging system
- Performance monitoring

## Example Goal
"Given an input image, browse the web to determine which comic book this image is, then check ebay sales history for that comic book and return the 10 most recent sales, as well as an average price"

This goal demonstrates the system's capability to:
1. Process image inputs
2. Perform web searches
3. Gather specific data (eBay sales)
4. Analyze and summarize results
