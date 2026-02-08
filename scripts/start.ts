import concurrently from 'concurrently';

console.log("===================================================");
console.log("  TunaBrain AI Core & Frontend - Auto Launcher");
console.log("===================================================");
console.log("");

const { result } = concurrently(
  [
    { 
      command: 'npm run ai:server', 
      name: 'AI-CORE', 
      prefixColor: 'magenta' 
    },
    { 
      command: 'vite', 
      name: 'FRONTEND', 
      prefixColor: 'cyan' 
    },
  ],
  {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    restartTries: 1,
  }
);

result.then(
  () => console.log('All processes finished successfully'),
  () => console.log('A process exited with an error')
);
