import { createRequestHandler } from '@react-router/express';
import { Server } from 'http';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import dotenv from 'dotenv';

// Load the React-Router build
const serverBuildPath = './build/server/index.js';

const viteDevServer =
    process.env.NODE_ENV === 'production'
        ? undefined
        : await import('vite').then((vite) =>
            vite.createServer({
                server: { middlewareMode: true }
            })
        );

const reactRouterHandler = createRequestHandler({
    build: viteDevServer
        ? () => viteDevServer.ssrLoadModule('virtual:react-router/server-build')
        : await fs.promises.access(serverBuildPath)
            .then(() => import(serverBuildPath!))
            .catch(err => {
                console.error('Build file not found:', serverBuildPath);
                process.exit(1);
            }) as any
});

const handleResponse = function(
    res: express.Response | null,
    statusCode: number,
    logMessage: string,
    clientMessage?: string,
    error?: Error
) {
    if (error) {
        console.error(logMessage, error);
    } else {
        console.log(logMessage);
    }

    if (res) {
        if (statusCode >= 400 && error) {
            res.status(statusCode).send(clientMessage || error.message);
        } else {
            res.status(statusCode).send(clientMessage || logMessage);
        }
    }
}

const gracefulShutdown = function(server: Server, signal: string) {
    console.info(`\n${signal} signal received.`);
    handleResponse(null, 200, 'Closing http server.');
    server.close(() => {
        handleResponse(null, 200, 'Http server closed.');
        process.exit(0);
    });
}

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// Handle asset requests
if (viteDevServer) {
    app.use(viteDevServer.middlewares);
} else {
    // Vite fingerprints its assets so we can cache forever.
    app.use(
        '/assets',
        express.static('build/client/assets', { immutable: true, maxAge: '1y' })
    );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build/client', { maxAge: '1h' }));

app.use(morgan('tiny'));

// handle SSR requests
app.all('*', reactRouterHandler);

// Load environment variables
dotenv.config({ path: ['.env', '.env.local'] });

// Start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
    console.log(`Express server listening at http://localhost:${port}`)
);

// Handle shutdown signals
process.on('SIGTERM', () =>
    gracefulShutdown(server, 'SIGTERM')
);
process.on('SIGINT', () =>
    gracefulShutdown(server, 'SIGINT')
);
