import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';

// Local tool for switching operation modes
export default async function switchMode(ctx: GSContext, args: PlainObject) {
  try {
    const { mode, config = {} } = ctx.inputs?.data?.body?.body || {};
    
    if (!mode || typeof mode !== 'string') {
      return new GSStatus(false, 400, 'Mode is required');
    }

    const validModes = ['rag', 'chat', 'analysis', 'development', 'debug'];
    
    if (!validModes.includes(mode)) {
      return new GSStatus(false, 400, `Invalid mode. Valid modes: ${validModes.join(', ')}`);
    }

    // Store mode in context or session
    // This could be extended to actually change system behavior
    const modeConfig = {
      mode,
      timestamp: new Date().toISOString(),
      config,
      description: getModeDescription(mode)
    };
    
    return new GSStatus(true, 200, `Switched to ${mode} mode`, {
      previousMode: (ctx as any).state?.currentMode || 'default',
      currentMode: mode,
      config: modeConfig
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to switch mode: ${error.message}`);
  }
}

function getModeDescription(mode: string): string {
  const descriptions = {
    rag: 'Retrieval-Augmented Generation mode for knowledge-based queries',
    chat: 'Interactive chat mode for conversational AI',
    analysis: 'Code and data analysis mode',
    development: 'Development assistance mode',
    debug: 'Debug and troubleshooting mode'
  };
  return descriptions[mode as keyof typeof descriptions] || 'Unknown mode';
}
