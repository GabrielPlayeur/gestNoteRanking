import fastifyView from "@fastify/view"
import fastify from "fastify"
import ejs from "ejs"

const app = fastify({
  logger: {
    level: 'info',
    file: './src/log/info.log'
  }

})

app.register(fastifyView,{
    engine: {
        ejs
    }
})

app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (req, body, done) {
      try {
        var newBody = {
          raw: body,
          parsed: JSON.parse(body),
        };
        done(null, newBody);
      } catch (error) {
        error.statusCode = 400;
        done(error, undefined);
      }
    }
  );

app.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
})

app.listen({ port: 5500, host:"localhost" }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    // Server is now listening on ${address}
  })