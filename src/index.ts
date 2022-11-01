// npm install @apollo/server express graphql cors body-parser
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { schema } from './schema';

// const schema = schemaComposer.buildSchema();

interface MyContext {
    token?: String;
}

async function startApolloServer() {
    // Required logic for integrating with Express
    const app = express();
    app.use(
        cors<cors.CorsRequest>({
            origin: '*'
        }),
        bodyParser.json(),
    )
    // Our httpServer handles incoming requests to our Express app.
    // Below, we tell Apollo Server to "drain" this httpServer,
    // enabling our servers to shut down gracefully.
    const httpServer = http.createServer(app);

    // Same ApolloServer initialization as before, plus the drain plugin
    // for our httpServer.
    const server = new ApolloServer<MyContext>({
        schema,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                // Fires whenever a GraphQL request is received from a client.
                async requestDidStart(W ) {
                    // console.log('Request started!');

                    return {
                        // Fires whenever Apollo Server will parse a GraphQL
                        // request to create its associated document AST.
                        async parsingDidStart(requestContext) {
                            // console.log('Parsing started! Query:\n' + requestContext.request.query);
                        },

                        // Fires whenever Apollo Server will validate a
                        // request's document AST against your GraphQL schema.
                        async validationDidStart(requestContext) {
                            // console.log('Validation started!');
                        },
                    };
                },
            }
        ],
    });
    // Ensure we wait for our server to start
    await server.start();

    // Set up our Express middleware to handle CORS, body parsing,
    // and our expressMiddleware function.
    app.use(
        '/graphql',
        // expressMiddleware accepts the same arguments:
        // an Apollo Server instance and optional configuration options
        expressMiddleware(server, {
            context: async ({ req }) => ({ token: req.headers.token }),
        }),
    );

    // Modified server startup
    await new Promise<void>((resolve) =>
        httpServer.listen({ port: 4000 }, resolve),
    );
    console.log(`🚀 Server ready at http://localhost:4000/`);
}

startApolloServer();