// This file is kept for backward compatibility
// It now imports and re-exports the refactored code from llm directory
import { 
  generateCoachingMessage,
  generateRoadblockTips,
  discussTaskWithAI
} from './llm/ai-coach';

export { 
  generateCoachingMessage,
  generateRoadblockTips,
  discussTaskWithAI
};