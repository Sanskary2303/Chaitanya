// This is a workaround for the frontend command execution issue
// The problem: LLM model refuses direct "execute command" requests but accepts implicit ones

// Frontend should rephrase command execution requests like this:
const commandRephraser = {
    // Original problematic patterns
    patterns: [
        /^execute command (.+)$/i,
        /^run command (.+)$/i,
        /^run (.+)$/i,
        /^execute (.+)$/i,
        /^cmd (.+)$/i,
        /^command (.+)$/i
    ],
    
    // Better phrasing that the model accepts
    rephrase: function(userInput) {
        for (let pattern of this.patterns) {
            const match = userInput.match(pattern);
            if (match) {
                const command = match[1];
                
                // Convert explicit command requests to implicit ones
                if (command.startsWith('ls')) {
                    return `Please list the files and directories using: ${command}`;
                } else if (command.startsWith('pwd')) {
                    return `Show me the current working directory path`;
                } else if (command.startsWith('whoami')) {
                    return `Show me the current user`;
                } else if (command.startsWith('date')) {
                    return `Show me the current date and time`;
                } else {
                    return `Please run this system command for me: ${command}`;
                }
            }
        }
        return userInput; // Return original if no pattern matches
    }
};

// Test the rephraser
console.log('🧪 Testing command rephraser...\n');

const testCases = [
    'execute command ls -la data',
    'run command pwd',
    'execute ls -la',
    'run pwd',
    'cmd whoami',
    'command date',
    'normal question about files'
];

testCases.forEach(testCase => {
    const rephrased = commandRephraser.rephrase(testCase);
    console.log(`Original: "${testCase}"`);
    console.log(`Rephrased: "${rephrased}"`);
    console.log('---');
});

module.exports = commandRephraser;
