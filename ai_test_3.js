export default {
  async fetch(request, env) {
    try {
      const response = await env.AI.run('@cf/meta/llama-4-8b-instruct', {
        messages: [{ role: "user", content: "What is the capital of France?" }]
      });
      return new Response(JSON.stringify(response));
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  }
};
