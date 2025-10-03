// Remove REPL_ID environment variable to prevent top-level await issues with tsx
// This workaround is necessary because tsx cannot handle the top-level await 
// in vite.config.ts when loading the @replit/vite-plugin-cartographer
delete process.env.REPL_ID;