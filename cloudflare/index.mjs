import accountWorker from "./account.mjs";
import productBot from "./product-bot.mjs";

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/account")
      return accountWorker.fetch(request, env);
    if (path === "/api/bot") return productBot.fetch(request, env);
    if (path.startsWith("/api/"))
      return Response.json({ error: "not-found" }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
